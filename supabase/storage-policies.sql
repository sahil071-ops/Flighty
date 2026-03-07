-- ── Storage RLS Policies for FamilyFlights ────────────────────────────────────
-- Run these in the Supabase SQL editor to allow anonymous sessions to read/write
-- files in all storage buckets.
--
-- Anonymous auth is used (supabase.auth.signInAnonymously()) so policies must
-- allow the 'anon' role (unauthenticated) OR authenticated users.
-- Using auth.role() = 'anon' OR auth.role() = 'authenticated' covers both.

-- ── member-documents bucket ────────────────────────────────────────────────────
-- Stores passport scans, visa copies, insurance docs per family member.

INSERT INTO storage.buckets (id, name, public)
VALUES ('member-documents', 'member-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow anon read member-documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'member-documents'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

CREATE POLICY "Allow anon insert member-documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'member-documents'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

CREATE POLICY "Allow anon update member-documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'member-documents'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

CREATE POLICY "Allow anon delete member-documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'member-documents'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- ── vouchers bucket ────────────────────────────────────────────────────────────
-- Stores hotel vouchers / booking confirmations.

INSERT INTO storage.buckets (id, name, public)
VALUES ('vouchers', 'vouchers', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow anon read vouchers"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'vouchers'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

CREATE POLICY "Allow anon insert vouchers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vouchers'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

CREATE POLICY "Allow anon update vouchers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'vouchers'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

CREATE POLICY "Allow anon delete vouchers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'vouchers'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- ── tickets bucket ─────────────────────────────────────────────────────────────
-- Stores flight ticket PDFs.

INSERT INTO storage.buckets (id, name, public)
VALUES ('tickets', 'tickets', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow anon read tickets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'tickets'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

CREATE POLICY "Allow anon insert tickets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tickets'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

CREATE POLICY "Allow anon update tickets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tickets'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

CREATE POLICY "Allow anon delete tickets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tickets'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- ── documents bucket ───────────────────────────────────────────────────────────
-- Stores trip-level documents (visas, insurance attached to a trip).

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow anon read documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

CREATE POLICY "Allow anon insert documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

CREATE POLICY "Allow anon update documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

CREATE POLICY "Allow anon delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- ── Table-level RLS policies ───────────────────────────────────────────────────
-- These are REQUIRED if RLS is enabled on these tables.
-- Run these if document saves are failing with "permission denied" errors.
-- NOTE: All tables must be qualified with the 'public' schema.

-- member_documents table
ALTER TABLE public.member_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select member_documents"
ON public.member_documents FOR SELECT
USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow anon insert member_documents"
ON public.member_documents FOR INSERT
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow anon update member_documents"
ON public.member_documents FOR UPDATE
USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow anon delete member_documents"
ON public.member_documents FOR DELETE
USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- trips table
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon all trips"
ON public.trips FOR ALL
USING (auth.role() = 'authenticated' OR auth.role() = 'anon')
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- flights table
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon all flights"
ON public.flights FOR ALL
USING (auth.role() = 'authenticated' OR auth.role() = 'anon')
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- hotels table
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon all hotels"
ON public.hotels FOR ALL
USING (auth.role() = 'authenticated' OR auth.role() = 'anon')
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- trip_documents table
ALTER TABLE public.trip_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon all trip_documents"
ON public.trip_documents FOR ALL
USING (auth.role() = 'authenticated' OR auth.role() = 'anon')
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
