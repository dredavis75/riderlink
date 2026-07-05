'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin, AlertCircle, Bell, Plus, TrendingUp,
  Loader2, BookOpen, Zap, Music2, Download, FileUp, Trash2, Pencil, RefreshCw, LogOut,
  XCircle, PauseCircle, X,
} from 'lucide-react'
import { MOCK_SHOWS, SHOW_STATUS_CONFIG, type Show, type RiderPdfSection } from '@/lib/data'
import { getShows, subscribeToAllShows, getSectionsForShows, addSection, deleteSection, updateSectionLabel, createShow, updateShowStatus } from '@/lib/db'
import { supabase, isConfigured } from '@/lib/supabase'
import NewShowModal from '@/app/components/NewShowModal'
import ArtistAvatar from '@/app/components/ArtistAvatar'
import SyncDatesModal from '@/app/components/SyncDatesModal'
import OnboardingGuide from '@/app/components/OnboardingGuide'
import { getWorkspaceId, clearWorkspace } from '@/lib/workspace'
import { getWorkspace } from '@/lib/db'
import type { TourDate } from '@/app/api/sync-dates/route'

const DEFAULT_COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'Blue Alley Touring'

const STATUS_BORDER: Record<string, string> = {
  draft:     'border-l-gray-400',
  sent:      'border-l-blue-500',
  active:    'border-l-amber-500',
  confirmed: 'border-l-emerald-500',
  postponed: 'border-l-orange-500',
  cancelled: 'border-l-red-500',
}

const STATUS_DOT: Record<string, string> = {
  draft:     'bg-gray-400',
  sent:      'bg-blue-500',
  active:    'bg-amber-500',
  confirmed: 'bg-emerald-500',
  postponed: 'bg-orange-500',
  cancelled: 'bg-red-500',
}

function statusCounts(show: Show) {
  const counts = { confirmed: 0, pending: 0, unavailable: 0, substituted: 0 }
  for (const item of show.items) counts[item.status]++
  return counts
}

function labelFromFilename(name: string): string {
  return name
    .replace(/\.pdf$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim() || 'Rider'
}

async function uploadSectionPdf(showId: string, file: File, sortOrder: number): Promise<RiderPdfSection> {
  if (!file.type.includes('pdf')) throw new Error('Only PDF files are supported')
  if (file.size > 26_214_400) throw new Error('File too large — max 25 MB')

  const safeName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '')
  const path = `${showId}/${Date.now()}-${safeName}`
  const label = labelFromFilename(file.name)

  const { error: upErr } = await supabase.storage
    .from('rider-pdfs')
    .upload(path, file, { contentType: 'application/pdf', upsert: true })
  if (upErr) throw new Error(upErr.message)

  const { data: { publicUrl } } = supabase.storage.from('rider-pdfs').getPublicUrl(path)

  return addSection(showId, label, publicUrl, path, sortOrder)
}

