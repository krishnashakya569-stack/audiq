-- Public playlist links reveal only playlists their owner explicitly shares.
alter table public.audiq_playlists
  add column if not exists visibility text not null default 'private';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audiq_playlists_visibility_check'
      and conrelid = 'public.audiq_playlists'::regclass
  ) then
    alter table public.audiq_playlists
      add constraint audiq_playlists_visibility_check
      check (visibility in ('private', 'public'));
  end if;
end;
$$;

create index if not exists audiq_playlist_tracks_public_order_idx
  on public.audiq_playlist_tracks (playlist_id, position);

alter table public.audiq_playlists enable row level security;
alter table public.audiq_playlist_tracks enable row level security;

revoke all on table public.audiq_playlists from public, anon;
revoke all on table public.audiq_playlist_tracks from public, anon;
grant select on table public.audiq_playlists to anon;
grant select on table public.audiq_playlist_tracks to anon;
grant select, insert, update, delete on table public.audiq_playlists to authenticated;
grant select, insert, update, delete on table public.audiq_playlist_tracks to authenticated;

drop policy if exists "Anyone can read public Audiq playlists" on public.audiq_playlists;
create policy "Anyone can read public Audiq playlists"
  on public.audiq_playlists for select to anon, authenticated
  using (visibility = 'public');

drop policy if exists "Anyone can read tracks in public Audiq playlists" on public.audiq_playlist_tracks;
create policy "Anyone can read tracks in public Audiq playlists"
  on public.audiq_playlist_tracks for select to anon, authenticated
  using (
    exists (
      select 1
      from public.audiq_playlists p
      where p.id = audiq_playlist_tracks.playlist_id
        and p.visibility = 'public'
    )
  );
