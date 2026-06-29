-- Run this in Supabase SQL Editor

-- Table: one row per uploaded PDF section per show
CREATE TABLE IF NOT EXISTS rider_pdf_sections (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  show_id     text NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  label       text NOT NULL DEFAULT 'Rider',
  public_url  text NOT NULL,
  storage_path text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rider_pdf_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sections public read"   ON rider_pdf_sections;
DROP POLICY IF EXISTS "sections anon insert"   ON rider_pdf_sections;
DROP POLICY IF EXISTS "sections anon update"   ON rider_pdf_sections;
DROP POLICY IF EXISTS "sections anon delete"   ON rider_pdf_sections;

CREATE POLICY "sections public read"  ON rider_pdf_sections FOR SELECT USING (true);
CREATE POLICY "sections anon insert"  ON rider_pdf_sections FOR INSERT WITH CHECK (true);
CREATE POLICY "sections anon update"  ON rider_pdf_sections FOR UPDATE USING (true);
CREATE POLICY "sections anon delete"  ON rider_pdf_sections FOR DELETE USING (true);
