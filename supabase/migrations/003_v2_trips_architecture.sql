-- V2 Migration: Trips as top-level entity
-- Safe to re-run: drops all tables and recreates them from scratch.
-- Data loss is acceptable — confirmed by user (very few existing flights).
--
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query → paste → Run

-- ============================================================
-- 1. Drop old tables
-- ============================================================
drop table if exists trip_documents cascade;
drop table if exists hotels cascade;
drop table if exists flights cascade;
drop table if exists trips cascade;

-- ============================================================
-- 2. Trips (top-level entity)
--    family_member_ids is a text[] of member slugs (e.g. {'sahil','manmayee'})
-- ============================================================
create table trips (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  family_member_ids      text[] not null default '{}',
  start_date             date not null,
  end_date               date,
  notes                  text,
  notes_last_edited_by   text,
  notes_last_edited_at   timestamptz,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

alter table trips enable row level security;
create policy "allow_all_trips" on trips for all using (true) with check (true);

-- ============================================================
-- 3. Flights (belongs to a trip)
-- ============================================================
create table flights (
  id                       uuid primary key default gen_random_uuid(),
  trip_id                  uuid references trips(id) on delete cascade not null,
  family_member_id         text not null,
  leg_order                integer not null default 1,
  flight_number            text not null,
  airline                  text,
  departure_airport_code   text not null,
  departure_airport_name   text,
  departure_city           text,
  departure_datetime_utc   timestamptz not null,
  departure_timezone       text not null,
  arrival_airport_code     text not null,
  arrival_airport_name     text,
  arrival_city             text,
  arrival_datetime_utc     timestamptz not null,
  arrival_timezone         text not null,
  terminal_departure       text,
  terminal_arrival         text,
  gate                     text,
  seat                     text,
  booking_reference        text,
  price                    text,
  ticket_pdf_url           text,
  created_at               timestamptz default now()
);

alter table flights enable row level security;
create policy "allow_all_flights" on flights for all using (true) with check (true);

-- ============================================================
-- 4. Hotels (belongs to a trip)
-- ============================================================
create table hotels (
  id                   uuid primary key default gen_random_uuid(),
  trip_id              uuid references trips(id) on delete cascade not null,
  family_member_id     text not null,
  hotel_name           text not null,
  city                 text,
  country              text,
  check_in_date        date not null,
  check_in_time        time,
  check_out_date       date not null,
  check_out_time       time,
  confirmation_number  text,
  booking_reference    text,
  room_type            text,
  booked_under         text,
  address              text,
  phone                text,
  price                text,
  notes                text,
  voucher_url          text,
  created_at           timestamptz default now()
);

alter table hotels enable row level security;
create policy "allow_all_hotels" on hotels for all using (true) with check (true);

-- ============================================================
-- 5. Trip documents (visa, insurance, other attachments)
--    family_member_id = null means it applies to all members on the trip
-- ============================================================
create table trip_documents (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid references trips(id) on delete cascade not null,
  family_member_id text,
  document_type    text not null,  -- 'Visa' | 'Travel Insurance' | 'Other' etc.
  label            text not null,
  file_url         text not null,
  file_type        text,           -- 'pdf' | 'image'
  notes            text,
  created_at       timestamptz default now()
);

alter table trip_documents enable row level security;
create policy "allow_all_trip_documents" on trip_documents for all using (true) with check (true);

-- ============================================================
-- 6. Storage buckets + policies
-- ============================================================

-- Ensure all three buckets exist
insert into storage.buckets (id, name, public)
  values ('tickets',   'tickets',   false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('vouchers',  'vouchers',  false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('documents', 'documents', false)
  on conflict (id) do nothing;

-- Storage RLS policies on storage.objects
-- Drop first so this script is safe to re-run
drop policy if exists "tickets_all"   on storage.objects;
drop policy if exists "vouchers_all"  on storage.objects;
drop policy if exists "documents_all" on storage.objects;

create policy "tickets_all"
  on storage.objects for all
  using  (bucket_id = 'tickets')
  with check (bucket_id = 'tickets');

create policy "vouchers_all"
  on storage.objects for all
  using  (bucket_id = 'vouchers')
  with check (bucket_id = 'vouchers');

create policy "documents_all"
  on storage.objects for all
  using  (bucket_id = 'documents')
  with check (bucket_id = 'documents');
