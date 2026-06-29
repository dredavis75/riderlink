-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Add approval + version fields to the existing shows table
ALTER TABLE shows
  ADD COLUMN IF NOT EXISTS buyer_approved_at   timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_approved_name text,
  ADD COLUMN IF NOT EXISTS rider_version       text DEFAULT '1.0';

-- 2. Master Riders — one record per artist
CREATE TABLE IF NOT EXISTS rider_masters (
  id         text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  artist     text        NOT NULL UNIQUE,
  version    text        NOT NULL DEFAULT '1.0',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Master Rider Items — the actual line items per master rider
CREATE TABLE IF NOT EXISTS rider_master_items (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  master_id  text NOT NULL REFERENCES rider_masters(id) ON DELETE CASCADE,
  category   text NOT NULL,
  name       text NOT NULL,
  quantity   text NOT NULL DEFAULT '',
  notes      text NOT NULL DEFAULT '',
  sort_order int  NOT NULL DEFAULT 0
);

-- 4. Row-level security (open for now — tighten when auth is added)
ALTER TABLE rider_masters      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_master_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON rider_masters      FOR ALL USING (true);
CREATE POLICY "public_all" ON rider_master_items FOR ALL USING (true);

-- 5. Add new tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE rider_masters;
ALTER PUBLICATION supabase_realtime ADD TABLE rider_master_items;
