-- Run this in Supabase SQL Editor
-- Lets a specific photo be pinned directly to a rider item, bypassing
-- keyword-based image matching entirely for that item.

ALTER TABLE rider_master_items
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE rider_items
  ADD COLUMN IF NOT EXISTS image_url text;
