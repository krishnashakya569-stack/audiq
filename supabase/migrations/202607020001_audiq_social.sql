create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  audiq_id text unique not null,
  display_name text not null,
  handle text unique not null,
  avatar_color text default '#b01340',
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists profiles_audiq_id_idx on public.profiles (audiq_id);
create index if not exists chat_messages_pair_idx on public.chat_messages (sender_id, receiver_id, created_at);

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.chat_messages enable row level security;

create policy "Profiles are searchable"
  on public.profiles for select
  using (true);

create policy "Friendships are visible to participants"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Messages are visible to participants"
  on public.chat_messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
