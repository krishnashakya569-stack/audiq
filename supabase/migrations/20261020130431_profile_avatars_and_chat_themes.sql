-- Keep profile photos private to signed-in Audiq users and store only a path in the profile.
alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists avatar_style text not null default 'prefer_not_to_say',
  add column if not exists chat_theme text not null default 'lime';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_avatar_style_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_avatar_style_valid
      check (avatar_style in ('masculine', 'feminine', 'neutral', 'prefer_not_to_say'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_avatar_path_matches_user'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_avatar_path_matches_user
      check (avatar_path is null or split_part(avatar_path, '/', 1) = id::text);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_chat_theme_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_chat_theme_valid
      check (chat_theme in ('lime', 'violet', 'coral', 'mint', 'pink'));
  end if;
end;
$$;

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
  requested_avatar_style text;
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
  requested_avatar_style := coalesce(
    new.raw_user_meta_data ->> 'avatar_style',
    'prefer_not_to_say'
  );

  if requested_avatar_style not in ('masculine', 'feminine', 'neutral', 'prefer_not_to_say') then
    requested_avatar_style := 'prefer_not_to_say';
  end if;

  insert into public.profiles (
    id, audiq_id, display_name, handle, avatar_color, avatar_style, chat_theme
  )
  values (
    new.id, assigned_audiq_id, assigned_name, assigned_handle, '#b01340',
    requested_avatar_style, 'lime'
  );

  return new;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Audiq avatars are visible to signed-in users" on storage.objects;
create policy "Audiq avatars are visible to signed-in users"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own Audiq avatar" on storage.objects;
create policy "Users can upload their own Audiq avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own Audiq avatar" on storage.objects;
create policy "Users can delete their own Audiq avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

