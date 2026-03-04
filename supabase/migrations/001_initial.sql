-- FamilyFlights schema (simplified — no auth, password-gated app)
-- Run this in the Supabase SQL editor

-- ============================================================
-- Flights table
-- ============================================================

create table if not exists public.flights (
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

create index if not exists flights_departure_idx on public.flights (departure_datetime_utc);
create index if not exists flights_member_idx on public.flights (family_member_id);

-- ============================================================
-- Row Level Security (permissive — security handled by app password)
-- ============================================================

alter table public.flights enable row level security;

-- Anonymous sessions (used for PDF storage) can read/write all flights
create policy "Anon can select flights" on public.flights
  for select using (true);

create policy "Anon can insert flights" on public.flights
  for insert with check (true);

create policy "Anon can update flights" on public.flights
  for update using (true);

create policy "Anon can delete flights" on public.flights
  for delete using (true);

-- ============================================================
-- Storage: tickets bucket
-- ============================================================

-- Create bucket named "tickets" (private) in Supabase Storage UI, then run:

create policy "Anon can upload tickets" on storage.objects
  for insert with check (
    bucket_id = 'tickets'
    and auth.role() = 'anon'
  );

create policy "Anon can read tickets" on storage.objects
  for select using (
    bucket_id = 'tickets'
    and auth.role() = 'anon'
  );

create policy "Anon can delete tickets" on storage.objects
  for delete using (
    bucket_id = 'tickets'
    and auth.role() = 'anon'
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
