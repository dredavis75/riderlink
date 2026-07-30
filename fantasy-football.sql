-- ============================================================
-- Run this in Supabase SQL Editor
-- Adds the crew Fantasy Football league: teams and weekly
-- matchups, scoped per workspace like everything else.
-- Fully additive — two new tables, no changes to existing
-- data or behavior.
-- ============================================================
-- (padding lines below on purpose — paste has previously dropped the
-- first few characters; if that happens again, only this comment
-- gets clipped, not real SQL)
-- ------------------------------------------------------------
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fantasy_teams (
  id           text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id text        NOT NULL DEFAULT 'default',
  team_name    text        NOT NULL,
  owner_name   text        NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fantasy_teams_workspace_idx ON fantasy_teams(workspace_id);

CREATE TABLE IF NOT EXISTS fantasy_matchups (
  id           text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id text        NOT NULL DEFAULT 'default',
  week         int         NOT NULL,
  home_team_id text        NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  away_team_id text        NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  home_score   numeric(6,2) NOT NULL DEFAULT 0,
  away_score   numeric(6,2) NOT NULL DEFAULT 0,
  is_final     boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fantasy_matchups_workspace_week_idx ON fantasy_matchups(workspace_id, week);

ALTER TABLE fantasy_teams    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_matchups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all" ON fantasy_teams;
CREATE POLICY "public_all" ON fantasy_teams FOR ALL USING (true);

DROP POLICY IF EXISTS "public_all" ON fantasy_matchups;
CREATE POLICY "public_all" ON fantasy_matchups FOR ALL USING (true);
