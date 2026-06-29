'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, RefreshCw, Download, CheckCircle2, AlertTriangle, Clock, Ban, ExternalLink, Loader2, Check } from 'lucide-react'
import type { TourDate } from '@/app/api/sync-dates/route'
import { ARTIST_ROSTER } from '@/lib/data'
import ArtistAvatar from './ArtistAvatar'

const SOURCE_LABEL: Record<string, string> = {
  bandsintown: 'Bandsintown',
  ticketmaster: 'Ticketmaster',
  seatgeek: 'SeatGeek',
}

const SOURCE_COLOR: Record<string, string> = {
  bandsintown: 'bg-teal-50 text-teal-700 border-teal-200',
  ticketmaster: 'bg-blue-50 text-blue-700 border-blue-200',
  seatgeek: 'bg-violet-50 text-violet-700 border-violet-200',
}

const STATUS_CONFIG = {
  confirmed:   { label: 'Confirmed',   color: 'text-emerald-600', icon: CheckCircle2, dot: 'bg-emerald-500' },
  cancelled:   { label: 'Cancelled',   color: 'text-red-500',     icon: Ban,          dot: 'bg-red-500' },
  postponed:   { label: 'Postponed',   color: 'text-amber-500',   icon: Clock,        dot: 'bg-amber-500' },
  rescheduled: { label: 'Rescheduled', color: 'text-blue-500',    icon: RefreshCw,    dot: 'bg-blue-500' },
}

interface Props {
  onClose: () => void
  existingShows: { artist: string; date: string; venue: string }[]
  onImport: (dates: TourDate[]) => Promise<void>
}

