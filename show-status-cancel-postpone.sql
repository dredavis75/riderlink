-- Run this in Supabase SQL Editor
-- Allows shows.status to accept 'postponed' and 'cancelled' (fixes shows_status_check violation)

ALTER TABLE shows DROP CONSTRAINT IF EXISTS shows_status_check;

ALTER TABLE shows ADD CONSTRAINT shows_status_check
  CHECK (status IN ('draft', 'sent', 'active', 'confirmed', 'postponed', 'cancelled'));
