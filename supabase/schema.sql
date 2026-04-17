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
