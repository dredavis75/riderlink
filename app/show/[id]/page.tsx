'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Send, Copy, CheckCircle2, AlertCircle,
  MessageSquare, Edit3, ExternalLink, Loader2, Zap, Download, Sparkles, Trash2,
  Calendar, Phone, Mail, Shield, Music, DollarSign, Wrench, FileText, Clock, Users, XCircle, PauseCircle, X,
} from 'lucide-react'
import { MOCK_SHOWS, STATUS_CONFIG, SHOW_STATUS_CONFIG, OFFICIAL_RIDER_PDFS, type RiderItem, type ItemStatus, type Show } from '@/lib/data'
import { getShow, updateItem, deleteShowItem, sendMessage, subscribeToShow, updateBuyer, updateShowStatus, getAllManagementContacts, type ManagementContact } from '@/lib/db'
import ArtistAvatar from '@/app/components/ArtistAvatar'
import ProductImage from '@/app/components/ProductImage'

const ARTIST_COLORS: Record<string, string> = {
  'G Herbo':     'from-emerald-600 to-emerald-800',
  'SKRILLA':     'from-violet-600 to-violet-800',
  'Keyshia Cole':'from-rose-600 to-rose-800',
  'Flo Milli':   'from-amber-500 to-amber-700',
  'Tink':        'from-pink-600 to-pink-800',
  'K. Michelle': 'from-teal-600 to-teal-800',
  'RL':          'from-blue-600 to-blue-800',
}

const ARTIST_BANNERS: Record<string, string> = {
  'G Herbo':     '/rider-logos/CROWD BANNER 1.jpeg',
  'Keyshia Cole':'/rider-logos/CROWD BANNER 2.jpeg',
  'Flo Milli':   '/rider-logos/CROWD BANNER 3.jpeg',
  'SKRILLA':     '/rider-logos/CROWD BANNER 4.jpeg',
  'Tink':        '/rider-logos/CROWD BANNER 5.jpeg',
}
const DEFAULT_BANNER = '/rider-logos/CROWD BANNER 6.jpeg'

const CATEGORY_BLUE = 'border-l-blue-400 bg-blue-50'

const CATEGORY_ORDER = [
  'Dressing Room', 'Food', 'Beverages', 'Production Office', 'Dancers Room',
  'Band Room', 'Essentials', 'Dinner', 'Security', 'Venue', 'Production',
  'Transportation', 'Hotel', 'Other',
]

