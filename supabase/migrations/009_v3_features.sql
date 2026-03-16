-- V3 Features: Boarding Passes, Loyalty Cards, Push Subscriptions

-- Boarding passes table
create table if not exists boarding_passes (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid references flights(id) on delete cascade not null,
  trip_id uuid references trips(id) on delete cascade not null,
  passenger_name text,
  gate text,
  seat text,
  boarding_time text,
  departure_time text,
  departure_date date,
  sequence_number text,
  fare_class text,
  has_qr_code boolean default false,
  file_url text,
  file_type text,
  created_at timestamptz default now()
);

alter table boarding_passes enable row level security;
create policy "Allow all on boarding_passes" on boarding_passes for all using (true) with check (true);

-- Loyalty cards table
create table if not exists loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  family_member_id text not null,
  airline_name text not null,
  airline_iata_code text,
  programme_name text not null,
  member_number text not null,
  tier text,
  alliance text,
  notes text,
  created_at timestamptz default now()
);

alter table loyalty_cards enable row level security;
create policy "Allow all on loyalty_cards" on loyalty_cards for all using (true) with check (true);

-- Push subscriptions table
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_member_id text not null,
  subscription jsonb not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;
create policy "Allow all on push_subscriptions" on push_subscriptions for all using (true) with check (true);

-- Storage policies for boarding-passes bucket
-- (Create this bucket in Supabase Dashboard: Storage > New Bucket > boarding-passes, public=false)
create policy "Allow uploads to boarding-passes"
  on storage.objects for insert
  with check (bucket_id = 'boarding-passes');

create policy "Allow reads from boarding-passes"
  on storage.objects for select
  using (bucket_id = 'boarding-passes');

create policy "Allow deletes from boarding-passes"
  on storage.objects for delete
  using (bucket_id = 'boarding-passes');
