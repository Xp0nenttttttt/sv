-- Supabase SQL for profiles and clans
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text,
  country text,
  avatar_url text,
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Clans
create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text not null,
  description text,
  logo_url text,
  owner_id uuid references auth.users on delete cascade,
  created_at timestamp with time zone default now()
);
alter table public.clans enable row level security;
create policy "Clans viewable by everyone" on public.clans for select using (true);
create policy "Clan owners can insert" on public.clans for insert with check (auth.uid() = owner_id);
create policy "Clan owners can update" on public.clans for update using (auth.uid() = owner_id);

create table if not exists public.clan_members (
  clan_id uuid references public.clans on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text default 'member',
  joined_at timestamp with time zone default now(),
  primary key (clan_id, user_id)
);
alter table public.clan_members enable row level security;
create policy "Members readable by everyone" on public.clan_members for select using (true);
create policy "Users can insert themselves" on public.clan_members for insert with check (auth.uid() = user_id);
create policy "Users can delete themselves" on public.clan_members for delete using (auth.uid() = user_id);

create table if not exists public.clan_invites (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans on delete cascade,
  email text,
  token text unique,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);
alter table public.clan_invites enable row level security;
create policy "Invites viewable by owners" on public.clan_invites for select using (auth.uid() = (select owner_id from public.clans c where c.id = clan_id));
create policy "Owners can insert invites" on public.clan_invites for insert with check (auth.uid() = (select owner_id from public.clans c where c.id = clan_id));
