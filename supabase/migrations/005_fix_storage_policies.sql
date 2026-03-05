-- V4 Migration: Fix storage bucket policies + remove admin column
-- Run this in Supabase SQL Editor.

-- ============================================================
-- 1. Fix storage bucket policies for all buckets
--    (Previous migration used invalid storage.policies table)
--    These policies allow any authenticated or anonymous user
--    to read, write, and delete objects in each bucket.
-- ============================================================

-- tickets (flight ticket PDFs / images)
drop policy if exists "tickets_all"   on storage.objects;
drop policy if exists "tickets_read"  on storage.objects;
drop policy if exists "tickets_write" on storage.objects;

create policy "tickets_all" on storage.objects
  for all
  using  (bucket_id = 'tickets')
  with check (bucket_id = 'tickets');

-- vouchers (hotel vouchers)
drop policy if exists "vouchers_all"   on storage.objects;
drop policy if exists "vouchers_read"  on storage.objects;
drop policy if exists "vouchers_write" on storage.objects;

insert into storage.buckets (id, name, public)
  values ('vouchers', 'vouchers', false) on conflict (id) do nothing;

create policy "vouchers_all" on storage.objects
  for all
  using  (bucket_id = 'vouchers')
  with check (bucket_id = 'vouchers');

-- documents (trip documents: visa, insurance, etc.)
drop policy if exists "documents_all"   on storage.objects;
drop policy if exists "documents_read"  on storage.objects;
drop policy if exists "documents_write" on storage.objects;

insert into storage.buckets (id, name, public)
  values ('documents', 'documents', false) on conflict (id) do nothing;

create policy "documents_all" on storage.objects
  for all
  using  (bucket_id = 'documents')
  with check (bucket_id = 'documents');

-- member-documents (passports, visas, insurance, etc.)
drop policy if exists "member_documents_storage_all"   on storage.objects;
drop policy if exists "member_documents_storage_read"  on storage.objects;
drop policy if exists "member_documents_storage_write" on storage.objects;

insert into storage.buckets (id, name, public)
  values ('member-documents', 'member-documents', false) on conflict (id) do nothing;

create policy "member_documents_all" on storage.objects
  for all
  using  (bucket_id = 'member-documents')
  with check (bucket_id = 'member-documents');

-- ============================================================
-- 2. Remove is_admin column if it exists on any table
-- ============================================================
alter table profiles drop column if exists is_admin;

-- Note: In this app, admin is handled client-side in members.ts,
-- not in the database. No further DB changes needed.
