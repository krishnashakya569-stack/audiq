-- Connect Audiq profiles to Supabase Auth and secure the social data model.
alter table public.profiles
  add constraint profiles_auth_user_fk
  foreign key (id) references auth.users (id) on delete cascade not valid;

create unique index if not exists profiles_handle_lower_unique_idx
  on public.profiles (lower(handle));

create unique index if not exists friendships_pair_unique_idx
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

alter table public.chat_messages
  add column if not exists message_type text not null default 'text'
    check (message_type in ('text', 'song'));

alter table public.chat_messages
  add column if not exists song jsonb;

alter table public.chat_messages
  add constraint chat_messages_body_nonempty
  check (length(btrim(body)) between 1 and 2000) not valid;

create or replace function public.create_audiq_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_handle text;
  assigned_handle text;
  assigned_name text;
  assigned_audiq_id text;
begin
  requested_handle := lower(
    regexp_replace(
      coalesce(new.raw_user_meta_data ->> 'handle', ''),
      '[^a-z0-9_]+',
      '',
      'g'
    )
  );
  requested_handle := left(requested_handle, 24);

  if length(requested_handle) < 3 then
    requested_handle := 'listener';
  end if;

  assigned_handle := requested_handle;
  if exists (
    select 1 from public.profiles p where lower(p.handle) = assigned_handle
  ) then
    assigned_handle := left(requested_handle, 17) || '_' ||
      lower(substr(replace(new.id::text, '-', ''), 1, 6));
  end if;

  assigned_name := left(
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), assigned_handle),
    50
  );
  assigned_audiq_id := 'AQ-' || upper(substr(replace(new.id::text, '-', ''), 1, 12));

  insert into public.profiles (id, audiq_id, display_name, handle, avatar_color)
  values (new.id, assigned_audiq_id, assigned_name, assigned_handle, '#b01340');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_audiq_profile on auth.users;
create trigger on_auth_user_created_audiq_profile
  after insert on auth.users
  for each row execute function public.create_audiq_profile_for_auth_user();

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Profiles are searchable" on public.profiles;
create policy "Authenticated users can search profiles"
  on public.profiles for select to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Friendships are visible to participants" on public.friendships;
create policy "Friendships are visible to participants"
  on public.friendships for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can send friend requests"
  on public.friendships for insert to authenticated
  with check (
    auth.uid() = requester_id
    and requester_id <> addressee_id
    and status = 'pending'
  );

create policy "Addressees can accept friend requests"
  on public.friendships for update to authenticated
  using (auth.uid() = addressee_id and status = 'pending')
  with check (auth.uid() = addressee_id and status in ('accepted', 'blocked'));

create policy "Participants can remove friend requests"
  on public.friendships for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Messages are visible to participants" on public.chat_messages;
create policy "Friends can read their chat messages"
  on public.chat_messages for select to authenticated
  using (
    (auth.uid() = sender_id or auth.uid() = receiver_id)
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = chat_messages.sender_id and f.addressee_id = chat_messages.receiver_id)
          or
          (f.requester_id = chat_messages.receiver_id and f.addressee_id = chat_messages.sender_id)
        )
    )
  );

create policy "Friends can send chat messages"
  on public.chat_messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and sender_id <> receiver_id
    and length(btrim(body)) between 1 and 2000
    and message_type in ('text', 'song')
    and (message_type <> 'song' or song is not null)
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = sender_id and f.addressee_id = receiver_id)
          or
          (f.requester_id = receiver_id and f.addressee_id = sender_id)
        )
    )
  );

-- Keep the existing chat timeline live in Supabase Realtime when that publication is enabled.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships'
    ) then
      execute 'alter publication supabase_realtime add table public.friendships';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
    ) then
      execute 'alter publication supabase_realtime add table public.chat_messages';
    end if;
  end if;
end;
$$;
