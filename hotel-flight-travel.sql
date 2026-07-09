-- Run this in Supabase SQL Editor
-- Hotel rooming list + flight list, per show, with buyer-visibility toggles

ALTER TABLE shows
  ADD COLUMN IF NOT EXISTS buyer_covers_hotel   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS buyer_covers_flights  boolean NOT NULL DEFAULT false;

-- Hotels — one or more physical hotel locations used for a show
CREATE TABLE IF NOT EXISTS hotels (
  id         text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  show_id    text        NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  address    text        NOT NULL DEFAULT '',
  lat        double precision,
  lng        double precision,
  sort_order int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Rooming list — individual room bookings, each tied to one hotel
CREATE TABLE IF NOT EXISTS rooming_list (
  id             text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  show_id        text        NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  hotel_id       text        NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_type      text        NOT NULL DEFAULT '',
  guest_name     text        NOT NULL DEFAULT '',
  checkin_date   date,
  checkout_date  date,
  sort_order     int         NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Flights — manual entry per passenger (no live search yet)
CREATE TABLE IF NOT EXISTS flights (
  id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  show_id         text        NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  passenger_name  text        NOT NULL DEFAULT '',
  airline         text        NOT NULL DEFAULT '',
  flight_number   text        NOT NULL DEFAULT '',
  origin          text        NOT NULL DEFAULT '',
  destination     text        NOT NULL DEFAULT '',
  flight_date     date,
  class_of_service text       NOT NULL DEFAULT 'coach',
  sort_order      int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hotels       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooming_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE flights      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all" ON hotels;
DROP POLICY IF EXISTS "public_all" ON rooming_list;
DROP POLICY IF EXISTS "public_all" ON flights;

CREATE POLICY "public_all" ON hotels       FOR ALL USING (true);
CREATE POLICY "public_all" ON rooming_list FOR ALL USING (true);
CREATE POLICY "public_all" ON flights      FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE hotels;
ALTER PUBLICATION supabase_realtime ADD TABLE rooming_list;
ALTER PUBLICATION supabase_realtime ADD TABLE flights;
