-- Supabase default table grants can add non-CRUD privileges to authenticated.
-- Replace them with only the operations required by Audiq's feedback sync.
revoke all on table public.audiq_hidden_recommendations from public, anon, authenticated;
grant select, insert, update, delete on table public.audiq_hidden_recommendations to authenticated;