function ShowCard({
  show,
  sections,
  onClick,
  onSectionsChanged,
  onStatusChanged,
}: {
  show: Show
  sections: RiderPdfSection[]
  onClick: () => void
  onSectionsChanged: (showId: string, sections: RiderPdfSection[]) => void
  onStatusChanged: (showId: string, status: Show['status']) => void
}) {
  const counts    = statusCounts(show)
  const hasIssues = counts.unavailable > 0 || counts.substituted > 0
  const unread    = show.messages.filter(m => m.from === 'buyer').length
  const border    = STATUS_BORDER[show.status] ?? 'border-l-gray-400'
  const dot       = STATUS_DOT[show.status]   ?? 'bg-gray-400'
  const cfg       = SHOW_STATUS_CONFIG[show.status]
  const total     = show.items.length
  const pct       = total > 0 ? Math.round((counts.confirmed / total) * 100) : 0

  const [dragging, setDragging]     = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [uploadErr, setUploadErr]   = useState<string | null>(null)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editLabel, setEditLabel]   = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [statusModal, setStatusModal]   = useState<'cancelled' | 'postponed' | null>(null)
  const [statusReason, setStatusReason] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusMsg, setStatusMsg]       = useState<string | null>(null)

  const hasSections = sections.length > 0
  const mergeUrl = `/api/merge-rider/${show.id}`

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.includes('pdf'))
    if (!arr.length) { setUploadErr('Only PDF files supported'); return }
    setUploading(true); setUploadErr(null)
    try {
      const newSections: RiderPdfSection[] = []
      for (const file of arr) {
        const s = await uploadSectionPdf(show.id, file, sections.length + newSections.length)
        newSections.push(s)
      }
      onSectionsChanged(show.id, [...sections, ...newSections])
    } catch (e: any) {
      setUploadErr(e.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await deleteSection(id)
    onSectionsChanged(show.id, sections.filter(s => s.id !== id))
  }

  async function saveLabel(id: string) {
    await updateSectionLabel(id, editLabel)
    onSectionsChanged(show.id, sections.map(s => s.id === id ? { ...s, label: editLabel } : s))
    setEditingId(null)
  }

  async function handleConfirmStatusChange() {
    if (!statusModal) return
    setUpdatingStatus(true)
    try {
      await updateShowStatus(show.id, statusModal)
      onStatusChanged(show.id, statusModal)
      if (show.buyerEmail) {
        fetch('/api/notify-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            showId: show.id, status: statusModal, artistName: show.artist,
            venue: show.venue, city: show.city, date: show.date,
            buyerName: show.buyerName, buyerEmail: show.buyerEmail,
            reason: statusReason.trim() || undefined,
          }),
        }).catch(() => {})
      }
      setStatusMsg(`✓ Marked as ${statusModal}${show.buyerEmail ? ' — buyer notified' : ''}`)
      setStatusModal(null)
      setStatusReason('')
    } catch (e: any) {
      setStatusMsg('✕ ' + e.message)
    }
    setUpdatingStatus(false)
  }

  return (
    <div
      className={`relative group bg-white rounded-2xl border border-amber-200 border-l-4 ${border} overflow-hidden transition-all duration-200 animate-slide-up
        ${dragging ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-gray-950 scale-[1.02] shadow-2xl' : 'hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5'}`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragEnter={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
    >
      {/* Clickable main area */}
      <button onClick={onClick} className="w-full text-left p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dot} ${show.status === 'active' ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-black tracking-wider ${cfg.color}`}>{cfg.label.toUpperCase()}</span>
            {hasIssues && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">⚠ Attention</span>}
            {show.buyerApprovedAt && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Received</span>}
          </div>
          {unread > 0 && (
            <span className="flex items-center gap-1 text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              <Bell size={10} /> {unread} new
            </span>
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className="group-hover:scale-105 transition-transform duration-200 shadow-md rounded-xl">
            <ArtistAvatar artist={show.artist} size={96} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-gray-900 text-lg leading-tight">{show.artist}</div>
            <div className="text-sm text-gray-600 truncate mt-0.5">{show.venue}</div>
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <MapPin size={10} />
              {show.city} · {new Date(show.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {total > 0 && (
          <div className="mt-4 pt-4 border-t border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-3 text-xs font-semibold">
                {counts.confirmed   > 0 && <span className="text-emerald-600">✓ {counts.confirmed}</span>}
                {counts.pending     > 0 && <span className="text-amber-600">◷ {counts.pending}</span>}
                {counts.unavailable > 0 && <span className="text-red-600">✕ {counts.unavailable}</span>}
                {counts.substituted > 0 && <span className="text-blue-600">⇄ {counts.substituted}</span>}
              </div>
              <span className="text-xs font-black text-gray-500">{pct}%</span>
            </div>
            <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full fill-bar" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </button>

      {/* PDF sections panel */}
      {isConfigured && (
        <div className="border-t border-amber-200 px-4 pb-4 pt-3 space-y-2">
          {hasSections && sections.map(s => (
            <div key={s.id} className="flex items-center gap-2 group/row">
              {editingId === s.id ? (
                <input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveLabel(s.id); if (e.key === 'Escape') setEditingId(null) }}
                  onBlur={() => saveLabel(s.id)}
                  autoFocus
                  className="flex-1 text-xs bg-white border border-amber-200 text-gray-900 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <a
                  href={s.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex-1 flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 truncate"
                >
                  <Download size={10} className="shrink-0" /> {s.label}
                </a>
              )}
              <button onClick={e => { e.stopPropagation(); setEditingId(s.id); setEditLabel(s.label) }}
                className="opacity-0 group-hover/row:opacity-100 text-gray-300 hover:text-gray-600 transition-all">
                <Pencil size={10} />
              </button>
              <button onClick={e => handleDelete(s.id, e)}
                className="opacity-0 group-hover/row:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                <Trash2 size={10} />
              </button>
            </div>
          ))}

          {show.status !== 'postponed' && show.status !== 'cancelled' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={e => { e.stopPropagation(); setStatusModal('postponed'); setStatusMsg(null) }}
                className="flex items-center gap-1.5 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <PauseCircle size={10} /> Postpone
              </button>
              <button
                onClick={e => { e.stopPropagation(); setStatusModal('cancelled'); setStatusMsg(null) }}
                className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <XCircle size={10} /> Cancel Show
              </button>
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border w-fit ${show.status === 'cancelled' ? 'text-red-700 bg-red-50 border-red-200' : 'text-orange-700 bg-orange-50 border-orange-200'}`}>
              {show.status === 'cancelled' ? <XCircle size={10} /> : <PauseCircle size={10} />}
              {show.status === 'cancelled' ? 'Cancelled' : 'Postponed'}
            </div>
          )}
          {statusMsg && <p className={`text-xs font-semibold ${statusMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{statusMsg}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-50 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg transition-all border border-dashed border-amber-800/40 hover:border-amber-700"
            >
              <FileUp size={10} /> {hasSections ? 'Add PDF' : 'Attach Rider PDF'}
            </button>
            {hasSections && (
              <a
                href={mergeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Download size={10} /> Download All
              </a>
            )}
            {uploadErr && <span className="text-xs text-red-500">{uploadErr}</span>}
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="application/pdf" multiple className="hidden"
        onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = '' }} />

      {dragging && (
        <div className="absolute inset-0 bg-amber-500/95 rounded-2xl flex flex-col items-center justify-center gap-2 pointer-events-none">
          <FileUp size={28} className="text-gray-950" />
          <span className="text-sm font-black text-gray-950">Drop PDFs to attach</span>
          <span className="text-xs text-gray-900/60">You can drop multiple at once · {show.artist}</span>
        </div>
      )}
      {uploading && (
        <div className="absolute inset-0 bg-white/90 rounded-2xl flex flex-col items-center justify-center gap-2">
          <Loader2 size={24} className="animate-spin text-amber-400" />
          <span className="text-sm font-bold text-white">Uploading…</span>
        </div>
      )}

      {/* Cancel / Postpone confirm modal */}
      {statusModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-gray-900">
                {statusModal === 'cancelled' ? 'Cancel this show?' : 'Postpone this show?'}
              </h3>
              <button onClick={() => { setStatusModal(null); setStatusReason('') }} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {show.buyerEmail
                ? `${show.buyerName || 'The buyer'} (${show.buyerEmail}) will be emailed automatically.`
                : 'No buyer email on file — this will only update the status.'}
            </p>

            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Reason <span className="text-gray-400 font-normal normal-case">(optional, included in buyer email)</span>
            </label>
            <textarea
              value={statusReason}
              onChange={e => setStatusReason(e.target.value)}
              placeholder={statusModal === 'cancelled' ? 'e.g. Venue conflict' : 'e.g. New date TBD, artist illness'}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 transition-all mb-4 resize-none"
            />

            <div className="flex gap-2">
              <button onClick={() => { setStatusModal(null); setStatusReason('') }}
                className="flex-1 text-sm font-bold px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
                Never mind
              </button>
              <button onClick={handleConfirmStatusChange} disabled={updatingStatus}
                className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl text-white disabled:opacity-50 transition-colors ${statusModal === 'cancelled' ? 'bg-red-600 hover:bg-red-500' : 'bg-orange-500 hover:bg-orange-400'}`}>
                {updatingStatus ? <Loader2 size={14} className="animate-spin" /> : (statusModal === 'cancelled' ? <XCircle size={14} /> : <PauseCircle size={14} />)}
                {statusModal === 'cancelled' ? 'Cancel Show' : 'Postpone Show'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [filter, setFilter]         = useState<'all' | 'active' | 'issues'>('all')
  const [shows, setShows]           = useState<Show[]>(MOCK_SHOWS)
  const [sections, setSections]     = useState<Record<string, RiderPdfSection[]>>({})
  const [loading, setLoading]       = useState(true)
  const [live, setLive]             = useState(false)
  const [showNewModal, setShowNewModal]   = useState(false)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [showGuide, setShowGuide]         = useState(false)
  const [workspaceId, setWsId]           = useState<string>('default')
  const [companyName, setCompanyName]    = useState(DEFAULT_COMPANY)

  const load = useCallback(async (wsId: string) => {
    try {
      const data = await getShows(wsId)
      setShows(data)
      setLive(true)
      if (data.length) {
        const secs = await getSectionsForShows(data.map(s => s.id))
        setSections(secs)
      }
    } catch {
      setShows(MOCK_SHOWS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const wsId = getWorkspaceId()
    if (!wsId) { router.push('/login'); return }
    setWsId(wsId)
    load(wsId)
    // Load workspace name
    getWorkspace(wsId).then(ws => { if (ws) setCompanyName(ws.companyName) })
    const unsub = subscribeToAllShows(() => load(wsId))
    return unsub
  }, [load, router])

  function handleSectionsChanged(showId: string, next: RiderPdfSection[]) {
    setSections(prev => ({ ...prev, [showId]: next }))
  }

  function handleStatusChanged(showId: string, status: Show['status']) {
    setShows(prev => prev.map(s => s.id === showId ? { ...s, status } : s))
  }

  async function handleImportDates(dates: TourDate[]) {
    for (const d of dates) {
      await createShow({
        artist: d.artist,
        venue: d.venue,
        city: `${d.city}${d.country && d.country !== 'US' ? ', ' + d.country : ''}`,
        date: d.date,
        buyerName: '',
        buyerEmail: '',
        status: 'draft',
        items: [],
      })
    }
    await load(workspaceId)
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
    <div className="min-h-screen bg-transparent">
      {/* ── Header ── */}
      <header className="relative bg-gray-950 overflow-hidden">
        <div className="absolute inset-0 dot-grid" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/20 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-5 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="RiderLink" className="w-12 h-12 rounded-xl shadow-lg shadow-amber-500/30 object-cover" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">RiderLink</h1>
                {live && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-amber-500 tracking-widest uppercase">{companyName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-2 text-sm font-bold px-3 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-all"
              title="Getting started guide"
            >
              <span className="text-base leading-none">📌</span> Guide
            </button>
            <button
              onClick={async () => { clearWorkspace(); await supabase.auth.signOut(); router.push('/login') }}
              className="flex items-center gap-2 text-sm font-bold px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 border border-white/10 transition-all"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
            <button
              onClick={() => router.push('/riders')}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all"
            >
              <BookOpen size={15} /> Rider Library
            </button>
            <button
              onClick={() => setShowSyncModal(true)}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all"
            >
              <RefreshCw size={15} /> Sync Dates
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
          <div className="bg-white rounded-2xl border border-amber-200 border-l-4 border-l-amber-500 p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={13} className="text-amber-500" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Shows</span>
            </div>
            <div className="text-4xl font-black text-gray-900">{loading ? '—' : activeShows}</div>
          </div>
          <div className="bg-white rounded-2xl border border-amber-200 border-l-4 border-l-red-500 p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={13} className="text-red-500" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Needs Attention</span>
            </div>
            <div className={`text-4xl font-black ${totalIssues > 0 ? 'text-red-600' : 'text-gray-900'}`}>{loading ? '—' : totalIssues}</div>
          </div>
          <div className="bg-white rounded-2xl border border-amber-200 border-l-4 border-l-blue-500 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Bell size={13} className="text-blue-500" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Buyer Messages</span>
            </div>
            <div className={`text-4xl font-black ${totalMessages > 0 ? 'text-blue-600' : 'text-gray-900'}`}>{loading ? '—' : totalMessages}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          {(['all', 'active', 'issues'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-sm font-black px-4 py-2 rounded-xl transition-all ${
                filter === f
                  ? 'bg-amber-500 text-gray-950 shadow-lg shadow-amber-500/20'
                  : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'
              }`}>
              {f === 'all' ? 'All Shows' : f === 'active' ? '⚡ Active' : '⚠ Attention'}
            </button>
          ))}
          {loading && <Loader2 size={15} className="animate-spin text-gray-400 ml-1" />}
          <span className="ml-auto text-xs font-semibold text-gray-500">
            {filtered.length} show{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Show grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((show, i) => (
            <div key={show.id} style={{ animationDelay: `${i * 60}ms` }}>
              <ShowCard
                show={show}
                sections={sections[show.id] ?? []}
                onClick={() => router.push(`/show/${show.id}`)}
                onSectionsChanged={handleSectionsChanged}
                onStatusChanged={handleStatusChanged}
              />
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="col-span-2 text-center py-24 text-gray-400 animate-fade-in">
              <Music2 size={36} className="mx-auto mb-3 opacity-40" />
              <p className="font-black text-gray-600">No shows here</p>
              <p className="text-sm mt-1 text-gray-500">Hit New Show to get started</p>
            </div>
          )}
        </div>
      </div>

      <OnboardingGuide forceOpen={showGuide} onClose={() => setShowGuide(false)} />
      {showNewModal && <NewShowModal workspaceId={workspaceId} onClose={() => setShowNewModal(false)} />}
      {showSyncModal && (
        <SyncDatesModal
          onClose={() => setShowSyncModal(false)}
          existingShows={shows.map(s => ({ artist: s.artist, date: s.date, venue: s.venue }))}
          onImport={handleImportDates}
        />
      )}
    </div>
  )
}
