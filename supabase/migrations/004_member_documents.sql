-- V3 Migration: Member Documents (passports, visas, travel insurance, other)
-- Safe to re-run: uses IF NOT EXISTS and ON CONFLICT DO NOTHING.
--
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query → paste → Run

-- ============================================================
-- 1. member_documents table
--    family_member_id is a text slug (e.g. 'sahil'), matching the
--    rest of the app — NOT a uuid foreign key.
-- ============================================================
create table if not exists member_documents (
  id uuid primary key default gen_random_uuid(),
  family_member_id text not null,  -- text slug e.g. 'sahil', 'manmayee'
  document_type text not null,     -- 'passport' | 'visa' | 'travel_insurance' | 'other'
  label text not null,             -- e.g. "Sahil - UAE Visa"

  -- Passport fields
  passport_number text,
  passport_country_of_issue text,
  passport_nationality text,
  passport_expiry_date date,
  passport_dob date,

  -- Visa fields
  visa_country text,
  visa_type text,          -- Tourist / Business / Transit / etc.
  visa_entry_type text,    -- Single / Multiple / Transit
  visa_issue_date date,
  visa_expiry_date date,
  visa_duration_of_stay text,
  visa_issuing_country text,

  -- Travel insurance fields
  insurance_provider text,
  insurance_policy_number text,
  insurance_start_date date,
  insurance_end_date date,
  insurance_coverage text,
  insurance_emergency_number text,

  -- Unified expiry (auto-set from whichever specific field applies)
  expiry_date date,

  notes text,
  file_url text,   -- Supabase storage path: member-documents/{family_member_id}/{doc_id}.{ext}
  file_type text,  -- 'pdf' | 'image'

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table member_documents enable row level security;

-- Drop + recreate so it's safe to re-run
drop policy if exists "allow_all_member_documents" on member_documents;
create policy "allow_all_member_documents"
  on member_documents for all
  using (true)
  with check (true);

-- ============================================================
-- 2. Storage bucket + policy for member document files
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('member-documents', 'member-documents', false)
  on conflict (id) do nothing;

drop policy if exists "member_documents_storage_all" on storage.objects;
create policy "member_documents_storage_all"
  on storage.objects for all
  using  (bucket_id = 'member-documents')
  with check (bucket_id = 'member-documents');
