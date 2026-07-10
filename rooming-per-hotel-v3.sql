-- ============================================================
-- Run this in Supabase SQL Editor
-- Reworks the rooming list from a per-night date grid into a per-hotel flat list:
-- each guest belongs to one hotel, with one room type + checkin/checkout range.
-- Party (A/B/C...) is derived from hotel order in the UI, not stored.
-- ============================================================
-- (padding lines below on purpose — paste has been dropping the first few
-- characters; if that happens again, only this comment gets clipped)
-- ------------------------------------------------------------
-- ------------------------------------------------------------

ALTER TABLE rooming_guests
  ADD COLUMN IF NOT EXISTS hotel_id      text REFERENCES hotels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS room_type     text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS checkin_date  date,
  ADD COLUMN IF NOT EXISTS checkout_date date;

-- Best-effort carry forward: if a guest already had exactly one assignment/day,
-- use that day's hotel + room label as their new hotel_id/room_type, and use the
-- guest's earliest/latest assignment dates as checkin/checkout.
DO $$
DECLARE
  g record;
  first_date date;
  last_date date;
  a_room text;
  a_hotel text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rooming_assignments') THEN
    FOR g IN SELECT * FROM rooming_guests LOOP
      SELECT min(date), max(date) INTO first_date, last_date
      FROM rooming_assignments WHERE guest_id = g.id;

      SELECT room_label INTO a_room
      FROM rooming_assignments WHERE guest_id = g.id ORDER BY date ASC LIMIT 1;

      SELECT hotel_id INTO a_hotel
      FROM rooming_days WHERE show_id = g.show_id AND date = first_date LIMIT 1;

      IF first_date IS NOT NULL THEN
        UPDATE rooming_guests
        SET checkin_date = first_date, checkout_date = last_date,
            room_type = coalesce(a_room, ''), hotel_id = a_hotel
        WHERE id = g.id;
      END IF;
    END LOOP;
  END IF;
END $$;

ALTER TABLE rooming_guests DROP COLUMN IF EXISTS party;

DROP TABLE IF EXISTS rooming_assignments;
DROP TABLE IF EXISTS rooming_days;
