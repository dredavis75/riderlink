-- Run this in Supabase SQL Editor
-- Replaces the flat `rooming_list` table with a per-night grid:
--   rooming_days        one row per date of the run (hotel/status/note/room counts)
--   rooming_guests       one row per person on the roster (A/B party, name, confirmation #)
--   rooming_assignments  one row per (guest, date) — the grid cell (room label)
--
-- This migrates existing rooming_list rows forward before dropping the table.

CREATE TABLE IF NOT EXISTS rooming_days (
  id             text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  show_id        text        NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  date           date        NOT NULL,
  hotel_id       text        REFERENCES hotels(id) ON DELETE SET NULL,
  booking_status text        NOT NULL DEFAULT 'requested', -- requested | confirmed | need_approval | unconfirmed
  note           text        NOT NULL DEFAULT '',
  single_count   int         NOT NULL DEFAULT 0,
  double_count   int         NOT NULL DEFAULT 0,
  suite_count    int         NOT NULL DEFAULT 0,
  sort_order     int         NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (show_id, date)
);

CREATE TABLE IF NOT EXISTS rooming_guests (
  id                 text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  show_id            text        NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  party              text        NOT NULL DEFAULT 'B', -- 'A' | 'B'
  first_name         text        NOT NULL DEFAULT '',
  last_name          text        NOT NULL DEFAULT '',
  sex                text,
  confirmation_number text,
  sort_order         int         NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rooming_assignments (
  id         text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  show_id    text        NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  guest_id   text        NOT NULL REFERENCES rooming_guests(id) ON DELETE CASCADE,
  date       date        NOT NULL,
  room_label text        NOT NULL DEFAULT '',
  sort_order int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guest_id, date)
);

ALTER TABLE rooming_days        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooming_guests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooming_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all" ON rooming_days;
DROP POLICY IF EXISTS "public_all" ON rooming_guests;
DROP POLICY IF EXISTS "public_all" ON rooming_assignments;

CREATE POLICY "public_all" ON rooming_days        FOR ALL USING (true);
CREATE POLICY "public_all" ON rooming_guests      FOR ALL USING (true);
CREATE POLICY "public_all" ON rooming_assignments FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE rooming_days;
ALTER PUBLICATION supabase_realtime ADD TABLE rooming_guests;
ALTER PUBLICATION supabase_realtime ADD TABLE rooming_assignments;

-- ── Migrate existing rooming_list rows forward ──────────────────────────────────
-- Only runs if the old table still exists (safe to re-run / safe on a fresh DB).

DO $$
DECLARE
  r record;
  g_id text;
  d date;
  first text;
  last text;
  space_pos int;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rooming_list') THEN
    FOR r IN SELECT * FROM rooming_list LOOP
      -- split "First Middle Last" on the last space: everything before -> first, last token -> last
      space_pos := length(trim(r.guest_name)) - position(' ' in reverse(trim(r.guest_name)));
      IF trim(r.guest_name) = '' THEN
        first := '';
        last := '';
      ELSIF position(' ' in trim(r.guest_name)) = 0 THEN
        first := trim(r.guest_name);
        last := '';
      ELSE
        first := trim(substring(trim(r.guest_name) from 1 for space_pos));
        last := trim(substring(trim(r.guest_name) from space_pos + 2));
      END IF;

      INSERT INTO rooming_guests (show_id, party, first_name, last_name, sort_order)
      VALUES (r.show_id, 'B', first, last, r.sort_order)
      RETURNING id INTO g_id;

      IF r.checkin_date IS NOT NULL AND r.checkout_date IS NOT NULL THEN
        d := r.checkin_date;
        WHILE d <= r.checkout_date LOOP
          INSERT INTO rooming_assignments (show_id, guest_id, date, room_label, sort_order)
          VALUES (r.show_id, g_id, d, r.room_type, r.sort_order)
          ON CONFLICT (guest_id, date) DO NOTHING;

          INSERT INTO rooming_days (show_id, date, hotel_id, sort_order)
          VALUES (r.show_id, d, r.hotel_id, 0)
          ON CONFLICT (show_id, date) DO NOTHING;

          d := d + 1;
        END LOOP;
      END IF;
    END LOOP;

    DROP TABLE rooming_list;
  END IF;
END $$;
