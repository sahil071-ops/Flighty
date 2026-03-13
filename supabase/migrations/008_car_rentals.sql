-- Car rentals table
create table car_rentals (
  id                   uuid primary key default gen_random_uuid(),
  trip_id              uuid references trips(id) on delete cascade not null,
  family_member_id     text not null,
  company              text not null,
  car_type             text,
  pickup_location      text not null,
  dropoff_location     text,
  pickup_date          date not null,
  pickup_time          time,
  dropoff_date         date not null,
  dropoff_time         time,
  confirmation_number  text,
  booking_reference    text,
  driver_name          text,
  price                text,
  notes                text,
  voucher_url          text,
  created_at           timestamptz default now()
);

alter table car_rentals enable row level security;
create policy "allow_all_car_rentals" on car_rentals for all using (true) with check (true);
