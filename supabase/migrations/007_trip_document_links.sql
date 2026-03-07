-- Junction table linking member_documents to trips
CREATE TABLE trip_document_links (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id            uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  member_document_id uuid NOT NULL REFERENCES member_documents(id) ON DELETE CASCADE,
  created_at         timestamptz DEFAULT now(),
  UNIQUE (trip_id, member_document_id)
);

ALTER TABLE trip_document_links ENABLE ROW LEVEL SECURITY;

-- App is password-gated; allow all authenticated operations
CREATE POLICY "Allow all" ON trip_document_links
  FOR ALL USING (true) WITH CHECK (true);
