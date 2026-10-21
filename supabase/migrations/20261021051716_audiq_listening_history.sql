-- Keep a compact, account-owned playback history for cross-device recommendations.
create table if not exists public.audiq_listening_history (
  user_id uuid not null references auth.users (id) on delete cascade,
  track_id text not null,
  track jsonb not null check (jsonb_typeof(track) = 'object'),
  position smallint not null check (position between 0 and 49),
  played_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create index if not exists audiq_listening_history_owner_order_idx
  on public.audiq_listening_history (user_id, position);

alter table public.audiq_listening_history enable row level security;

grant select, insert, update, delete on public.audiq_listening_history to authenticated;

drop policy if exists "Users manage their own Audiq listening history" on public.audiq_listening_history;
create policy "Users manage their own Audiq listening history"
  on public.audiq_listening_history for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.audiq_listening_history replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'audiq_listening_history'
     ) then
    execute 'alter publication supabase_realtime add table public.audiq_listening_history';
  end if;
end;
$$;
