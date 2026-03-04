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
-- 6. Storage bucket policies
--    Assumes buckets 'tickets', 'vouchers', 'documents' exist.
--    Create them in Storage → New bucket if they don't exist yet.
-- ============================================================

-- tickets bucket (flight ticket PDFs / images)
do $$
begin
  if not exists (
    select 1 from storage.policies where bucket_id = 'tickets' and name = 'tickets_all'
  ) then
    insert into storage.policies (bucket_id, name, definition)
    values ('tickets', 'tickets_all', '{"operation":"ALL","check":"true","using":"true"}');
  end if;
end $$;

-- vouchers bucket (hotel vouchers)
insert into storage.buckets (id, name, public)
  values ('vouchers', 'vouchers', false)
  on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from storage.policies where bucket_id = 'vouchers' and name = 'vouchers_all'
  ) then
    insert into storage.policies (bucket_id, name, definition)
    values ('vouchers', 'vouchers_all', '{"operation":"ALL","check":"true","using":"true"}');
  end if;
end $$;

-- documents bucket (visa, insurance etc.)
insert into storage.buckets (id, name, public)
  values ('documents', 'documents', false)
  on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from storage.policies where bucket_id = 'documents' and name = 'documents_all'
  ) then
    insert into storage.policies (bucket_id, name, definition)
    values ('documents', 'documents_all', '{"operation":"ALL","check":"true","using":"true"}');
  end if;
end $$;
