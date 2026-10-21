-- Invite accepted friends to playlists as editors or viewers. Existing playlists
-- remain private to their owner unless a member row is explicitly created.
create table if not exists public.audiq_playlist_members (
  playlist_id uuid not null,
  owner_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  invited_by uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('editor', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (playlist_id, user_id),
  foreign key (owner_id, playlist_id)
    references public.audiq_playlists (user_id, id) on delete cascade,
  check (owner_id <> user_id)
);

create index if not exists audiq_playlist_members_user_status_idx
  on public.audiq_playlist_members (user_id, status, created_at desc);

create index if not exists audiq_playlist_members_owner_playlist_idx
  on public.audiq_playlist_members (owner_id, playlist_id);

alter table public.audiq_playlist_members enable row level security;
grant select, insert, update, delete on public.audiq_playlist_members to authenticated;

drop policy if exists "Playlist owners and members can view membership" on public.audiq_playlist_members;
create policy "Playlist owners and members can view membership"
  on public.audiq_playlist_members for select to authenticated
  using ((select auth.uid()) = owner_id or (select auth.uid()) = user_id);

drop policy if exists "Owners can invite accepted friends" on public.audiq_playlist_members;
create policy "Owners can invite accepted friends"
  on public.audiq_playlist_members for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and invited_by = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = (select auth.uid()) and f.addressee_id = user_id)
          or (f.addressee_id = (select auth.uid()) and f.requester_id = user_id)
        )
    )
  );

drop policy if exists "Members can accept invites and owners can change roles" on public.audiq_playlist_members;
create policy "Members can accept invites and owners can change roles"
  on public.audiq_playlist_members for update to authenticated
  using ((select auth.uid()) = owner_id or (select auth.uid()) = user_id)
  with check ((select auth.uid()) = owner_id or (select auth.uid()) = user_id);

drop policy if exists "Owners and members can remove membership" on public.audiq_playlist_members;
create policy "Owners and members can remove membership"
  on public.audiq_playlist_members for delete to authenticated
  using ((select auth.uid()) = owner_id or (select auth.uid()) = user_id);

-- Column grants let invitees accept without gaining permission to promote
-- themselves. The trigger also locks identity and invite status transitions.
revoke update on public.audiq_playlist_members from authenticated;
grant update (role, status) on public.audiq_playlist_members to authenticated;

create or replace function public.guard_audiq_playlist_member_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  acting_user uuid := (select auth.uid());
begin
  if acting_user = old.user_id then
    if old.status <> 'pending'
      or new.status <> 'accepted'
      or new.role is distinct from old.role
      or new.playlist_id is distinct from old.playlist_id
      or new.owner_id is distinct from old.owner_id
      or new.user_id is distinct from old.user_id
      or new.invited_by is distinct from old.invited_by
      or new.created_at is distinct from old.created_at then
      raise exception 'A playlist invite can only be accepted by its recipient';
    end if;
  elsif acting_user = old.owner_id then
    if new.playlist_id is distinct from old.playlist_id
      or new.owner_id is distinct from old.owner_id
      or new.user_id is distinct from old.user_id
      or new.invited_by is distinct from old.invited_by
      or new.status is distinct from old.status
      or new.created_at is distinct from old.created_at then
      raise exception 'Playlist owners can only change a member role';
    end if;
  else
    raise exception 'Not allowed to update this playlist membership';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_audiq_playlist_member_update() from public, anon, authenticated;
drop trigger if exists guard_audiq_playlist_member_update on public.audiq_playlist_members;
create trigger guard_audiq_playlist_member_update
  before update on public.audiq_playlist_members
  for each row execute function public.guard_audiq_playlist_member_update();

-- Playlist metadata stays owner-controlled; accepted/pending invitees can read
-- the playlist card, while only accepted members can see and edit its tracks.
drop policy if exists "Users manage their own Audiq playlists" on public.audiq_playlists;
drop policy if exists "Owners and invitees can read Audiq playlists" on public.audiq_playlists;
create policy "Owners and invitees can read Audiq playlists"
  on public.audiq_playlists for select to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.audiq_playlist_members m
      where m.playlist_id = audiq_playlists.id
        and m.owner_id = audiq_playlists.user_id
        and m.user_id = (select auth.uid())
        and m.status in ('pending', 'accepted')
    )
  );

create policy "Users create their own Audiq playlists"
  on public.audiq_playlists for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owners update their Audiq playlists"
  on public.audiq_playlists for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owners delete their Audiq playlists"
  on public.audiq_playlists for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users manage tracks in their own Audiq playlists" on public.audiq_playlist_tracks;
drop policy if exists "Owners and invitees can read Audiq playlist tracks" on public.audiq_playlist_tracks;
drop policy if exists "Owners and editors can add Audiq playlist tracks" on public.audiq_playlist_tracks;
drop policy if exists "Owners and editors can update Audiq playlist tracks" on public.audiq_playlist_tracks;
drop policy if exists "Owners and editors can remove Audiq playlist tracks" on public.audiq_playlist_tracks;

create policy "Owners and invitees can read Audiq playlist tracks"
  on public.audiq_playlist_tracks for select to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.audiq_playlist_members m
      where m.playlist_id = audiq_playlist_tracks.playlist_id
        and m.owner_id = audiq_playlist_tracks.user_id
        and m.user_id = (select auth.uid())
        and m.status = 'accepted'
    )
  );

create policy "Owners and editors can add Audiq playlist tracks"
  on public.audiq_playlist_tracks for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.audiq_playlist_members m
      where m.playlist_id = audiq_playlist_tracks.playlist_id
        and m.owner_id = audiq_playlist_tracks.user_id
        and m.user_id = (select auth.uid())
        and m.role = 'editor'
        and m.status = 'accepted'
    )
  );

create policy "Owners and editors can update Audiq playlist tracks"
  on public.audiq_playlist_tracks for update to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.audiq_playlist_members m
      where m.playlist_id = audiq_playlist_tracks.playlist_id
        and m.owner_id = audiq_playlist_tracks.user_id
        and m.user_id = (select auth.uid())
        and m.role = 'editor'
        and m.status = 'accepted'
    )
  )
  with check (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.audiq_playlist_members m
      where m.playlist_id = audiq_playlist_tracks.playlist_id
        and m.owner_id = audiq_playlist_tracks.user_id
        and m.user_id = (select auth.uid())
        and m.role = 'editor'
        and m.status = 'accepted'
    )
  );

create policy "Owners and editors can remove Audiq playlist tracks"
  on public.audiq_playlist_tracks for delete to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.audiq_playlist_members m
      where m.playlist_id = audiq_playlist_tracks.playlist_id
        and m.owner_id = audiq_playlist_tracks.user_id
        and m.user_id = (select auth.uid())
        and m.role = 'editor'
        and m.status = 'accepted'
    )
  );

alter table public.audiq_playlist_members replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'audiq_playlist_members'
    ) then
    execute 'alter publication supabase_realtime add table public.audiq_playlist_members';
  end if;
end;
$$;
