-- Run this in Supabase SQL Editor
-- Adds venue address + coordinates so the venue can be pinned on a map

ALTER TABLE shows
  ADD COLUMN IF NOT EXISTS venue_address text,
  ADD COLUMN IF NOT EXISTS venue_lat double precision,
  ADD COLUMN IF NOT EXISTS venue_lng double precision;
