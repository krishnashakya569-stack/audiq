-- Keep the anonymous public-read path separate while consolidating the
-- authenticated SELECT rules into one policy per table.
drop policy if exists "Anyone can read public Audiq playlists" on public.audiq_playlists;
create policy "Anyone can read public Audiq playlists"
  on public.audiq_playlists for select to anon
  using (visibility = 'public');

drop policy if exists "Owners and invitees can read Audiq playlists" on public.audiq_playlists;
create policy "Owners and invitees can read Audiq playlists"
  on public.audiq_playlists for select to authenticated
  using (
    visibility = 'public'
    or (select auth.uid()) = user_id
    or exists (
      select 1 from public.audiq_playlist_members m
      where m.playlist_id = audiq_playlists.id
        and m.owner_id = audiq_playlists.user_id
        and m.user_id = (select auth.uid())
        and m.status in ('pending', 'accepted')
    )
  );

drop policy if exists "Anyone can read tracks in public Audiq playlists" on public.audiq_playlist_tracks;
create policy "Anyone can read tracks in public Audiq playlists"
  on public.audiq_playlist_tracks for select to anon
  using (
    exists (
      select 1
      from public.audiq_playlists p
      where p.id = audiq_playlist_tracks.playlist_id
        and p.visibility = 'public'
    )
  );

drop policy if exists "Owners and invitees can read Audiq playlist tracks" on public.audiq_playlist_tracks;
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
    or exists (
      select 1 from public.audiq_playlists p
      where p.id = audiq_playlist_tracks.playlist_id
        and p.visibility = 'public'
    )
  );
