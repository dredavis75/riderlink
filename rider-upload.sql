-- Run this in your Supabase SQL editor

-- 1. Add rider PDF URL column to shows
ALTER TABLE shows ADD COLUMN IF NOT EXISTS rider_pdf_url text;

-- 2. Create the rider-pdfs storage bucket (25 MB limit, PDFs only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('rider-pdfs', 'rider-pdfs', true, 26214400, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies
DROP POLICY IF EXISTS "rider-pdfs public read"   ON storage.objects;
DROP POLICY IF EXISTS "rider-pdfs anon upload"   ON storage.objects;
DROP POLICY IF EXISTS "rider-pdfs anon update"   ON storage.objects;

CREATE POLICY "rider-pdfs public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'rider-pdfs');

CREATE POLICY "rider-pdfs anon upload"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'rider-pdfs');

CREATE POLICY "rider-pdfs anon update"
  ON storage.objects FOR UPDATE USING (bucket_id = 'rider-pdfs');
