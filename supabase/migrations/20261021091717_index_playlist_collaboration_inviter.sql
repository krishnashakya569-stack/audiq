-- Index the inviter foreign key so deleting an auth user does not scan every
-- membership row when playlist invitations are cascaded.
create index if not exists audiq_playlist_members_invited_by_idx
  on public.audiq_playlist_members (invited_by);
