-- FamilyFlights initial schema
-- Run this in the Supabase SQL editor

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.family_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_token text unique default gen_random_uuid()::text,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_colour text not null default '#0ea5e9',
  group_id uuid references public.family_groups(id) on delete set null,
  is_admin boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists public.flights (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.family_groups(id) on delete cascade not null,
  family_member_id uuid references public.profiles(id) on delete cascade not null,
  trip_id uuid,
  trip_name text,
  flight_number text not null,
  airline text,
  departure_airport_code text not null,
  departure_airport_name text,
  departure_city text,
  departure_datetime_utc timestamptz not null,
  departure_timezone text not null,
  arrival_airport_code text not null,
  arrival_airport_name text,
  arrival_city text,
  arrival_datetime_utc timestamptz not null,
  arrival_timezone text not null,
  terminal_departure text,
  terminal_arrival text,
  gate text,
  seat text,
  booking_reference text,
  price text,
  notes text,
  ticket_pdf_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for chronological queries
create index if not exists flights_departure_idx on public.flights (departure_datetime_utc);
create index if not exists flights_group_idx on public.flights (group_id);
create index if not exists flights_member_idx on public.flights (family_member_id);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.family_groups enable row level security;
alter table public.profiles enable row level security;
alter table public.flights enable row level security;

-- family_groups: members can read their own group
create policy "Members can read their group" on public.family_groups
  for select using (
    id = (select group_id from public.profiles where id = auth.uid())
  );

create policy "Members can update their group" on public.family_groups
  for update using (
    id = (select group_id from public.profiles where id = auth.uid())
    and (select is_admin from public.profiles where id = auth.uid()) = true
  );

-- profiles: anyone authenticated can read profiles in the same group
create policy "Group members can read profiles" on public.profiles
  for select using (
    group_id = (select group_id from public.profiles where id = auth.uid())
    or id = auth.uid()
  );

create policy "Users can insert their own profile" on public.profiles
  for insert with check (id = auth.uid());

create policy "Users can update their own profile" on public.profiles
  for update using (id = auth.uid());

-- flights: group-based access
create policy "Group members see all group flights" on public.flights
  for select using (
    group_id = (select group_id from public.profiles where id = auth.uid())
  );

create policy "Group members can insert flights" on public.flights
  for insert with check (
    group_id = (select group_id from public.profiles where id = auth.uid())
  );

create policy "Admin or owner can update" on public.flights
  for update using (
    family_member_id = auth.uid()
    or (select is_admin from public.profiles where id = auth.uid()) = true
  );

create policy "Admin or owner can delete" on public.flights
  for delete using (
    family_member_id = auth.uid()
    or (select is_admin from public.profiles where id = auth.uid()) = true
  );

-- ============================================================
-- Storage: tickets bucket
-- ============================================================

-- Run these in the Supabase Storage UI or via the dashboard:
-- 1. Create bucket named "tickets" (private)
-- 2. Add storage policies below via SQL editor:

-- Allow authenticated users to upload to their group's folder
-- insert into storage.buckets (id, name, public) values ('tickets', 'tickets', false)
--   on conflict do nothing;

create policy "Group members can upload tickets" on storage.objects
  for insert with check (
    bucket_id = 'tickets'
    and auth.role() = 'authenticated'
  );

create policy "Group members can read tickets" on storage.objects
  for select using (
    bucket_id = 'tickets'
    and auth.role() = 'authenticated'
  );

create policy "Admin or owner can delete tickets" on storage.objects
  for delete using (
    bucket_id = 'tickets'
    and auth.role() = 'authenticated'
  );

-- ============================================================
-- Updated_at trigger
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger flights_updated_at
  before update on public.flights
  for each row execute procedure public.handle_updated_at();
