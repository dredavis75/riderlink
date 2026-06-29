'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin, AlertCircle, Bell, Plus, TrendingUp,
  Loader2, BookOpen, Zap, Music2, Download, FileUp, CheckCircle2,
} from 'lucide-react'
import { MOCK_SHOWS, SHOW_STATUS_CONFIG, type Show } from '@/lib/data'
import { getShows, subscribeToAllShows } from '@/lib/db'
import { supabase, isConfigured } from '@/lib/supabase'
import NewShowModal from '@/app/components/NewShowModal'
import ArtistAvatar from '@/app/components/ArtistAvatar'

const STATUS_BORDER: Record<string, string> = {
  draft:     'border-l-gray-400',
  sent:      'border-l-blue-500',
  active:    'border-l-amber-500',
  confirmed: 'border-l-emerald-500',
}

const STATUS_DOT: Record<string, string> = {
  draft:     'bg-gray-400',
  sent:      'bg-blue-500',
  active:    'bg-amber-500',
  confirmed: 'bg-emerald-500',
}

function statusCounts(show: Show) {
  const counts = { confirmed: 0, pending: 0, unavailable: 0, substituted: 0 }
  for (const item of show.items) counts[item.status]++
  return counts
}

async function uploadRiderPdf(showId: string, file: File): Promise<string> {
  if (!file.type.includes('pdf')) throw new Error('Only PDF files are supported')
  if (file.size > 26_214_400) throw new Error('File too large — max 25 MB')

  const safeName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '')
  const path = `${showId}/${Date.now()}-${safeName}`

  const { error: upErr } = await supabase.storage
    .from('rider-pdfs')
    .upload(path, file, { contentType: 'application/pdf', upsert: true })

  if (upErr) throw new Error(upErr.message)

  const { data: { publicUrl } } = supabase.storage
    .from('rider-pdfs')
    .getPublicUrl(path)

  const { error: dbErr } = await supabase
    .from('shows')
    .update({ rider_pdf_url: publicUrl })
    .eq('id', showId)

  if (dbErr) throw new Error(dbErr.message)

  return publicUrl
}

