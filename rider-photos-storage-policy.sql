-- Run this in Supabase SQL Editor
-- Fixes a pre-existing bug: the rider-photos bucket has no storage policy,
-- so BOTH the community "Add Photo" feature AND the new per-item photo
-- override feature fail with "new row violates row-level security policy"
-- on every upload attempt.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('rider-photos', 'rider-photos', true, 10485760, ARRAY['image/png','image/jpeg','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "rider-photos public read"   ON storage.objects;
DROP POLICY IF EXISTS "rider-photos anon upload"   ON storage.objects;
DROP POLICY IF EXISTS "rider-photos anon update"   ON storage.objects;

CREATE POLICY "rider-photos public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'rider-photos');

CREATE POLICY "rider-photos anon upload"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'rider-photos');

CREATE POLICY "rider-photos anon update"
  ON storage.objects FOR UPDATE USING (bucket_id = 'rider-photos');
