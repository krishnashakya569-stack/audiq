-- Store account-scoped "not interested" feedback so For You stays relevant
-- across the user's devices without changing normal search or playback.
create table if not exists public.audiq_hidden_recommendations (
  user_id uuid not null references auth.users (id) on delete cascade,
  track_id text not null,
  track jsonb not null check (jsonb_typeof(track) = 'object'),
  hidden_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create index if not exists audiq_hidden_recommendations_user_hidden_idx
  on public.audiq_hidden_recommendations (user_id, hidden_at desc);

alter table public.audiq_hidden_recommendations enable row level security;
alter table public.audiq_hidden_recommendations replica identity full;

revoke all on table public.audiq_hidden_recommendations from public, anon;
grant select, insert, update, delete on table public.audiq_hidden_recommendations to authenticated;

drop policy if exists "Users manage their own hidden Audiq recommendations" on public.audiq_hidden_recommendations;
create policy "Users manage their own hidden Audiq recommendations"
  on public.audiq_hidden_recommendations for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'audiq_hidden_recommendations'
    ) then
    execute 'alter publication supabase_realtime add table public.audiq_hidden_recommendations';
  end if;
end;
$$;
