-- Keep a signed-in listener's recent music searches available on their devices.
create table if not exists public.audiq_search_history (
  user_id uuid not null references auth.users (id) on delete cascade,
  query_key text not null check (char_length(query_key) between 1 and 128),
  query text not null check (char_length(btrim(query)) between 1 and 120),
  position smallint not null check (position between 0 and 19),
  updated_at timestamptz not null default now(),
  primary key (user_id, query_key)
);

create index if not exists audiq_search_history_owner_order_idx
  on public.audiq_search_history (user_id, position);

alter table public.audiq_search_history enable row level security;
revoke all on table public.audiq_search_history from anon, authenticated;
grant select, insert, update, delete on table public.audiq_search_history to authenticated;

drop policy if exists "Users can read their Audiq search history" on public.audiq_search_history;
create policy "Users can read their Audiq search history"
  on public.audiq_search_history for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add to their Audiq search history" on public.audiq_search_history;
create policy "Users can add to their Audiq search history"
  on public.audiq_search_history for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their Audiq search history" on public.audiq_search_history;
create policy "Users can update their Audiq search history"
  on public.audiq_search_history for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their Audiq search history" on public.audiq_search_history;
create policy "Users can delete their Audiq search history"
  on public.audiq_search_history for delete to authenticated
  using ((select auth.uid()) = user_id);

alter table public.audiq_search_history replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'audiq_search_history'
     ) then
    alter publication supabase_realtime add table public.audiq_search_history;
  end if;
end;
$$;