export default function SyncDatesModal({ onClose, existingShows, onImport }: Props) {
  const [loading, setLoading]     = useState(false)
  const [dates, setDates]         = useState<TourDate[]>([])
  const [sources, setSources]     = useState<Record<string, boolean>>({})
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [imported, setImported]   = useState(false)
  const [filter, setFilter]       = useState<'all' | 'new' | 'confirmed' | 'cancelled' | 'postponed'>('new')
  const [artistFilter, setArtistFilter] = useState<string>('all')
  const [error, setError]         = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    setDates([])
    setSelected(new Set())
    try {
      const artists = ARTIST_ROSTER.join(',')
      const res = await window.fetch(`/api/sync-dates?artists=${encodeURIComponent(artists)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Sync failed')
      setDates(data.dates)
      setSources(data.sources)
      // Auto-select all new confirmed dates
      const newConfirmed = (data.dates as TourDate[])
        .filter(d => d.status === 'confirmed' && !isExisting(d))
        .map(d => d.sourceId)
      setSelected(new Set(newConfirmed))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  function isExisting(d: TourDate) {
    return existingShows.some(s =>
      s.artist.toLowerCase() === d.artist.toLowerCase() &&
      s.date === d.date
    )
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    const ids = filtered.filter(d => !isExisting(d)).map(d => d.sourceId)
    setSelected(new Set(ids))
  }

  function clearAll() { setSelected(new Set()) }

  async function handleImport() {
    const toImport = dates.filter(d => selected.has(d.sourceId))
    if (!toImport.length) return
    setImporting(true)
    try {
      await onImport(toImport)
      setImported(true)
      setTimeout(onClose, 1500)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setImporting(false)
    }
  }

  const filtered = dates.filter(d => {
    if (artistFilter !== 'all' && d.artist !== artistFilter) return false
    if (filter === 'new') return !isExisting(d)
    if (filter === 'confirmed') return d.status === 'confirmed'
    if (filter === 'cancelled') return d.status === 'cancelled'
    if (filter === 'postponed') return d.status === 'postponed' || d.status === 'rescheduled'
    return true
  })

  const newCount = dates.filter(d => !isExisting(d) && d.status === 'confirmed').length
  const cancelledCount = dates.filter(d => d.status === 'cancelled').length
  const postponedCount = dates.filter(d => d.status === 'postponed' || d.status === 'rescheduled').length

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/80 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-black text-gray-900 text-xl">Sync Tour Dates</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {Object.entries(sources).map(([src, active]) => (
                <span key={src} className={`text-xs font-bold px-2 py-0.5 rounded-full border ${active ? SOURCE_COLOR[src] : 'bg-gray-50 text-gray-400 border-gray-200 line-through'}`}>
                  {SOURCE_LABEL[src]}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetch} disabled={loading} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {!loading && dates.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-4 text-sm shrink-0">
            <span className="font-black text-gray-900">{dates.length} dates found</span>
            {newCount > 0 && <span className="text-emerald-600 font-bold">+{newCount} new</span>}
            {cancelledCount > 0 && <span className="text-red-500 font-bold">{cancelledCount} cancelled</span>}
            {postponedCount > 0 && <span className="text-amber-500 font-bold">{postponedCount} postponed</span>}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={selectAll} className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">Select all new</button>
              <span className="text-gray-300">·</span>
              <button onClick={clearAll} className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">Clear</button>
            </div>
          </div>
        )}

        {/* Filters */}
        {!loading && dates.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap shrink-0">
            {(['all', 'new', 'confirmed', 'cancelled', 'postponed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg capitalize transition-all ${filter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {f === 'new' ? `New (${newCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <select value={artistFilter} onChange={e => setArtistFilter(e.target.value)}
              className="ml-auto text-xs font-bold border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
              <option value="all">All Artists</option>
              {ARTIST_ROSTER.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={32} className="animate-spin text-amber-500" />
              <p className="font-bold text-gray-500">Syncing from Bandsintown, Songkick, Ticketmaster, SeatGeek…</p>
            </div>
          )}

          {error && (
            <div className="m-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle size={18} className="text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-700">{error}</p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
              <p className="font-bold">No dates match this filter</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="divide-y divide-gray-50">
              {filtered.map(d => {
                const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.confirmed
                const existing = isExisting(d)
                const isSelected = selected.has(d.sourceId)
                const dateObj = new Date(d.date + 'T12:00:00')

                return (
                  <div key={d.sourceId}
                    onClick={() => !existing && toggle(d.sourceId)}
                    className={`flex items-center gap-4 px-6 py-4 transition-all ${existing ? 'opacity-50 cursor-default' : 'cursor-pointer hover:bg-gray-50'} ${isSelected && !existing ? 'bg-amber-50/50' : ''}`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${existing ? 'bg-gray-200 border-gray-200' : isSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
                      {existing ? <Check size={11} className="text-gray-400" /> : isSelected ? <Check size={11} className="text-white" /> : null}
                    </div>

                    {/* Artist photo */}
                    <ArtistAvatar artist={d.artist} size={36} rounded="rounded-lg" />

                    {/* Date info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-gray-900 text-sm">{d.artist}</span>
                        <span className={`text-xs font-bold ${cfg.color}`}>· {cfg.label}</span>
                        {existing && <span className="text-xs font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Already added</span>}
                      </div>
                      <div className="text-sm text-gray-600 truncate mt-0.5">{d.venue}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {d.city}{d.country && d.country !== 'US' ? `, ${d.country}` : ''} ·{' '}
                        {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        {d.time && ` · ${d.time}`}
                      </div>
                    </div>

                    {/* Source + ticket link */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${SOURCE_COLOR[d.source]}`}>
                        {SOURCE_LABEL[d.source]}
                      </span>
                      {d.ticketUrl && (
                        <a href={d.ticketUrl} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-gray-300 hover:text-gray-600 transition-colors">
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
            <span className="text-sm text-gray-500 font-semibold">
              {selected.size > 0 ? `${selected.size} date${selected.size !== 1 ? 's' : ''} selected` : 'No dates selected'}
            </span>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selected.size === 0 || importing || imported}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-sm rounded-xl transition-all disabled:opacity-40 shadow-sm shadow-amber-500/30"
              >
                {imported
                  ? <><CheckCircle2 size={14} /> Imported!</>
                  : importing
                  ? <><Loader2 size={14} className="animate-spin" /> Importing…</>
                  : <><Download size={14} /> Import {selected.size} Show{selected.size !== 1 ? 's' : ''}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
