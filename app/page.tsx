'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Music2, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, Bell, Plus, TrendingUp, Loader2, BookOpen } from 'lucide-react'
import { MOCK_SHOWS, SHOW_STATUS_CONFIG, type Show } from '@/lib/data'
import { getShows, subscribeToAllShows } from '@/lib/db'
import NewShowModal from '@/app/components/NewShowModal'

function statusCounts(show: Show) {
  const counts = { confirmed: 0, pending: 0, unavailable: 0, substituted: 0 }
  for (const item of show.items) counts[item.status]++
  return counts
}

function ShowCard({ show, onClick }: { show: Show; onClick: () => void }) {
  const cfg = SHOW_STATUS_CONFIG[show.status]
  const counts = statusCounts(show)
  const hasIssues = counts.unavailable > 0 || counts.substituted > 0
  const unread = show.messages.filter(m => m.from === 'buyer').length

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-400 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
          {hasIssues && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">Needs Attention</span>
          )}
        </div>
        {unread > 0 && (
          <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            <Bell size={11} /> {unread} new
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mb-1">
        <Music2 size={14} className="text-gray-400" />
        <span className="font-bold text-gray-900 text-base">{show.artist}</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <MapPin size={13} className="text-gray-400" />
        <span className="text-sm text-gray-600">{show.venue} · {show.city}</span>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={13} className="text-gray-400" />
        <span className="text-sm text-gray-600">
          {new Date(show.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
      <div className="flex gap-3 pt-3 border-t border-gray-100 flex-wrap">
        {counts.confirmed > 0 && <div className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 size={12} /> {counts.confirmed} confirmed</div>}
        {counts.pending > 0 && <div className="flex items-center gap-1 text-xs text-amber-600"><Clock size={12} /> {counts.pending} pending</div>}
        {counts.unavailable > 0 && <div className="flex items-center gap-1 text-xs text-red-600"><AlertCircle size={12} /> {counts.unavailable} unavailable</div>}
        {counts.substituted > 0 && <div className="flex items-center gap-1 text-xs text-blue-600"><AlertCircle size={12} /> {counts.substituted} substituted</div>}
      </div>
    </button>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'active' | 'issues'>('all')
  const [shows, setShows] = useState<Show[]>(MOCK_SHOWS)
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getShows()
      setShows(data)
      setLive(true)
    } catch {
      // Supabase not configured yet — keep mock data
      setShows(MOCK_SHOWS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const unsub = subscribeToAllShows(load)
    return unsub
  }, [load])

  const filtered = shows.filter(s => {
    if (filter === 'active') return s.status === 'active' || s.status === 'sent'
    if (filter === 'issues') return s.items.some(i => i.status === 'unavailable' || i.status === 'substituted')
    return true
  })

  const totalIssues = shows.flatMap(s => s.items).filter(i => i.status === 'unavailable' || i.status === 'substituted').length
  const totalMessages = shows.flatMap(s => s.messages).filter(m => m.from === 'buyer').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-gray-900">RiderLink</h1>
              {live && <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live</span>}
            </div>
            <p className="text-xs text-gray-500">Blue Alley Touring</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/riders')}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
            >
              <BookOpen size={15} /> Rider Library
            </button>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-700 transition-colors"
            >
              <Plus size={15} /> New Show
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-gray-400" /><span className="text-xs text-gray-500 font-medium">Active Shows</span></div>
            <div className="text-3xl font-black text-gray-900">{shows.filter(s => s.status === 'active' || s.status === 'sent').length}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-1"><AlertCircle size={16} className="text-red-400" /><span className="text-xs text-gray-500 font-medium">Needs Attention</span></div>
            <div className="text-3xl font-black text-red-500">{totalIssues}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-1"><Bell size={16} className="text-blue-400" /><span className="text-xs text-gray-500 font-medium">Buyer Messages</span></div>
            <div className="text-3xl font-black text-blue-500">{totalMessages}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(['all', 'active', 'issues'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${filter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'}`}>
              {f === 'all' ? 'All Shows' : f === 'active' ? 'Active' : 'Needs Attention'}
            </button>
          ))}
          {loading && <Loader2 size={16} className="animate-spin text-gray-400 self-center ml-2" />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(show => (
            <ShowCard key={show.id} show={show} onClick={() => router.push(`/show/${show.id}`)} />
          ))}
        </div>
      </div>

      {showNewModal && <NewShowModal onClose={() => setShowNewModal(false)} />}
    </div>
  )
}
