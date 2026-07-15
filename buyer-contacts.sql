-- ============================================================
-- Run this in Supabase SQL Editor
-- Adds support for multiple buyer-side recipients per show (buyer,
-- production manager, hospitality manager, etc.) and link-open
-- tracking for all of them, including the existing single buyer.
-- Fully additive — new nullable/defaulted columns + one new table,
-- no changes to existing data or behavior.
-- ============================================================
-- (padding lines below on purpose — paste has previously dropped the
-- first few characters; if that happens again, only this comment
-- gets clipped, not real SQL)
-- ------------------------------------------------------------
-- ------------------------------------------------------------

ALTER TABLE shows
  ADD COLUMN IF NOT EXISTS buyer_invited_at     timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_opened_at      timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_last_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_open_count     int NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS buyer_contacts (
  id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  show_id         text        NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  name            text        NOT NULL DEFAULT '',
  role            text        NOT NULL DEFAULT '',
  email           text        NOT NULL DEFAULT '',
  phone           text,
  sort_order      int         NOT NULL DEFAULT 0,
  invited_at      timestamptz,
  opened_at       timestamptz,
  last_opened_at  timestamptz,
  open_count      int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE buyer_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all" ON buyer_contacts;
CREATE POLICY "public_all" ON buyer_contacts FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE buyer_contacts;