function sortCategories(cats: string[]): string[] {
  return [...cats].sort((a, b) => {
    const ai = CATEGORY_ORDER.findIndex(c => c.toLowerCase() === a.toLowerCase())
    const bi = CATEGORY_ORDER.findIndex(c => c.toLowerCase() === b.toLowerCase())
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

function groupByCategory(items: RiderItem[]) {
  return items.reduce<Record<string, RiderItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})
}

export default function ShowDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router  = useRouter()

  const [show, setShow]               = useState<Show | null>(MOCK_SHOWS.find(s => s.id === id) ?? null)
  const [saving, setSaving]           = useState<string | null>(null)
  const [newMessage, setNewMessage]   = useState('')
  const [editingItem, setEditingItem]       = useState<string | null>(null)
  const [editValue, setEditValue]           = useState('')
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [categoryValue, setCategoryValue]   = useState('')
  const [copied, setCopied]           = useState(false)
  const [activeTab, setActiveTab]     = useState<'rider' | 'messages' | 'dayofshow'>('rider')
  const [live, setLive]               = useState(false)
  const [extracting, setExtracting]   = useState(false)
  const [extractResult, setExtractResult] = useState<string | null>(null)
  const [shareOpen, setShareOpen]     = useState(false)
  const [shareEmails, setShareEmails] = useState('')
  const [sharing, setSharing]         = useState(false)
  const [shareResult, setShareResult] = useState<string | null>(null)
  const [buyerOpen, setBuyerOpen]     = useState(false)
  const [buyerName, setBuyerName]     = useState('')
  const [buyerEmail, setBuyerEmail]   = useState('')
  const [buyerPhone, setBuyerPhone]   = useState('')
  const [inviting, setInviting]       = useState(false)
  const [inviteResult, setInviteResult] = useState<string | null>(null)
  const [mgmtContacts, setMgmtContacts] = useState<ManagementContact[]>([])
  const [statusModal, setStatusModal] = useState<'cancelled' | 'postponed' | null>(null)
  const [statusReason, setStatusReason] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getShow(id)
      if (data) {
        setShow(data); setLive(true)
        setBuyerName(data.buyerName ?? '')
        setBuyerEmail(data.buyerEmail ?? '')
      }
    } catch { /* keep mock */ }
  }, [id])

  useEffect(() => {
    load()
    const unsub = subscribeToShow(id, load)
    return unsub
  }, [id, load])

  if (!show) return <div className="p-8 text-gray-500">Show not found.</div>

  const cfg        = SHOW_STATUS_CONFIG[show.status]
  const _grouped   = groupByCategory(show.items)
  const grouped    = Object.fromEntries(sortCategories(Object.keys(_grouped)).map(k => [k, _grouped[k]]))
  const issueCount = show.items.filter(i => i.status === 'unavailable' || i.status === 'substituted').length
  const unreadBuyer = show.messages.filter(m => m.from === 'buyer').length
  const buyerLink  = `${typeof window !== 'undefined' ? window.location.origin : ''}/buyer/${show.id}`
  const gradient   = ARTIST_COLORS[show.artist] ?? 'from-gray-700 to-gray-900'
  const total      = show.items.length
  const confirmed  = show.items.filter(i => i.status === 'confirmed').length
  const pct        = total > 0 ? Math.round((confirmed / total) * 100) : 0

  async function handleStatusChange(item: RiderItem, status: ItemStatus) {
    setSaving(item.id)
    setShow(prev => prev ? { ...prev, items: prev.items.map(i => i.id === item.id ? { ...i, status } : i) } : prev)
    try { await updateItem(item.id, { status }) } catch {}
    setSaving(null)
  }

  async function saveEdit(itemId: string) {
    setShow(prev => prev ? { ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, name: editValue } : i) } : prev)
    setEditingItem(null)
    try { await updateItem(itemId, { name: editValue }) } catch {}
  }

  async function handleDeleteItem(itemId: string) {
    setShow(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== itemId) } : prev)
    try { await deleteShowItem(itemId) } catch {}
  }

  async function saveCategory(oldCategory: string) {
    const newCat = categoryValue.trim()
    if (!newCat || newCat === oldCategory) { setEditingCategory(null); return }
    setShow(prev => prev ? { ...prev, items: prev.items.map(i => i.category === oldCategory ? { ...i, category: newCat } : i) } : prev)
    setEditingCategory(null)
    const ids = show?.items.filter(i => i.category === oldCategory).map(i => i.id) ?? []
    await Promise.all(ids.map(id => updateItem(id, { category: newCat }).catch(() => {})))
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return
    const text = newMessage.trim()
    setNewMessage('')
    const msg = { id: `m${Date.now()}`, from: 'manager' as const, sender: 'Dré Davis', text, timestamp: new Date().toISOString() }
    setShow(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : prev)
    try { await sendMessage(show?.id ?? id, 'manager', 'Dré Davis', text) } catch {}
  }

  async function handleInviteBuyer() {
    if (!buyerEmail.trim() || !show) return
    setInviting(true); setInviteResult(null)
    try {
      await updateBuyer(show.id, buyerName, buyerEmail)
      setShow(prev => prev ? { ...prev, buyerName, buyerEmail } : prev)
      const res = await fetch('/api/invite-buyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerName, buyerEmail, buyerPhone, artistName: show.artist, venue: show.venue, city: show.city, date: show.date, showId: show.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Send failed')
      if (data.smsError) {
        setInviteResult(`✓ Email sent · SMS failed: ${data.smsError}`)
      } else if (buyerPhone.trim()) {
        setInviteResult('✓ Email + SMS sent to buyer')
      } else {
        setInviteResult('✓ Rider sent to buyer')
      }
    } catch (e: any) {
      setInviteResult('✕ ' + e.message)
    }
    setInviting(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(buyerLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function extractFromPdfs() {
    if (!confirm('This will read your uploaded PDFs and replace the current rider items with everything extracted. Continue?')) return
    setExtracting(true)
    setExtractResult(null)
    try {
      const res = await fetch(`/api/extract-rider/${id}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Extraction failed')
      setExtractResult(`✓ Extracted ${data.extracted} items from ${data.sections} PDF${data.sections !== 1 ? 's' : ''}`)
      await load() // reload show to get new items
    } catch (e: any) {
      setExtractResult(`✕ ${e.message}`)
    } finally {
      setExtracting(false)
    }
  }

  async function handleShare() {
    if (!show) return
    const list = shareEmails.split(/[\s,;]+/).map(e => e.trim()).filter(e => e.includes('@'))
    if (!list.length) { setShareResult('Enter at least one valid email'); return }
    setSharing(true); setShareResult(null)
    try {
      const res = await fetch('/api/share-rider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: list, showId: show.id, artistName: show.artist,
          venue: show.venue, city: show.city, date: show.date, senderName: 'Dré Davis',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? data.details ?? `Status ${res.status}`)
      setShareResult(`✓ Sent to ${data.sent} ${data.sent === 1 ? 'person' : 'people'}`)
      setShareEmails('')
    } catch (e: any) { setShareResult('✕ ' + e.message) }
    finally { setSharing(false) }
  }

  async function handleConfirmStatusChange() {
    if (!show || !statusModal) return
    setUpdatingStatus(true)
    try {
      await updateShowStatus(show.id, statusModal)
      setShow(p => p ? { ...p, status: statusModal } : p)
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
      setStatusMsg(`✓ Show marked as ${statusModal}${show.buyerEmail ? ' — buyer notified' : ''}`)
      setStatusModal(null)
      setStatusReason('')
    } catch (e: any) {
      setStatusMsg('✕ ' + e.message)
    }
    setUpdatingStatus(false)
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1400&auto=format&fit=crop&q=80')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`} />
        <div className="absolute inset-0 bg-black/55 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-5 py-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={15} /> All Shows
            </button>
            <img src="/logo.png" alt="RiderLink" className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-black/30" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Mobile avatar */}
              <div className="sm:hidden shrink-0">
                <ArtistAvatar artist={show.artist} size={72} rounded="rounded-xl" className="shadow-lg shadow-black/30 border-2 border-white/20" />
              </div>
              {/* Desktop avatar */}
              <div className="hidden sm:block shrink-0">
                <ArtistAvatar artist={show.artist} size={160} rounded="rounded-2xl" className="shadow-xl shadow-black/30 border-2 border-white/20" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-white/20 text-white">{cfg.label.toUpperCase()}</span>
                  {show.riderVersion && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/70">v{show.riderVersion}</span>}
                  {live && <span className="flex items-center gap-1 text-[10px] text-emerald-300 font-bold uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</span>}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{show.artist}</h1>
                <p className="text-white/70 text-sm mt-1">{show.venue} · {show.city}</p>
                <p className="text-white/50 text-xs mt-0.5">
                  {new Date(show.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                {buyerOpen ? (
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Buyer name"
                      className="text-xs bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-lg px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                    <input value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="Buyer email" type="email"
                      className="text-xs bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-lg px-2 py-1 w-40 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                    <button onClick={async () => { if (show) { await updateBuyer(show.id, buyerName, buyerEmail); setShow(p => p ? { ...p, buyerName, buyerEmail } : p) } setBuyerOpen(false) }}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300">Save</button>
                    <button onClick={() => setBuyerOpen(false)} className="text-xs text-white/40 hover:text-white/70">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setBuyerOpen(true)}
                    className="text-white/40 text-xs mt-1 hidden sm:flex items-center gap-1 hover:text-white/70 transition-colors group">
                    {show.buyerName ? `Buyer: ${show.buyerName} · ${show.buyerEmail}` : 'Add buyer info'}
                    <Edit3 size={9} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex sm:flex-col gap-2 shrink-0 flex-wrap">
              <button onClick={copyLink}
                className="flex items-center gap-2 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-all">
                {copied ? <><CheckCircle2 size={13} className="text-emerald-400" /> Copied!</> : <><Copy size={13} /> Copy Buyer Link</>}
              </button>
              <a href={`/buyer/${show.id}?admin=1`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-all">
                <ExternalLink size={13} /> Preview Buyer View
              </a>
              <button onClick={() => { setBuyerOpen(o => !o); setInviteResult(null) }}
                className={`flex items-center gap-2 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all ${buyerOpen ? 'bg-amber-500 text-gray-950' : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'}`}>
                <Send size={13} /> Send to Buyer
              </button>
              {show.status !== 'postponed' && show.status !== 'cancelled' && (
                <div className="flex gap-2">
                  <button onClick={() => { setStatusModal('postponed'); setStatusMsg(null) }}
                    className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-400/30 transition-all">
                    <PauseCircle size={13} /> Postpone
                  </button>
                  <button onClick={() => { setStatusModal('cancelled'); setStatusMsg(null) }}
                    className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-400/30 transition-all">
                    <XCircle size={13} /> Cancel Show
                  </button>
                </div>
              )}
              {(show.status === 'postponed' || show.status === 'cancelled') && (
                <div className={`flex items-center gap-2 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border ${show.status === 'cancelled' ? 'bg-red-500/15 text-red-300 border-red-400/30' : 'bg-orange-500/15 text-orange-300 border-orange-400/30'}`}>
                  {show.status === 'cancelled' ? <XCircle size={13} /> : <PauseCircle size={13} />}
                  {show.status === 'cancelled' ? 'Cancelled' : 'Postponed'}
                </div>
              )}
              {statusMsg && <p className={`text-xs font-semibold ${statusMsg.startsWith('✓') ? 'text-emerald-300' : 'text-red-300'}`}>{statusMsg}</p>}
              {(() => {
                const url = show.riderPdfUrl ?? (() => {
                  const al = show.artist.toLowerCase()
                  const k = Object.keys(OFFICIAL_RIDER_PDFS).find(k => k.toLowerCase() === al || al.includes(k.toLowerCase().split(' ').at(-1)!))
                  return k ? OFFICIAL_RIDER_PDFS[k] : null
                })()
                return url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 transition-all shadow-lg shadow-amber-500/30">
                    <Download size={13} /> Official Rider PDF
                  </a>
                ) : null
              })()}
            </div>
          </div>

          {/* Progress bar in header */}
          {total > 0 && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-white/50 mb-1.5">
                <span>{confirmed} of {total} items confirmed</span>
                <span className="font-bold text-white/70">{pct}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white/60 rounded-full fill-bar" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6">
        {/* Approval banner */}
        {show.buyerApprovedAt && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm text-emerald-700 font-semibold animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            Rider received by <strong>{show.buyerApprovedName}</strong>
            {' · '}
            {new Date(show.buyerApprovedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {' at '}
            {new Date(show.buyerApprovedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </div>
        )}

        {issueCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm text-red-700 font-semibold">
            <AlertCircle size={15} />
            {issueCount} item{issueCount > 1 ? 's' : ''} flagged — review below
          </div>
        )}

        {/* Tabs — horizontal scroll on mobile */}
        <div className="overflow-x-auto pb-1 -mx-1 px-1 mb-3">
          <div className="flex gap-2 items-center min-w-max">
            <button onClick={() => setActiveTab('rider')}
              className={`text-sm font-black px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'rider' ? 'bg-amber-500 text-gray-950 shadow-lg shadow-amber-500/20' : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'}`}>
              Rider Items
            </button>
            <button onClick={() => setActiveTab('messages')}
              className={`flex items-center gap-2 text-sm font-black px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'messages' ? 'bg-amber-500 text-gray-950 shadow-lg shadow-amber-500/20' : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'}`}>
              <MessageSquare size={13} /> Messages
              {unreadBuyer > 0 && <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-black">{unreadBuyer}</span>}
            </button>
            <button onClick={() => setActiveTab('dayofshow')}
              className={`flex items-center gap-2 text-sm font-black px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'dayofshow' ? 'bg-amber-500 text-gray-950 shadow-lg shadow-amber-500/20' : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'}`}>
              <Calendar size={13} /> Day of Show
              {(show.dayOfShowContacts || show.runOfShowText || show.runOfShowPdfUrl) && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            </button>
            <button onClick={() => setShareOpen(o => !o)}
              className={`flex items-center gap-2 text-sm font-black px-4 py-2 rounded-xl transition-all whitespace-nowrap ${shareOpen ? 'bg-amber-500 text-gray-950' : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'}`}>
              <Users size={13} /> Share
            </button>
            <button onClick={extractFromPdfs} disabled={extracting}
              className="flex items-center gap-2 text-sm font-black px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-sm shadow-violet-500/30 disabled:opacity-50 whitespace-nowrap">
              {extracting ? <><Loader2 size={13} className="animate-spin" /> Reading…</> : <><Sparkles size={13} /> Extract Items</>}
            </button>
            <a href={`/buyer/${show.id}`} target="_blank"
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-700 transition-colors whitespace-nowrap">
              <ExternalLink size={13} /> Buyer view
            </a>
          </div>
        </div>

        {/* Extract result */}
        {extractResult && (
          <p className={`text-xs font-bold mb-3 ${extractResult.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{extractResult}</p>
        )}

        {/* Send to Buyer panel */}
        {buyerOpen && (
          <div className="bg-white border border-amber-200 rounded-2xl p-4 mb-4">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Send Rider to Buyer</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <input value={buyerName} onChange={e => setBuyerName(e.target.value)}
                placeholder="Buyer / Promoter name"
                className="text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-gray-400 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <input value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)}
                placeholder="Buyer email address"
                type="email"
                className="text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-gray-400 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="mb-3">
              <input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)}
                placeholder="Buyer phone (optional — sends SMS too)"
                type="tel"
                className="w-full text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-gray-400 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <button onClick={handleInviteBuyer} disabled={inviting || !buyerEmail.trim()}
              className="w-full bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {inviting ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : <><Send size={13} /> Send Official Rider</>}
            </button>
            {inviteResult && <p className={`text-xs mt-2 font-semibold ${inviteResult.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{inviteResult}</p>}
          </div>
        )}

        {/* Share with Team panel */}
        {shareOpen && (
          <div className="bg-white border border-amber-200 rounded-2xl p-4 mb-4">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Share Buyer Link with Your Team</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {(mgmtContacts).map(m => (
                <button key={m.email}
                  onClick={() => setShareEmails(prev => {
                    const emails = prev.split(/[\s,;]+/).map(e => e.trim()).filter(Boolean)
                    if (emails.includes(m.email)) return prev
                    return [...emails, m.email].join(', ')
                  })}
                  className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-gray-950 flex items-center justify-center text-[10px] font-black">{m.name[0]}</span>
                  {m.name} <span className="text-gray-400 font-normal">· {m.role}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={shareEmails} onChange={e => setShareEmails(e.target.value)}
                placeholder="or type emails…"
                className="flex-1 text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-gray-400 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-0" />
              <button onClick={handleShare} disabled={sharing || !shareEmails.trim()}
                className="shrink-0 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-40 transition-colors">
                {sharing ? <Loader2 size={13} className="animate-spin" /> : 'Send'}
              </button>
            </div>
            {shareResult && <p className={`text-xs mt-2 font-semibold ${shareResult.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{shareResult}</p>}
          </div>
        )}

        <div className="mb-3" />

        {/* ── Rider tab ── */}
        {activeTab === 'rider' && (
          <div className="space-y-4 animate-slide-up">
            {/* Management contacts — only for artists with entries */}
            {(mgmtContacts).length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-white overflow-hidden">
                <div className="px-5 py-3 border-b border-amber-200 flex items-center justify-between">
                  <h2 className="font-black text-xs text-gray-500 uppercase tracking-widest">Management</h2>
                  <span className="text-xs font-bold text-gray-400">{(mgmtContacts).length} contact{(mgmtContacts).length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-amber-100">
                  {(mgmtContacts).map(m => (
                    <div key={m.email} className="px-5 py-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-amber-500 text-gray-950 flex items-center justify-center font-black text-sm shrink-0">{m.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{m.name}</p>
                        <p className="text-xs text-gray-500">{m.role}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {m.phone && <a href={`tel:${m.phone.replace(/\D/g,'')}`} className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold hover:text-amber-900"><Phone size={12} />{m.phone}</a>}
                        {m.email && <a href={`mailto:${m.email}`} className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold hover:text-amber-900"><Mail size={12} />{m.email}</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.entries(grouped).map(([category, catItems]) => {
              const catStyle = CATEGORY_BLUE
              return (
                <div key={category} className={`rounded-2xl border border-amber-200 border-l-4 overflow-hidden ${catStyle}`}>
                  <div className="px-5 py-3 border-b border-amber-200 flex items-center justify-between">
                    {editingCategory === category ? (
                      <div className="flex items-center gap-2 flex-1 mr-3">
                        <input autoFocus value={categoryValue} onChange={e => setCategoryValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveCategory(category); if (e.key === 'Escape') setEditingCategory(null) }}
                          className="text-xs font-black uppercase tracking-widest bg-white border border-amber-400 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        <button onClick={() => saveCategory(category)} className="text-xs font-bold text-emerald-600 whitespace-nowrap">Save</button>
                        <button onClick={() => setEditingCategory(null)} className="text-xs text-gray-400 whitespace-nowrap">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingCategory(category); setCategoryValue(category) }}
                        className="font-black text-xs text-gray-500 uppercase tracking-widest hover:text-amber-600 transition-colors text-left flex items-center gap-1.5 group">
                        {category}
                        <Edit3 size={9} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                      </button>
                    )}
                    <span className="text-xs font-bold text-gray-400 shrink-0">{catItems.length} items</span>
                  </div>
                  <div className="divide-y divide-amber-100">
                    {catItems.map(item => {
                      const sCfg = STATUS_CONFIG[item.status]
                      return (
                        <div key={item.id} className={`px-5 py-4 ${item.status === 'unavailable' ? 'bg-red-50' : item.status === 'substituted' ? 'bg-blue-50' : ''}`}>
                          <div className="flex items-start justify-between gap-3">
                            <ProductImage name={item.name} category={item.category} size={80} />
                            <div className="flex-1 min-w-0">
                              {editingItem === item.id ? (
                                <div className="flex gap-2">
                                  <input value={editValue} onChange={e => setEditValue(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)}
                                    className="flex-1 text-sm bg-white border border-amber-200 text-gray-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" autoFocus />
                                  <button onClick={() => saveEdit(item.id)} className="text-sm font-bold text-emerald-700">Save</button>
                                  <button onClick={() => setEditingItem(null)} className="text-sm text-gray-500">Cancel</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                                  <button onClick={() => { setEditingItem(item.id); setEditValue(item.name) }} className="text-gray-300 hover:text-gray-600 transition-colors">
                                    <Edit3 size={11} />
                                  </button>
                                </div>
                              )}
                              <span className="text-xs text-gray-500">{item.quantity}{item.notes ? ` · ${item.notes}` : ''}</span>
                              {item.buyerNote && (
                                <div className="mt-2 text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-700">
                                  <span className="font-bold">Buyer:</span> {item.buyerNote}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {saving === item.id && <Loader2 size={12} className="animate-spin text-gray-400" />}
                              <select value={item.status} onChange={e => handleStatusChange(item, e.target.value as ItemStatus)}
                                className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border ${sCfg.bg} ${sCfg.color} cursor-pointer focus:outline-none`}>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="unavailable">Unavailable</option>
                                <option value="substituted">Substituted</option>
                              </select>
                              <button onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Messages tab ── */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden flex flex-col animate-slide-up">
            <div className="p-5 space-y-3 overflow-y-auto" style={{ minHeight: 300, maxHeight: 420 }}>
              {show.messages.length === 0 && (
                <div className="text-center text-gray-500 text-sm pt-12">
                  <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
                  No messages yet. Send the buyer link to start.
                </div>
              )}
              {show.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.from === 'manager' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${msg.from === 'manager' ? 'bg-amber-100 text-gray-900 border border-amber-200 rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                    <div className="font-black text-xs mb-1 opacity-50">{msg.sender}</div>
                    {msg.text}
                    <div className="text-xs mt-1 opacity-30">{new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-amber-200 p-4 flex gap-3">
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Message the buyer…"
                className="flex-1 text-sm bg-white border border-amber-200 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <button onClick={handleSendMessage} className="bg-amber-500 hover:bg-amber-400 text-gray-950 px-4 py-2.5 rounded-xl transition-colors">
                <Send size={15} />
              </button>
            </div>
          </div>
        )}
        {/* ── Day of Show tab ── */}
        {activeTab === 'dayofshow' && (
          <div className="space-y-5 animate-slide-up">
            {!show.dayOfShowContacts && !show.runOfShowText && !show.runOfShowPdfUrl && !show.curfew ? (
              <div className="bg-white border border-amber-200 rounded-2xl p-10 text-center">
                <Calendar size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="font-bold text-gray-500">No day of show info yet</p>
                <p className="text-sm text-gray-400 mt-1">The buyer hasn't submitted this section yet.</p>
              </div>
            ) : (
              <>
                {/* Curfew */}
                <div className="bg-white border border-amber-200 rounded-2xl p-5">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock size={13} /> Venue Curfew</h3>
                  {show.curfew && show.curfew !== 'none' ? (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <Clock size={16} className="text-red-500 shrink-0" />
                      <span className="font-black text-red-700">Curfew: {show.curfew}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      <span className="font-black text-emerald-700">No venue curfew</span>
                    </div>
                  )}
                </div>

                {/* Run of Show */}
                {(show.runOfShowText || show.runOfShowPdfUrl) && (
                  <div className="bg-white border border-amber-200 rounded-2xl p-5">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><FileText size={13} /> Run of Show</h3>
                    {show.runOfShowPdfUrl && (
                      <a href={show.runOfShowPdfUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors mb-3">
                        <Download size={16} className="text-amber-600 shrink-0" />
                        <span className="font-bold text-amber-800 text-sm">Download Run of Show PDF</span>
                      </a>
                    )}
                    {show.runOfShowText && (
                      <pre className="text-sm text-gray-800 bg-gray-50 border border-amber-200 rounded-xl px-4 py-3 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                        {show.runOfShowText}
                      </pre>
                    )}
                  </div>
                )}

                {/* Contacts */}
                {/* Buyer Attachments */}
                {show.buyerAttachments && show.buyerAttachments.length > 0 && (
                  <div className="bg-white border border-amber-200 rounded-2xl p-5">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><FileText size={13} /> Additional Documents</h3>
                    <div className="space-y-2">
                      {show.buyerAttachments.map((a, i) => (
                        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors">
                          <Download size={14} className="text-amber-600 shrink-0" />
                          <span className="text-sm font-semibold text-amber-800 truncate">{a.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {show.dayOfShowContacts && (
                  <div className="bg-white border border-amber-200 rounded-2xl p-5">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Day of Show Contacts</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {([
                        { key: 'artistRelations',   label: 'Artist Relations',   Icon: Music },
                        { key: 'headOfSecurity',    label: 'Head of Security',   Icon: Shield },
                        { key: 'settlement',        label: 'Settlement Contact', Icon: DollarSign },
                        { key: 'productionManager', label: 'Production Manager', Icon: Wrench },
                      ] as const).map(({ key, label, Icon }) => {
                        const c = show.dayOfShowContacts![key]
                        if (!c?.name && !c?.phone && !c?.email) return null
                        return (
                          <div key={key} className="border border-amber-200 rounded-xl p-4 bg-amber-50">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-md bg-amber-200 flex items-center justify-center shrink-0">
                                <Icon size={11} className="text-amber-800" />
                              </div>
                              <span className="text-xs font-black text-gray-600 uppercase tracking-wide">{label}</span>
                            </div>
                            {c.name  && <p className="text-sm font-bold text-gray-900">{c.name}</p>}
                            {c.phone && (
                              <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-sm text-amber-700 font-semibold mt-1 hover:underline">
                                <Phone size={11} />{c.phone}
                              </a>
                            )}
                            {c.email && (
                              <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-sm text-amber-700 font-semibold mt-1 hover:underline">
                                <Mail size={11} />{c.email}
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Cancel / Postpone confirm modal */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
              {show?.buyerEmail
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
