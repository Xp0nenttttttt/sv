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
  for update using (auth.uid() = id) with check (auth.uid() = id);
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

-- RPC: Accept a clan invite by token (authenticated users only)
-- Validates expiration and optional email match, inserts membership, and deletes invite.
create or replace function public.accept_clan_invite(invite_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clan_id uuid;
  v_email text;
  v_expires_at timestamp with time zone;
  v_user_id uuid := auth.uid();
  v_user_email text;
begin
  if v_user_id is null then
    raise exception 'Must be authenticated to accept an invite';
  end if;

  select clan_id, email, expires_at into v_clan_id, v_email, v_expires_at
  from public.clan_invites
  where token = invite_token
  limit 1;

  if v_clan_id is null then
    raise exception 'Invalid invite token';
  end if;

  if v_expires_at is not null and v_expires_at < now() then
    -- Expired invite
    raise exception 'Invite has expired';
  end if;

  -- If invite targets a specific email, enforce it
  if v_email is not null then
    select email into v_user_email from auth.users where id = v_user_id;
    if v_user_email is null or lower(v_user_email) <> lower(v_email) then
      raise exception 'Invite is restricted to a different email';
    end if;
  end if;

  -- Insert membership if not already a member
  insert into public.clan_members (clan_id, user_id, role)
  values (v_clan_id, v_user_id, 'member')
  on conflict (clan_id, user_id) do nothing;

  -- Delete the invite after successful acceptance
  delete from public.clan_invites where token = invite_token;
end;
$$;

grant execute on function public.accept_clan_invite(text) to authenticated;

-- RPC: Upsert user profile (bypasses RLS by running as security definer)
create or replace function public.upsert_profile(
    p_username text,
    p_country text,
    p_avatar_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        raise exception 'Must be authenticated to update profile';
    end if;
    
    insert into public.profiles (id, username, country, avatar_url)
    values (v_user_id, p_username, p_country, p_avatar_url)
    on conflict (id) do update
    set username = excluded.username,
        country = excluded.country,
        avatar_url = excluded.avatar_url;
end;
$$;

grant execute on function public.upsert_profile(text, text, text) to authenticated;

-- RPC: Delete a clan (owner only)
create or replace function public.delete_clan(clan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        raise exception 'Must be authenticated to delete a clan';
    end if;
    
    -- Check if user is the owner
    if not exists (select 1 from public.clans where id = clan_id and owner_id = v_user_id) then
        raise exception 'Only the clan owner can delete it';
    end if;
    
    -- Delete the clan (will cascade to members and invites)
    delete from public.clans where id = clan_id;
end;
$$;

grant execute on function public.delete_clan(uuid) to authenticated;

-- RPC: Leave a clan (user removes self from members)
create or replace function public.leave_clan(clan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        raise exception 'Must be authenticated to leave a clan';
    end if;
    
    -- Remove user from clan members
    delete from public.clan_members where clan_id = clan_id and user_id = v_user_id;
end;
$$;

grant execute on function public.leave_clan(uuid) to authenticated;

-- Trigger: Prevent users from creating multiple clans
create or replace function public.prevent_multiple_clans()
returns trigger as $$
begin
    if (select count(*) from public.clans where owner_id = new.owner_id) > 0 then
        raise exception 'User can only own one clan';
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trigger_prevent_multiple_clans
before insert on public.clans
for each row
execute function public.prevent_multiple_clans();

-- Admin users table
create table if not exists public.admin_users (
  id uuid primary key references auth.users on delete cascade,
  created_at timestamp with time zone default now()
);

alter table public.admin_users enable row level security;
create policy "Admin users are private" on public.admin_users for select using (false);

-- RPC: Admin delete any clan
create or replace function public.admin_delete_clan(clan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        raise exception 'Must be authenticated';
    end if;
    
    -- Check if user is admin
    if not exists (select 1 from public.admin_users where id = v_user_id) then
        raise exception 'Admin access required';
    end if;
    
    -- Delete the clan
    delete from public.clans where id = clan_id;
end;
$$;

grant execute on function public.admin_delete_clan(uuid) to authenticated;

-- Cleanup expired invites: function + daily pg_cron schedule
create or replace function public.cleanup_expired_clan_invites()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.clan_invites
  where expires_at is not null and expires_at < now();
$$;

-- Note: pg_cron is available in Supabase by default.
-- Enable pg_cron if not already installed
create extension if not exists pg_cron;
-- Schedule daily cleanup at 03:00 UTC
select cron.schedule(
  'cleanup_expired_clan_invites_daily',
  '0 3 * * *',
  $$select public.cleanup_expired_clan_invites();$$
);
