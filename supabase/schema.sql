-- Debate Arena — Meeting Rooms schema
-- Run this once in Supabase → SQL Editor → New query → Run.

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text default '',
  role text not null default 'member' check (role in ('admin','member')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- New auth user -> profile row. The FIRST ever user becomes admin + approved.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  select count(*) into cnt from public.profiles;
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when cnt = 0 then 'admin' else 'member' end,
    case when cnt = 0 then 'approved' else 'pending' end
  );
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper predicates (security definer so they bypass RLS on profiles).
create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles p
                where p.id = auth.uid() and p.status = 'approved');
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles p
                where p.id = auth.uid() and p.role = 'admin' and p.status = 'approved');
$$;

-- ============ ROOMS ============
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  topic text default '',
  context text default '',
  language text default 'auto',
  adviser_ids text[] not null default '{}',
  convened boolean not null default false,
  owner_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ MESSAGES (unified room thread) ============
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_type text not null check (author_type in ('adviser','chair','user','system')),
  author_id text,
  author_name text default '',
  kind text not null check (kind in ('advice','synthesis','message','question')),
  body text default '',
  bottom_line text default '',
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_room_created_idx on public.messages(room_id, created_at);

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.rooms    enable row level security;
alter table public.messages enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "approved read rooms" on public.rooms;
create policy "approved read rooms" on public.rooms
  for select using (public.is_approved());

drop policy if exists "approved create rooms" on public.rooms;
create policy "approved create rooms" on public.rooms
  for insert with check (public.is_approved() and owner_id = auth.uid());

drop policy if exists "owner update rooms" on public.rooms;
create policy "owner update rooms" on public.rooms
  for update using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "approved read messages" on public.messages;
create policy "approved read messages" on public.messages
  for select using (public.is_approved());

drop policy if exists "approved insert user messages" on public.messages;
create policy "approved insert user messages" on public.messages
  for insert with check (
    public.is_approved() and author_type = 'user' and author_id = auth.uid()::text
  );
-- adviser/chair messages are written server-side with the secret key (bypasses RLS).

-- ============ REALTIME ============
alter publication supabase_realtime add table public.messages;
