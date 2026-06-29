'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Send, Copy, CheckCircle2, AlertCircle,
  MessageSquare, Edit3, ExternalLink, Loader2, Zap, Download,
} from 'lucide-react'
import { MOCK_SHOWS, STATUS_CONFIG, SHOW_STATUS_CONFIG, OFFICIAL_RIDER_PDFS, type RiderItem, type ItemStatus, type Show } from '@/lib/data'
import { getShow, updateItem, sendMessage, subscribeToShow } from '@/lib/db'
import ArtistAvatar from '@/app/components/ArtistAvatar'

const ARTIST_COLORS: Record<string, string> = {
  'G Herbo':     'from-emerald-600 to-emerald-800',
  'SKRILLA':     'from-violet-600 to-violet-800',
  'Keyshia Cole':'from-rose-600 to-rose-800',
  'Flo Milli':   'from-amber-500 to-amber-700',
  'K. Michelle': 'from-teal-600 to-teal-800',
  'RL':          'from-blue-600 to-blue-800',
  'NEXT':        'from-sky-500 to-sky-700',
}

const CATEGORY_COLORS: Record<string, string> = {
  'Dressing Room':    'border-l-rose-400 bg-rose-50/40',
  'Production Office':'border-l-orange-400 bg-orange-50/40',
  'Dinner':           'border-l-amber-400 bg-amber-50/40',
  'Production':       'border-l-violet-400 bg-violet-50/40',
  'Security':         'border-l-red-400 bg-red-50/40',
  'Venue':            'border-l-blue-400 bg-blue-50/40',
  'Transportation':   'border-l-cyan-400 bg-cyan-50/40',
  'Hotel':            'border-l-teal-400 bg-teal-50/40',
  'Food':             'border-l-green-400 bg-green-50/40',
  'Beverages':        'border-l-amber-400 bg-amber-50/40',
  'Essentials':       'border-l-gray-400 bg-gray-50/40',
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

  const [show, setShow]             = useState<Show | null>(MOCK_SHOWS.find(s => s.id === id) ?? null)
  const [saving, setSaving]         = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editValue, setEditValue]   = useState('')
  const [copied, setCopied]         = useState(false)
  const [activeTab, setActiveTab]   = useState<'rider' | 'messages'>('rider')
  const [live, setLive]             = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getShow(id)
      if (data) { setShow(data); setLive(true) }
    } catch { /* keep mock */ }
  }, [id])

  useEffect(() => {
    load()
    const unsub = subscribeToShow(id, load)
    return unsub
  }, [id, load])

  if (!show) return <div className="p-8 text-gray-500">Show not found.</div>

  const cfg        = SHOW_STATUS_CONFIG[show.status]
  const grouped    = groupByCategory(show.items)
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

  async function handleSendMessage() {
    if (!newMessage.trim()) return
    const text = newMessage.trim()
    setNewMessage('')
    const msg = { id: `m${Date.now()}`, from: 'manager' as const, sender: 'Dré Davis', text, timestamp: new Date().toISOString() }
    setShow(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : prev)
    try { await sendMessage(show?.id ?? id, 'manager', 'Dré Davis', text) } catch {}
  }

  function copyLink() {
    navigator.clipboard.writeText(buyerLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero header ── */}
      <div className={`bg-gradient-to-br ${gradient} relative overflow-hidden`}>
        <div className="absolute inset-0 dot-grid" />
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-5 py-5">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm text-white/60 hover:text-white mb-4 transition-colors">
            <ArrowLeft size={15} /> All Shows
          </button>

          <div className="flex items-start gap-4">
            {/* Artist photo */}
            <ArtistAvatar artist={show.artist} size={72} rounded="rounded-2xl" className="shadow-xl shadow-black/30 border-2 border-white/20" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-white/20 text-white">{cfg.label.toUpperCase()}</span>
                {show.riderVersion && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/70">v{show.riderVersion}</span>}
                {live && <span className="flex items-center gap-1 text-[10px] text-emerald-300 font-bold uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</span>}
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">{show.artist}</h1>
              <p className="text-white/70 text-sm mt-1">{show.venue} · {show.city}</p>
              <p className="text-white/50 text-xs mt-0.5">
                {new Date(show.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="text-white/40 text-xs mt-1">Buyer: {show.buyerName} · {show.buyerEmail}</p>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <button onClick={copyLink}
                className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-all">
                {copied ? <><CheckCircle2 size={14} className="text-emerald-400" /> Copied!</> : <><Copy size={14} /> Copy Buyer Link</>}
              </button>
              {(() => {
                const artistLower = show.artist.toLowerCase()
                const pdfKey = Object.keys(OFFICIAL_RIDER_PDFS).find(k =>
                  k.toLowerCase() === artistLower || artistLower.includes(k.toLowerCase().split(' ').at(-1)!)
                )
                return pdfKey ? (
                  <a href={OFFICIAL_RIDER_PDFS[pdfKey]} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 transition-all shadow-lg shadow-amber-500/30">
                    <Download size={14} /> Official Rider PDF
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6 items-center">
          <button onClick={() => setActiveTab('rider')}
            className={`text-sm font-black px-4 py-2 rounded-xl transition-all ${activeTab === 'rider' ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-400'}`}>
            Rider Items
          </button>
          <button onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 text-sm font-black px-4 py-2 rounded-xl transition-all ${activeTab === 'messages' ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-400'}`}>
            <MessageSquare size={13} /> Messages
            {unreadBuyer > 0 && <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-black">{unreadBuyer}</span>}
          </button>
          <a href={`/buyer/${show.id}`} target="_blank"
            className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-700 transition-colors">
            <ExternalLink size={13} /> Buyer view
          </a>
        </div>

        {/* ── Rider tab ── */}
        {activeTab === 'rider' && (
          <div className="space-y-4 animate-slide-up">
            {Object.entries(grouped).map(([category, catItems]) => {
              const catStyle = CATEGORY_COLORS[category] ?? 'border-l-gray-300 bg-white'
              return (
                <div key={category} className={`rounded-2xl border border-gray-100 border-l-4 overflow-hidden ${catStyle}`}>
                  <div className="px-5 py-3 border-b border-gray-100/80 flex items-center justify-between">
                    <h2 className="font-black text-xs text-gray-700 uppercase tracking-widest">{category}</h2>
                    <span className="text-xs font-bold text-gray-400">{catItems.length} items</span>
                  </div>
                  <div className="divide-y divide-gray-100/80">
                    {catItems.map(item => {
                      const sCfg = STATUS_CONFIG[item.status]
                      return (
                        <div key={item.id} className={`px-5 py-4 ${item.status === 'unavailable' ? 'bg-red-50/60' : item.status === 'substituted' ? 'bg-blue-50/60' : ''}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {editingItem === item.id ? (
                                <div className="flex gap-2">
                                  <input value={editValue} onChange={e => setEditValue(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)}
                                    className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900" autoFocus />
                                  <button onClick={() => saveEdit(item.id)} className="text-sm font-bold text-emerald-600">Save</button>
                                  <button onClick={() => setEditingItem(null)} className="text-sm text-gray-400">Cancel</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                                  <button onClick={() => { setEditingItem(item.id); setEditValue(item.name) }} className="text-gray-300 hover:text-gray-600 transition-colors">
                                    <Edit3 size={11} />
                                  </button>
                                </div>
                              )}
                              <span className="text-xs text-gray-400">{item.quantity}{item.notes ? ` · ${item.notes}` : ''}</span>
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
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col animate-slide-up">
            <div className="p-5 space-y-3 overflow-y-auto" style={{ minHeight: 300, maxHeight: 420 }}>
              {show.messages.length === 0 && (
                <div className="text-center text-gray-400 text-sm pt-12">
                  <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
                  No messages yet. Send the buyer link to start.
                </div>
              )}
              {show.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.from === 'manager' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${msg.from === 'manager' ? 'bg-gray-900 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                    <div className="font-black text-xs mb-1 opacity-50">{msg.sender}</div>
                    {msg.text}
                    <div className="text-xs mt-1 opacity-30">{new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 p-4 flex gap-3">
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Message the buyer…"
                className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900" />
              <button onClick={handleSendMessage} className="bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-gray-700 transition-colors">
                <Send size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
