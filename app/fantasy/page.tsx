'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Trophy, Plus, Trash2, Pencil, Loader2, X, Check, Users, Medal, Flag,
} from 'lucide-react'
import {
  FANTASY_WEEKS, computeStandings,
  getFantasyTeams, addFantasyTeam, updateFantasyTeam, deleteFantasyTeam,
  getFantasyMatchups, addFantasyMatchup, saveFantasyMatchupScore, deleteFantasyMatchup,
  type FantasyTeam, type FantasyMatchup,
} from '@/lib/fantasy'
import { getWorkspaceId } from '@/lib/workspace'

const RANK_BADGE: Record<number, string> = {
  0: 'bg-amber-400 text-gray-950',
  1: 'bg-gray-300 text-gray-800',
  2: 'bg-amber-700 text-amber-50',
}

function fmtPts(n: number): string {
  return n.toFixed(n % 1 === 0 ? 0 : 2)
}

function MatchupCard({
  matchup,
  teams,
  onSaved,
  onDeleted,
}: {
  matchup: FantasyMatchup
  teams: Map<string, FantasyTeam>
  onSaved: (m: FantasyMatchup) => void
  onDeleted: (id: string) => void
}) {
  const [homeScore, setHomeScore] = useState(String(matchup.homeScore))
  const [awayScore, setAwayScore] = useState(String(matchup.awayScore))
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState<string | null>(null)

  const home = teams.get(matchup.homeTeamId)
  const away = teams.get(matchup.awayTeamId)
  if (!home || !away) return null

  const hs = parseFloat(homeScore)
  const as = parseFloat(awayScore)
  const validScores = !Number.isNaN(hs) && !Number.isNaN(as) && hs >= 0 && as >= 0
  const dirty = validScores && (hs !== matchup.homeScore || as !== matchup.awayScore)

  async function persist(final: boolean) {
    if (!validScores) { setErr('Enter both scores'); return }
    setSaving(true); setErr(null)
    try {
      await saveFantasyMatchupScore(matchup.id, hs, as, final)
      onSaved({ ...matchup, homeScore: hs, awayScore: as, isFinal: final })
    } catch (e: any) {
      setErr(e.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await deleteFantasyMatchup(matchup.id)
      onDeleted(matchup.id)
    } catch (e: any) {
      setErr(e.message ?? 'Delete failed')
      setSaving(false)
    }
  }

  const homeWon = matchup.isFinal && matchup.homeScore > matchup.awayScore
  const awayWon = matchup.isFinal && matchup.awayScore > matchup.homeScore

  function teamRow(team: FantasyTeam, won: boolean, score: string, setScore: (v: string) => void, finalScore: number) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className={`font-black truncate ${won ? 'text-emerald-700' : 'text-gray-900'}`}>
            {team.teamName}
            {won && <Trophy size={12} className="inline ml-1.5 -mt-0.5 text-amber-500" />}
          </div>
          {team.ownerName && <div className="text-xs text-gray-500 truncate">{team.ownerName}</div>}
        </div>
        {matchup.isFinal ? (
          <div className={`text-2xl font-black tabular-nums ${won ? 'text-emerald-600' : 'text-gray-400'}`}>{fmtPts(finalScore)}</div>
        ) : (
          <input
            type="number" min="0" step="0.01" value={score}
            onChange={e => setScore(e.target.value)}
            className="w-24 text-right text-lg font-black bg-white border border-amber-200 text-gray-900 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 tabular-nums"
          />
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl border border-amber-200 border-l-4 ${matchup.isFinal ? 'border-l-emerald-500' : 'border-l-amber-500'} p-4 group animate-slide-up`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-black uppercase tracking-widest ${matchup.isFinal ? 'text-emerald-600' : 'text-amber-600'}`}>
          {matchup.isFinal ? '✓ Final' : 'In Progress'}
        </span>
        <button onClick={handleDelete} disabled={saving}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
          title="Delete matchup">
          <Trash2 size={12} />
        </button>
      </div>

      <div className="space-y-3">
        {teamRow(home, homeWon, homeScore, setHomeScore, matchup.homeScore)}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-dashed border-amber-200" />
          <span className="text-[10px] font-black text-gray-400 uppercase">vs</span>
          <div className="flex-1 border-t border-dashed border-amber-200" />
        </div>
        {teamRow(away, awayWon, awayScore, setAwayScore, matchup.awayScore)}
      </div>

      <div className="flex items-center gap-2 mt-4">
        {matchup.isFinal ? (
          <button onClick={() => persist(false)} disabled={saving}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Pencil size={11} />} Reopen
          </button>
        ) : (
          <>
            <button onClick={() => persist(false)} disabled={saving || !dirty}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition-colors disabled:opacity-40">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save Score
            </button>
            <button onClick={() => persist(true)} disabled={saving || !validScores}
              className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40">
              <Flag size={11} /> Mark Final
            </button>
          </>
        )}
        {err && <span className="text-xs text-red-500">{err}</span>}
      </div>
    </div>
  )
}

