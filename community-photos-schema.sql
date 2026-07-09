-- Run this in Supabase SQL Editor
-- Formalizes the community_photos table, which previously only existed live
-- in the DB with no tracked schema anywhere in the repo.

CREATE TABLE IF NOT EXISTS community_photos (
  id           text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  keyword      text        NOT NULL,
  url          text        NOT NULL,
  workspace_id text        NOT NULL DEFAULT 'default',
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_photos_public_all ON community_photos;
CREATE POLICY community_photos_public_all ON community_photos FOR ALL USING (true);

-- Safe to re-run even if the table was already in the publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE community_photos;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
