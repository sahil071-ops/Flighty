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
