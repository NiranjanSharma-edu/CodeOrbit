create extension if not exists "pgcrypto";

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_room_created on public.rooms;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.add_room_owner_member() cascade;
drop function if exists public.is_room_member(uuid) cascade;
drop function if exists public.can_edit_room(uuid) cascade;

drop table if exists public.room_members cascade;
drop table if exists public.profiles cascade;
drop table if exists public.users cascade;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  language text not null default 'javascript',
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rooms' and column_name = 'created_by'
  ) then
    alter table public.rooms drop column created_by cascade;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rooms' and column_name = 'owner_id'
  ) then
    alter table public.rooms drop column owner_id cascade;
  end if;
end $$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'messages' and column_name = 'user_id'
  ) then
    alter table public.messages drop column user_id cascade;
  end if;
end $$;

create table if not exists public.code_snapshots (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'code_snapshots' and column_name = 'created_by'
  ) then
    alter table public.code_snapshots drop column created_by cascade;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'code_snapshots' and column_name = 'language'
  ) then
    alter table public.code_snapshots drop column language cascade;
  end if;
end $$;

create index if not exists rooms_created_at_idx on public.rooms(created_at desc);
create index if not exists messages_room_idx on public.messages(room_id, created_at);
create index if not exists code_snapshots_room_idx on public.code_snapshots(room_id, created_at desc);

alter table public.rooms enable row level security;
alter table public.messages enable row level security;
alter table public.code_snapshots enable row level security;

drop policy if exists "Dev read rooms" on public.rooms;
create policy "Dev read rooms"
on public.rooms for select
to authenticated
using (true);

drop policy if exists "Dev insert rooms" on public.rooms;
create policy "Dev insert rooms"
on public.rooms for insert
to authenticated
with check (true);

drop policy if exists "Dev update rooms" on public.rooms;
create policy "Dev update rooms"
on public.rooms for update
to authenticated
using (true)
with check (true);

drop policy if exists "Dev read messages" on public.messages;
create policy "Dev read messages"
on public.messages for select
to authenticated
using (true);

drop policy if exists "Dev insert messages" on public.messages;
create policy "Dev insert messages"
on public.messages for insert
to authenticated
with check (true);

drop policy if exists "Dev read snapshots" on public.code_snapshots;
create policy "Dev read snapshots"
on public.code_snapshots for select
to authenticated
using (true);

drop policy if exists "Dev insert snapshots" on public.code_snapshots;
create policy "Dev insert snapshots"
on public.code_snapshots for insert
to authenticated
with check (true);

do $$
begin
  alter publication supabase_realtime add table public.rooms;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.code_snapshots;
exception
  when duplicate_object then null;
end $$;

-- ===========================================================================
-- PROFILES  (one row per auth.users, auto-created by trigger)
-- ===========================================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  avatar_url text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles readable by authenticated" on public.profiles;
create policy "Profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);

drop policy if exists "Users can upsert own profile" on public.profiles;
create policy "Users can upsert own profile"
  on public.profiles for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Trigger: auto-create / refresh profile on auth.users INSERT
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'user_name',
      new.email
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set name       = excluded.name,
        avatar_url = excluded.avatar_url,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any existing users (safe to re-run)
insert into public.profiles (id, name, avatar_url)
select
  id,
  coalesce(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', raw_user_meta_data->>'user_name', email),
  raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do update
  set name       = excluded.name,
      avatar_url = excluded.avatar_url,
      updated_at = now();

-- ===========================================================================
-- ROOMS  –  add created_by (nullable for backward-compat)
-- ===========================================================================
alter table public.rooms
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- ===========================================================================
-- ROOM_MEMBERS
-- ===========================================================================
create table if not exists public.room_members (
  id        uuid primary key default gen_random_uuid(),
  room_id   uuid not null references public.rooms(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      text not null default 'viewer'
            check (role in ('owner', 'editor', 'viewer')),
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create index if not exists room_members_room_idx on public.room_members(room_id);
create index if not exists room_members_user_idx on public.room_members(user_id);

alter table public.room_members enable row level security;

drop policy if exists "Room members readable by authenticated" on public.room_members;
create policy "Room members readable by authenticated"
  on public.room_members for select to authenticated using (true);

drop policy if exists "Members can insert themselves" on public.room_members;
create policy "Members can insert themselves"
  on public.room_members for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Members can update own role" on public.room_members;
create policy "Members can update own role"
  on public.room_members for update to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Members can remove themselves" on public.room_members;
create policy "Members can remove themselves"
  on public.room_members for delete to authenticated
  using (auth.uid() = user_id);

-- Realtime for room_members + profiles
do $$ begin
  alter publication supabase_realtime add table public.room_members;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;