function ShowCard({
  show,
  onClick,
  onPdfAttached,
}: {
  show: Show
  onClick: () => void
  onPdfAttached: (showId: string, url: string) => void
}) {
  const counts    = statusCounts(show)
  const hasIssues = counts.unavailable > 0 || counts.substituted > 0
  const unread    = show.messages.filter(m => m.from === 'buyer').length
  const border    = STATUS_BORDER[show.status] ?? 'border-l-gray-400'
  const dot       = STATUS_DOT[show.status]   ?? 'bg-gray-400'
  const cfg       = SHOW_STATUS_CONFIG[show.status]
  const total     = show.items.length
  const pct       = total > 0 ? Math.round((counts.confirmed / total) * 100) : 0

  const [dragging, setDragging]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl]       = useState<string | undefined>(show.riderPdfUrl)
  const fileRef = useRef<HTMLInputElement>(null)

  // Sync if show prop updates
  useEffect(() => { setPdfUrl(show.riderPdfUrl) }, [show.riderPdfUrl])

  async function handleFile(file: File) {
    setUploading(true)
    setUploadErr(null)
    try {
      const url = await uploadRiderPdf(show.id, file)
      setPdfUrl(url)
      onPdfAttached(show.id, url)
    } catch (e: any) {
      setUploadErr(e.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div
      className={`relative group bg-white rounded-2xl border border-gray-100 border-l-4 ${border} overflow-hidden transition-all duration-200 animate-slide-up
        ${dragging ? 'ring-2 ring-amber-500 ring-offset-2 scale-[1.02] shadow-2xl' : 'hover:shadow-xl hover:-translate-y-0.5'}`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragEnter={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {/* Main clickable card */}
      <button onClick={onClick} className="w-full text-left p-5">

        {/* Status row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dot} ${show.status === 'active' ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-black tracking-wider ${cfg.color}`}>{cfg.label.toUpperCase()}</span>
            {hasIssues && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                ⚠ Attention
              </span>
            )}
            {show.buyerApprovedAt && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ Received
              </span>
            )}
          </div>
          {unread > 0 && (
            <span className="flex items-center gap-1 text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              <Bell size={10} /> {unread} new
            </span>
          )}
        </div>

        {/* Artist + venue */}
        <div className="flex items-start gap-3">
          <div className="group-hover:scale-105 transition-transform duration-200 shadow-md rounded-xl">
            <ArtistAvatar artist={show.artist} size={48} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-gray-900 text-lg leading-tight">{show.artist}</div>
            <div className="text-sm text-gray-500 truncate mt-0.5">{show.venue}</div>
            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <MapPin size={10} />
              {show.city} · {new Date(show.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Progress */}
        {total > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-3 text-xs font-semibold">
                {counts.confirmed   > 0 && <span className="text-emerald-600">✓ {counts.confirmed}</span>}
                {counts.pending     > 0 && <span className="text-amber-500">◷ {counts.pending}</span>}
                {counts.unavailable > 0 && <span className="text-red-500">✕ {counts.unavailable}</span>}
                {counts.substituted > 0 && <span className="text-blue-500">⇄ {counts.substituted}</span>}
              </div>
              <span className="text-xs font-black text-gray-400">{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full fill-bar" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </button>

      {/* PDF row — outside the nav button */}
      {isConfigured && (
        <div className="px-5 pb-4 flex items-center gap-2 border-t border-gray-50 pt-3">
          {pdfUrl ? (
            <>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Download size={11} /> Official Rider PDF
              </a>
              <button
                onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                title="Replace PDF"
              >
                Replace
              </button>
            </>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-all border border-dashed border-gray-200 hover:border-gray-400"
            >
              <FileUp size={11} /> Attach Official Rider PDF
            </button>
          )}
          {uploadErr && <span className="text-xs text-red-500 ml-1">{uploadErr}</span>}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />

      {/* Drag-over overlay */}
      {dragging && (
        <div className="absolute inset-0 bg-amber-500/95 rounded-2xl flex flex-col items-center justify-center gap-2 pointer-events-none">
          <FileUp size={28} className="text-gray-950" />
          <span className="text-sm font-black text-gray-950">Drop PDF to attach rider</span>
          <span className="text-xs text-gray-900/60">{show.artist}</span>
        </div>
      )}

      {/* Upload progress overlay */}
      {uploading && (
        <div className="absolute inset-0 bg-gray-950/80 rounded-2xl flex flex-col items-center justify-center gap-2">
          <Loader2 size={24} className="animate-spin text-amber-400" />
          <span className="text-sm font-bold text-white">Uploading PDF…</span>
        </div>
      )}

      {/* Upload success flash */}
      {!uploading && pdfUrl && pdfUrl !== show.riderPdfUrl && (
        <div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1 animate-fade-in">
          <CheckCircle2 size={11} /> Attached
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [filter, setFilter]         = useState<'all' | 'active' | 'issues'>('all')
  const [shows, setShows]           = useState<Show[]>(MOCK_SHOWS)
  const [loading, setLoading]       = useState(true)
  const [live, setLive]             = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getShows()
      setShows(data)
      setLive(true)
    } catch {
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

  function handlePdfAttached(showId: string, url: string) {
    setShows(prev => prev.map(s => s.id === showId ? { ...s, riderPdfUrl: url } : s))
  }

  const filtered      = shows.filter(s => {
    if (filter === 'active') return s.status === 'active' || s.status === 'sent'
    if (filter === 'issues') return s.items.some(i => i.status === 'unavailable' || i.status === 'substituted')
    return true
  })
  const activeShows   = shows.filter(s => s.status === 'active' || s.status === 'sent').length
  const totalIssues   = shows.flatMap(s => s.items).filter(i => i.status === 'unavailable' || i.status === 'substituted').length
  const totalMessages = shows.flatMap(s => s.messages).filter(m => m.from === 'buyer').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="relative bg-gray-950 overflow-hidden">
        <div className="absolute inset-0 dot-grid" />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 via-transparent to-black/40 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-5 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Zap size={20} className="text-gray-950" fill="currentColor" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">RiderLink</h1>
                {live && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-amber-500 tracking-widest uppercase">Blue Alley Touring</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/riders')}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all"
            >
              <BookOpen size={15} /> Rider Library
            </button>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 text-sm font-black px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
            >
              <Plus size={15} /> New Show
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-amber-500 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={13} className="text-amber-500" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Shows</span>
            </div>
            <div className="text-4xl font-black text-gray-900">{loading ? '—' : activeShows}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-red-500 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={13} className="text-red-500" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Needs Attention</span>
            </div>
            <div className={`text-4xl font-black ${totalIssues > 0 ? 'text-red-500' : 'text-gray-900'}`}>{loading ? '—' : totalIssues}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-blue-500 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Bell size={13} className="text-blue-500" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Buyer Messages</span>
            </div>
            <div className={`text-4xl font-black ${totalMessages > 0 ? 'text-blue-500' : 'text-gray-900'}`}>{loading ? '—' : totalMessages}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          {(['all', 'active', 'issues'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-sm font-black px-4 py-2 rounded-xl transition-all ${
                filter === f
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800'
              }`}>
              {f === 'all' ? 'All Shows' : f === 'active' ? '⚡ Active' : '⚠ Attention'}
            </button>
          ))}
          {loading && <Loader2 size={15} className="animate-spin text-gray-400 ml-1" />}
          <span className="ml-auto text-xs font-semibold text-gray-400">
            {filtered.length} show{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Show grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((show, i) => (
            <div key={show.id} style={{ animationDelay: `${i * 60}ms` }}>
              <ShowCard
                show={show}
                onClick={() => router.push(`/show/${show.id}`)}
                onPdfAttached={handlePdfAttached}
              />
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="col-span-2 text-center py-24 text-gray-300 animate-fade-in">
              <Music2 size={36} className="mx-auto mb-3 opacity-40" />
              <p className="font-black text-gray-500">No shows here</p>
              <p className="text-sm mt-1 text-gray-400">Hit New Show to get started</p>
            </div>
          )}
        </div>
      </div>

      {showNewModal && <NewShowModal onClose={() => setShowNewModal(false)} />}
    </div>
  )
}
