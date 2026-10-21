-- Keep user-owned likes and playlists available across Audiq devices.
create table if not exists public.audiq_liked_songs (
  user_id uuid not null references auth.users (id) on delete cascade,
  track_id text not null,
  track jsonb not null check (jsonb_typeof(track) = 'object'),
  added_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create table if not exists public.audiq_playlists (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  cover text,
  created_at_ms bigint not null,
  unique (user_id, id)
);

create table if not exists public.audiq_playlist_tracks (
  user_id uuid not null,
  playlist_id uuid not null,
  track_id text not null,
  track jsonb not null check (jsonb_typeof(track) = 'object'),
  position integer not null default 0 check (position >= 0),
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_id),
  foreign key (user_id, playlist_id)
    references public.audiq_playlists (user_id, id) on delete cascade
);

create index if not exists audiq_playlist_tracks_owner_order_idx
  on public.audiq_playlist_tracks (user_id, playlist_id, position);

alter table public.audiq_liked_songs enable row level security;
alter table public.audiq_playlists enable row level security;
alter table public.audiq_playlist_tracks enable row level security;

grant select, insert, update, delete on public.audiq_liked_songs to authenticated;
grant select, insert, update, delete on public.audiq_playlists to authenticated;
grant select, insert, update, delete on public.audiq_playlist_tracks to authenticated;

drop policy if exists "Users manage their own Audiq likes" on public.audiq_liked_songs;
create policy "Users manage their own Audiq likes"
  on public.audiq_liked_songs for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own Audiq playlists" on public.audiq_playlists;
create policy "Users manage their own Audiq playlists"
  on public.audiq_playlists for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage tracks in their own Audiq playlists" on public.audiq_playlist_tracks;
create policy "Users manage tracks in their own Audiq playlists"
  on public.audiq_playlist_tracks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.audiq_playlists p
      where p.id = playlist_id
        and p.user_id = (select auth.uid())
    )
  );

-- Realtime lets another signed-in device reflect playlist edits without a reload.
alter table public.audiq_liked_songs replica identity full;
alter table public.audiq_playlists replica identity full;
alter table public.audiq_playlist_tracks replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'audiq_liked_songs'
    ) then
      execute 'alter publication supabase_realtime add table public.audiq_liked_songs';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'audiq_playlists'
    ) then
      execute 'alter publication supabase_realtime add table public.audiq_playlists';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'audiq_playlist_tracks'
    ) then
      execute 'alter publication supabase_realtime add table public.audiq_playlist_tracks';
    end if;
  end if;
end;
$$;
