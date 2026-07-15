-- ============================================================
-- Run this in Supabase SQL Editor
-- Splits the 4 day-of-show contacts (Artist Relations, Head of
-- Security, Settlement, Production Manager) out of a single JSONB
-- blob on shows into one row per contact, so two different people
-- editing different roles at the same time can no longer clobber
-- each other's data. Backfills existing data, then drops the old
-- column since it's fully superseded.
-- ============================================================
-- (padding lines below on purpose — paste has previously dropped the
-- first few characters; if that happens again, only this comment
-- gets clipped, not real SQL)
-- ------------------------------------------------------------
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS day_of_show_roles (
  id         text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  show_id    text        NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('artistRelations', 'headOfSecurity', 'settlement', 'productionManager')),
  name       text        NOT NULL DEFAULT '',
  phone      text        NOT NULL DEFAULT '',
  email      text        NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (show_id, role)
);

ALTER TABLE day_of_show_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all" ON day_of_show_roles;
CREATE POLICY "public_all" ON day_of_show_roles FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE day_of_show_roles;

-- Backfill existing shows.day_of_show_contacts JSONB into rows
DO $$
DECLARE
  r record;
  role_key text;
  c jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shows' AND column_name = 'day_of_show_contacts') THEN
    FOR r IN SELECT id, day_of_show_contacts FROM shows WHERE day_of_show_contacts IS NOT NULL LOOP
      FOR role_key IN SELECT unnest(ARRAY['artistRelations', 'headOfSecurity', 'settlement', 'productionManager']) LOOP
        c := r.day_of_show_contacts -> role_key;
        IF c IS NOT NULL THEN
          INSERT INTO day_of_show_roles (show_id, role, name, phone, email)
          VALUES (r.id, role_key, coalesce(c ->> 'name', ''), coalesce(c ->> 'phone', ''), coalesce(c ->> 'email', ''))
          ON CONFLICT (show_id, role) DO NOTHING;
        END IF;
      END LOOP;
    END LOOP;

    ALTER TABLE shows DROP COLUMN day_of_show_contacts;
  END IF;
END $$;
