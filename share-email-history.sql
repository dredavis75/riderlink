-- ============================================================
-- Run this in Supabase SQL Editor
-- Adds a small table to remember emails you've shared buyer links
-- with, so they autocomplete for you across devices instead of only
-- being remembered on one browser. Fully additive — one new table,
-- no changes to existing data or behavior.
-- ============================================================
-- (padding lines below on purpose — paste has previously dropped the
-- first few characters; if that happens again, only this comment
-- gets clipped, not real SQL)
-- ------------------------------------------------------------
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS share_email_history (
  id           text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id text        NOT NULL DEFAULT 'default',
  email        text        NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);

ALTER TABLE share_email_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all" ON share_email_history;
CREATE POLICY "public_all" ON share_email_history FOR ALL USING (true);
