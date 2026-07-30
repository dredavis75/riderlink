import { supabase } from './supabase'

// ── Types ────────────────────────────────────────────────────────────────────

export type FantasyTeam = {
  id: string
  teamName: string
  ownerName: string
  createdAt: string
}

export type FantasyMatchup = {
  id: string
  week: number
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
  isFinal: boolean
}

export type FantasyStanding = {
  team: FantasyTeam
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
}

export const FANTASY_WEEKS = Array.from({ length: 18 }, (_, i) => i + 1)

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapTeam(row: any): FantasyTeam {
  return {
    id: row.id,
    teamName: row.team_name,
    ownerName: row.owner_name ?? '',
    createdAt: row.created_at,
  }
}

function mapMatchup(row: any): FantasyMatchup {
  return {
    id: row.id,
    week: row.week,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    homeScore: Number(row.home_score ?? 0),
    awayScore: Number(row.away_score ?? 0),
    isFinal: row.is_final ?? false,
  }
}

// ── Teams ────────────────────────────────────────────────────────────────────

export async function getFantasyTeams(workspaceId = 'default'): Promise<FantasyTeam[]> {
  const { data, error } = await supabase
    .from('fantasy_teams')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapTeam)
}

export async function addFantasyTeam(teamName: string, ownerName: string, workspaceId = 'default'): Promise<FantasyTeam> {
  const { data, error } = await supabase
    .from('fantasy_teams')
    .insert({ team_name: teamName, owner_name: ownerName, workspace_id: workspaceId })
    .select()
    .single()
  if (error) throw error
  return mapTeam(data)
}

export async function updateFantasyTeam(id: string, fields: { teamName?: string; ownerName?: string }): Promise<void> {
  const update: Record<string, string> = {}
  if (fields.teamName !== undefined) update.team_name = fields.teamName
  if (fields.ownerName !== undefined) update.owner_name = fields.ownerName
  const { error } = await supabase.from('fantasy_teams').update(update).eq('id', id)
  if (error) throw error
}

export async function deleteFantasyTeam(id: string): Promise<void> {
  // fantasy_matchups rows referencing this team cascade-delete in Postgres
  const { error } = await supabase.from('fantasy_teams').delete().eq('id', id)
  if (error) throw error
}

// ── Matchups ─────────────────────────────────────────────────────────────────

export async function getFantasyMatchups(workspaceId = 'default'): Promise<FantasyMatchup[]> {
  const { data, error } = await supabase
    .from('fantasy_matchups')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('week', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapMatchup)
}

export async function addFantasyMatchup(week: number, homeTeamId: string, awayTeamId: string, workspaceId = 'default'): Promise<FantasyMatchup> {
  const { data, error } = await supabase
    .from('fantasy_matchups')
    .insert({ week, home_team_id: homeTeamId, away_team_id: awayTeamId, workspace_id: workspaceId })
    .select()
    .single()
  if (error) throw error
  return mapMatchup(data)
}

export async function saveFantasyMatchupScore(id: string, homeScore: number, awayScore: number, isFinal: boolean): Promise<void> {
  const { error } = await supabase
    .from('fantasy_matchups')
    .update({ home_score: homeScore, away_score: awayScore, is_final: isFinal })
    .eq('id', id)
  if (error) throw error
}

export async function deleteFantasyMatchup(id: string): Promise<void> {
  const { error } = await supabase.from('fantasy_matchups').delete().eq('id', id)
  if (error) throw error
}

// ── Standings ────────────────────────────────────────────────────────────────

export function computeStandings(teams: FantasyTeam[], matchups: FantasyMatchup[]): FantasyStanding[] {
  const table = new Map<string, FantasyStanding>(
    teams.map(t => [t.id, { team: t, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 }])
  )
  for (const m of matchups) {
    if (!m.isFinal) continue
    const home = table.get(m.homeTeamId)
    const away = table.get(m.awayTeamId)
    if (!home || !away) continue
    home.pointsFor += m.homeScore; home.pointsAgainst += m.awayScore
    away.pointsFor += m.awayScore; away.pointsAgainst += m.homeScore
    if (m.homeScore > m.awayScore)      { home.wins++;   away.losses++ }
    else if (m.homeScore < m.awayScore) { home.losses++; away.wins++ }
    else                                { home.ties++;   away.ties++ }
  }
  return [...table.values()].sort((a, b) =>
    b.wins - a.wins ||
    a.losses - b.losses ||
    b.pointsFor - a.pointsFor ||
    a.team.teamName.localeCompare(b.team.teamName)
  )
}
