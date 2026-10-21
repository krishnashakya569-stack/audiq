-- Let each Audiq account tune recommendations without changing the India-first catalog region.
alter table public.profiles
  add column if not exists preferred_music_language text not null default 'auto';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_preferred_music_language_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_preferred_music_language_valid
      check (preferred_music_language in (
        'auto', 'hindi', 'punjabi', 'tamil', 'telugu', 'malayalam',
        'kannada', 'bengali', 'marathi', 'gujarati', 'english'
      ));
  end if;
end;
$$;
