-- FamilyFlights schema (simplified — no auth, password-gated app)
-- Run this in the Supabase SQL editor
-- Safe to re-run: drops all old objects first

-- ============================================================
-- PART 1: Clean up + create flights table + RLS policies
-- This is the critical part. Run this first.
-- ============================================================

-- Clean up old schema
drop table if exists public.flights cascade;
drop table if exists public.profiles cascade;
drop table if exists public.family_groups cascade;
drop function if exists public.handle_updated_at cascade;

-- Create flights table
create table public.flights (
  id uuid primary key default gen_random_uuid(),
  family_member_id text not null,   -- hardcoded member slug: 'sahil', 'manmayee', etc.
  trip_id text,                      -- shared across legs of a multi-leg booking
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

create index flights_departure_idx on public.flights (departure_datetime_utc);
create index flights_member_idx on public.flights (family_member_id);

-- Enable RLS
alter table public.flights enable row level security;

-- Allow all operations (security is handled by the app password gate)
create policy "Allow select" on public.flights for select using (true);
create policy "Allow insert" on public.flights for insert with check (true);
create policy "Allow update" on public.flights for update using (true);
create policy "Allow delete" on public.flights for delete using (true);

-- Updated_at trigger
create function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger flights_updated_at
  before update on public.flights
  for each row execute procedure public.handle_updated_at();


-- ============================================================
-- PART 2: Storage bucket policies for PDF tickets
-- Run this AFTER creating the "tickets" bucket in Storage UI.
-- If this part fails, the flights table above is unaffected.
-- ============================================================

drop policy if exists "Group members can upload tickets" on storage.objects;
drop policy if exists "Group members can read tickets" on storage.objects;
drop policy if exists "Admin or owner can delete tickets" on storage.objects;
drop policy if exists "Anon can upload tickets" on storage.objects;
drop policy if exists "Anon can read tickets" on storage.objects;
drop policy if exists "Anon can delete tickets" on storage.objects;
drop policy if exists "Allow ticket uploads" on storage.objects;
drop policy if exists "Allow ticket reads" on storage.objects;
drop policy if exists "Allow ticket deletes" on storage.objects;

create policy "Allow ticket uploads" on storage.objects
  for insert with check (bucket_id = 'tickets');

create policy "Allow ticket reads" on storage.objects
  for select using (bucket_id = 'tickets');

create policy "Allow ticket deletes" on storage.objects
  for delete using (bucket_id = 'tickets');
