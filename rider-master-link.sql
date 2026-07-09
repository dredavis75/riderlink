-- Run this in Supabase SQL Editor
-- Links a show to the master rider it was created from / last synced from

ALTER TABLE shows
  ADD COLUMN IF NOT EXISTS master_rider_id text REFERENCES rider_masters(id) ON DELETE SET NULL;

-- shows.rider_version (already exists) is repurposed to store the master
-- rider's version at the time of creation/last "Reset to Latest Rider" sync.