export default function FantasyFootball() {
  const router = useRouter()
  const [workspaceId, setWsId]    = useState('default')
  const [teams, setTeams]         = useState<FantasyTeam[]>([])
  const [matchups, setMatchups]   = useState<FantasyMatchup[]>([])
  const [loading, setLoading]     = useState(true)
  const [loadErr, setLoadErr]     = useState<string | null>(null)
  const [week, setWeek]           = useState(1)

  // Add-team form
  const [newTeam, setNewTeam]     = useState('')
  const [newOwner, setNewOwner]   = useState('')
  const [addingTeam, setAddingTeam] = useState(false)

  // Edit-team state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTeam, setEditTeam]   = useState('')
  const [editOwner, setEditOwner] = useState('')
  const [deleteTeamModal, setDeleteTeamModal] = useState<FantasyTeam | null>(null)
  const [deletingTeam, setDeletingTeam]       = useState(false)

  // Add-matchup form
  const [newHome, setNewHome]     = useState('')
  const [newAway, setNewAway]     = useState('')
  const [addingMatchup, setAddingMatchup] = useState(false)
  const [matchupErr, setMatchupErr]       = useState<string | null>(null)

  const load = useCallback(async (wsId: string) => {
    try {
      const [t, m] = await Promise.all([getFantasyTeams(wsId), getFantasyMatchups(wsId)])
      setTeams(t)
      setMatchups(m)
      setLoadErr(null)
      // Land on the latest week that has games, so reopening the page
      // during the season doesn't always reset to week 1
      if (m.length) setWeek(m.reduce((max, x) => Math.max(max, x.week), 1))
    } catch (e: any) {
      setLoadErr(e.message ?? 'Could not load the league — has fantasy-football.sql been run in Supabase?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const wsId = getWorkspaceId()
    if (!wsId) { router.push('/login'); return }
    setWsId(wsId)
    load(wsId)
  }, [load, router])

  const teamMap   = new Map(teams.map(t => [t.id, t]))
  const standings = computeStandings(teams, matchups)
  const weekGames = matchups.filter(m => m.week === week)
  const finals    = matchups.filter(m => m.isFinal)

  const topScore = finals.reduce<{ pts: number; teamId: string; week: number } | null>((best, m) => {
    const entries = [
      { pts: m.homeScore, teamId: m.homeTeamId, week: m.week },
      { pts: m.awayScore, teamId: m.awayTeamId, week: m.week },
    ]
    for (const e of entries) if (!best || e.pts > best.pts) best = e
    return best
  }, null)

  async function handleAddTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!newTeam.trim()) return
    setAddingTeam(true)
    try {
      const t = await addFantasyTeam(newTeam.trim(), newOwner.trim(), workspaceId)
      setTeams(prev => [...prev, t])
      setNewTeam(''); setNewOwner('')
    } catch { /* keep the form filled so the user can retry */ }
    setAddingTeam(false)
  }

  async function saveTeamEdit(id: string) {
    const teamName = editTeam.trim()
    if (!teamName) { setEditingId(null); return }
    await updateFantasyTeam(id, { teamName, ownerName: editOwner.trim() })
    setTeams(prev => prev.map(t => t.id === id ? { ...t, teamName, ownerName: editOwner.trim() } : t))
    setEditingId(null)
  }

  async function handleDeleteTeam() {
    if (!deleteTeamModal) return
    setDeletingTeam(true)
    try {
      await deleteFantasyTeam(deleteTeamModal.id)
      setTeams(prev => prev.filter(t => t.id !== deleteTeamModal.id))
      setMatchups(prev => prev.filter(m => m.homeTeamId !== deleteTeamModal.id && m.awayTeamId !== deleteTeamModal.id))
      setDeleteTeamModal(null)
    } catch { /* leave modal open so the user can retry */ }
    setDeletingTeam(false)
  }

  async function handleAddMatchup(e: React.FormEvent) {
    e.preventDefault()
    if (!newHome || !newAway) return
    if (newHome === newAway) { setMatchupErr('A team can’t play itself'); return }
    setAddingMatchup(true); setMatchupErr(null)
    try {
      const m = await addFantasyMatchup(week, newHome, newAway, workspaceId)
      setMatchups(prev => [...prev, m])
      setNewHome(''); setNewAway('')
    } catch (e: any) {
      setMatchupErr(e.message ?? 'Could not add matchup')
    }
    setAddingMatchup(false)
  }

  function handleMatchupSaved(next: FantasyMatchup) {
    setMatchups(prev => prev.map(m => m.id === next.id ? next : m))
  }

  function handleMatchupDeleted(id: string) {
    setMatchups(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* ── Header ── */}
      <header className="relative bg-gray-950 overflow-hidden">
        <div className="absolute inset-0 dot-grid" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/20 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-5 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-all"
              title="Back to shows"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span className="text-2xl leading-none">🏈</span> Fantasy Football
              </h1>
              <p className="text-xs font-bold text-amber-500 tracking-widest uppercase">Crew League</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8">
        {loadErr && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-2xl px-4 py-3">
            {loadErr}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-amber-200 border-l-4 border-l-amber-500 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users size={13} className="text-amber-500" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Teams</span>
            </div>
            <div className="text-4xl font-black text-gray-900">{loading ? '—' : teams.length}</div>
          </div>
          <div className="bg-white rounded-2xl border border-amber-200 border-l-4 border-l-emerald-500 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Flag size={13} className="text-emerald-500" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Games Final</span>
            </div>
            <div className="text-4xl font-black text-gray-900">{loading ? '—' : finals.length}</div>
          </div>
          <div className="bg-white rounded-2xl border border-amber-200 border-l-4 border-l-blue-500 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Medal size={13} className="text-blue-500" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Top Score</span>
            </div>
            {loading || !topScore ? (
              <div className="text-4xl font-black text-gray-900">—</div>
            ) : (
              <>
                <div className="text-4xl font-black text-gray-900 tabular-nums">{fmtPts(topScore.pts)}</div>
                <div className="text-xs font-semibold text-gray-500 mt-1 truncate">
                  {teamMap.get(topScore.teamId)?.teamName ?? '?'} · Week {topScore.week}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Standings ── */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-amber-200 flex items-center gap-2">
                <Trophy size={14} className="text-amber-500" />
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Standings</h2>
              </div>
              {standings.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400 font-semibold">
                  {loading ? 'Loading…' : 'Add teams to start the league'}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="text-left pl-5 py-2">Team</th>
                      <th className="text-center px-2 py-2">W-L-T</th>
                      <th className="text-right px-2 py-2">PF</th>
                      <th className="text-right pr-5 py-2">PA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => (
                      <tr key={s.team.id} className="border-t border-amber-100">
                        <td className="pl-5 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${RANK_BADGE[i] ?? 'bg-gray-100 text-gray-500'}`}>
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 truncate">{s.team.teamName}</div>
                              {s.team.ownerName && <div className="text-[10px] text-gray-400 truncate">{s.team.ownerName}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="text-center px-2 font-black text-gray-700 tabular-nums whitespace-nowrap">
                          {s.wins}-{s.losses}{s.ties > 0 ? `-${s.ties}` : ''}
                        </td>
                        <td className="text-right px-2 font-semibold text-gray-600 tabular-nums">{fmtPts(s.pointsFor)}</td>
                        <td className="text-right pr-5 font-semibold text-gray-400 tabular-nums">{fmtPts(s.pointsAgainst)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* ── Teams ── */}
            <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-amber-200 flex items-center gap-2">
                <Users size={14} className="text-amber-500" />
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Teams</h2>
              </div>
              <div className="p-4 space-y-2">
                {teams.map(t => (
                  <div key={t.id} className="flex items-center gap-2 group/row">
                    {editingId === t.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input value={editTeam} onChange={e => setEditTeam(e.target.value)} placeholder="Team name" autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveTeamEdit(t.id); if (e.key === 'Escape') setEditingId(null) }}
                          className="flex-1 min-w-0 text-xs bg-white border border-amber-200 text-gray-900 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        <input value={editOwner} onChange={e => setEditOwner(e.target.value)} placeholder="Owner"
                          onKeyDown={e => { if (e.key === 'Enter') saveTeamEdit(t.id); if (e.key === 'Escape') setEditingId(null) }}
                          className="w-24 text-xs bg-white border border-amber-200 text-gray-900 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        <button onClick={() => saveTeamEdit(t.id)} className="p-1 text-emerald-600 hover:text-emerald-700"><Check size={13} /></button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-gray-900">{t.teamName}</span>
                          {t.ownerName && <span className="text-xs text-gray-400 ml-2">{t.ownerName}</span>}
                        </div>
                        <button onClick={() => { setEditingId(t.id); setEditTeam(t.teamName); setEditOwner(t.ownerName) }}
                          className="opacity-0 group-hover/row:opacity-100 text-gray-300 hover:text-gray-600 transition-all">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => setDeleteTeamModal(t)}
                          className="opacity-0 group-hover/row:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>
                ))}

                <form onSubmit={handleAddTeam} className="flex items-center gap-2 pt-2">
                  <input value={newTeam} onChange={e => setNewTeam(e.target.value)} placeholder="Team name"
                    className="flex-1 min-w-0 text-xs bg-white border border-amber-200 text-gray-900 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-gray-400" />
                  <input value={newOwner} onChange={e => setNewOwner(e.target.value)} placeholder="Owner"
                    className="w-24 text-xs bg-white border border-amber-200 text-gray-900 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-gray-400" />
                  <button type="submit" disabled={addingTeam || !newTeam.trim()}
                    className="flex items-center gap-1 text-xs font-black px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors disabled:opacity-40 shrink-0">
                    {addingTeam ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* ── Weekly scoreboard ── */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mr-1">Week</span>
              {FANTASY_WEEKS.map(w => {
                const hasGames = matchups.some(m => m.week === w)
                return (
                  <button key={w} onClick={() => setWeek(w)}
                    className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                      week === w
                        ? 'bg-amber-500 text-gray-950 shadow-lg shadow-amber-500/20'
                        : hasGames
                          ? 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'
                          : 'bg-white border border-gray-200 text-gray-400 hover:bg-gray-50'
                    }`}>
                    {w}
                  </button>
                )
              })}
            </div>

            <div className="space-y-4">
              {weekGames.map(m => (
                <MatchupCard key={m.id} matchup={m} teams={teamMap}
                  onSaved={handleMatchupSaved} onDeleted={handleMatchupDeleted} />
              ))}

              {!loading && weekGames.length === 0 && (
                <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-amber-300">
                  <span className="text-3xl block mb-2 opacity-60">🏈</span>
                  <p className="font-black text-gray-600">No games in week {week}</p>
                  <p className="text-sm mt-1 text-gray-500">Set a matchup below to get it going</p>
                </div>
              )}

              {/* Add matchup */}
              {teams.length >= 2 && (
                <form onSubmit={handleAddMatchup}
                  className="bg-white rounded-2xl border border-dashed border-amber-300 p-4 flex items-center gap-2 flex-wrap">
                  <select value={newHome} onChange={e => setNewHome(e.target.value)}
                    className="flex-1 min-w-[140px] text-xs font-bold bg-white border border-amber-200 text-gray-900 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="">Home team…</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.teamName}</option>)}
                  </select>
                  <span className="text-[10px] font-black text-gray-400 uppercase">vs</span>
                  <select value={newAway} onChange={e => setNewAway(e.target.value)}
                    className="flex-1 min-w-[140px] text-xs font-bold bg-white border border-amber-200 text-gray-900 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="">Away team…</option>
                    {teams.filter(t => t.id !== newHome).map(t => <option key={t.id} value={t.id}>{t.teamName}</option>)}
                  </select>
                  <button type="submit" disabled={addingMatchup || !newHome || !newAway}
                    className="flex items-center gap-1.5 text-xs font-black px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 transition-colors disabled:opacity-40 shrink-0">
                    {addingMatchup ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add to Week {week}
                  </button>
                  {matchupErr && <span className="text-xs text-red-500 w-full">{matchupErr}</span>}
                </form>
              )}

              {!loading && teams.length < 2 && (
                <p className="text-center text-xs text-gray-400 font-semibold">
                  Add at least two teams to schedule a matchup
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete team confirm modal */}
      {deleteTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-gray-900">Delete this team?</h3>
              <button onClick={() => setDeleteTeamModal(null)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              This permanently deletes {deleteTeamModal.teamName} — including every matchup it played, which also erases those results from the standings. This can&apos;t be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTeamModal(null)}
                className="flex-1 text-sm font-bold px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
                Never mind
              </button>
              <button onClick={handleDeleteTeam} disabled={deletingTeam}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl text-white disabled:opacity-50 transition-colors bg-red-600 hover:bg-red-500">
                {deletingTeam ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Yes, Delete It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
