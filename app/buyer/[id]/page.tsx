'use client'

import { useState, useEffect, use } from 'react'
import { CheckCircle2, XCircle, RefreshCw, Clock, Send, ChevronDown, ChevronUp, Loader2, Download, Zap, Users, X } from 'lucide-react'
import { MOCK_SHOWS, OFFICIAL_RIDER_PDFS, type RiderItem, type ItemStatus, type Show } from '@/lib/data'
import { getShow, updateItem as dbUpdateItem, sendMessage as dbSendMessage, subscribeToShow, approveRider } from '@/lib/db'
import { isConfigured } from '@/lib/supabase'
import type { NotifyPayload } from '@/app/api/notify/route'
import ProductImage from '@/app/components/ProductImage'

function groupByCategory(items: RiderItem[]) {
  return items.reduce<Record<string, RiderItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})
}

const BUYER_STATUS_OPTIONS: { value: ItemStatus; label: string; color: string }[] = [
  { value: 'confirmed',   label: 'Confirmed',   color: 'text-green-600 bg-green-50 border-green-300' },
  { value: 'unavailable', label: 'Unavailable',  color: 'text-red-600 bg-red-50 border-red-300' },
  { value: 'substituted', label: 'Substituting', color: 'text-blue-600 bg-blue-50 border-blue-300' },
  { value: 'pending',     label: 'Pending',      color: 'text-gray-500 bg-gray-50 border-gray-300' },
]

async function notify(payload: NotifyPayload) {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {}
}

function ShareWithTeam({ show }: { show: Show }) {
  const [open, setOpen]       = useState(false)
  const [emails, setEmails]   = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult]   = useState<string | null>(null)

  async function send() {
    const list = emails.split(/[\s,;]+/).map(e => e.trim()).filter(e => e.includes('@'))
    if (!list.length) { setResult('Enter at least one valid email'); return }
    setSending(true); setResult(null)
    try {
      const res = await fetch('/api/share-rider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: list,
          showId: show.id,
          artistName: show.artist,
          venue: show.venue,
          city: show.city,
          date: show.date,
          senderName: show.buyerName,
        }),
      })
      const data = await res.json()
      setResult(`✓ Sent to ${data.sent} ${data.sent === 1 ? 'person' : 'people'}`)
      setEmails('')
    } catch {
      setResult('Send failed — try again')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2"><Users size={14} /> Share with Your Team</span>
        {open ? <X size={14} className="text-gray-400" /> : <span className="text-xs text-gray-400">Add team members →</span>}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs text-gray-500">Enter email addresses separated by commas. They'll receive a link to this rider page.</p>
          <textarea
            value={emails}
            onChange={e => setEmails(e.target.value)}
            placeholder="john@venue.com, sarah@venue.com"
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={send}
              disabled={sending || !emails.trim()}
              className="flex items-center gap-2 bg-gray-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Send Access
            </button>
            {result && <span className={`text-xs font-semibold ${result.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{result}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BuyerPortal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [show, setShow] = useState<Show | null>(null)
  const [items, setItems] = useState<RiderItem[]>([])
  const [messages, setMessages] = useState<Show['messages']>([])
  const [loading, setLoading] = useState(true)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(false)
  const [approvedAt, setApprovedAt] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (isConfigured) {
        const data = await getShow(id)
        if (data) {
          setShow(data)
          setItems(data.items)
          setMessages(data.messages)
          if (data.buyerApprovedAt) {
            setApproved(true)
            setApprovedAt(data.buyerApprovedAt)
          }
        }
      } else {
        const mock = MOCK_SHOWS.find(s => s.id === id) ?? null
        setShow(mock)
        setItems(mock?.items ?? [])
        setMessages(mock?.messages ?? [])
      }
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!isConfigured) return
    const unsub = subscribeToShow(id, async () => {
      const data = await getShow(id)
      if (data) setMessages(data.messages)
    })
    return unsub
  }, [id])

  async function handleStatusChange(item: RiderItem, status: ItemStatus) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status } : i))
    if (isConfigured) {
      try { await dbUpdateItem(item.id, { status }) } catch {}
    }
    if (status === 'unavailable' || status === 'substituted') setExpandedItem(item.id)
  }

  async function handleNoteChange(item: RiderItem, note: string) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, buyerNote: note } : i))
    if (isConfigured) {
      try { await dbUpdateItem(item.id, { buyer_note: note }) } catch {}
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !show) return
    setSending(true)
    const text = newMessage.trim()
    setNewMessage('')

    if (isConfigured) {
      try {
        const msg = await dbSendMessage(show.id, 'buyer', show.buyerName, text)
        setMessages(prev => [...prev, msg])
      } catch {}
    } else {
      setMessages(prev => [...prev, {
        id: `m${Date.now()}`,
        from: 'buyer',
        sender: show.buyerName,
        text,
        timestamp: new Date().toISOString(),
      }])
    }

    notify({
      type: 'buyer_message',
      showId: show.id,
      artistName: show.artist,
      venue: show.venue,
      city: show.city,
      date: show.date,
      buyerName: show.buyerName,
      messageText: text,
    })

    setSending(false)
  }

  async function handleApprove() {
    if (!show) return
    setApproving(true)

    if (isConfigured) {
      try { await approveRider(show.id, show.buyerName) } catch {}
    }

    const now = new Date().toISOString()
    setApproved(true)
    setApprovedAt(now)

    notify({
      type: 'rider_submitted',
      showId: show.id,
      artistName: show.artist,
      venue: show.venue,
      city: show.city,
      date: show.date,
      buyerName: show.buyerName,
      flaggedItems: items
        .filter(i => i.status === 'unavailable' || i.status === 'substituted')
        .map(i => ({ name: i.name, status: i.status, note: i.buyerNote })),
      confirmedCount: items.filter(i => i.status === 'confirmed').length,
      totalCount: items.length,
    })

    setApproving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (!show) {
    return <div className="p-8 text-center text-gray-500">This rider link is not valid or has expired.</div>
  }

  const grouped = groupByCategory(items)
  const confirmed = items.filter(i => i.status === 'confirmed').length
  const total = items.length
  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0

  // Prefer dynamically uploaded PDF, fall back to static mapping
  const officialPdfUrl = show.riderPdfUrl ?? (() => {
    const al = (show.artist ?? '').toLowerCase()
    const key = Object.keys(OFFICIAL_RIDER_PDFS).find(k => {
      const kl = k.toLowerCase()
      return kl === al || al.includes(kl) || kl.includes(al)
    })
    return key ? OFFICIAL_RIDER_PDFS[key] : null
  })()

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="relative bg-gray-950 overflow-hidden">
        <div className="absolute inset-0 dot-grid" />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-transparent to-black/60 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-5 py-7">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
                  <Zap size={14} className="text-gray-950" fill="currentColor" />
                </div>
                <span className="text-xs font-black text-amber-500 tracking-widest uppercase">Show Rider{show.riderVersion ? ` · v${show.riderVersion}` : ''}</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-1">{show.artist}</h1>
              <p className="text-gray-300 text-sm">{show.venue} · {show.city}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {new Date(show.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          {!approved && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>{confirmed} of {total} items responded</span>
                <span className="font-bold text-gray-300">{pct}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full fill-bar" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {/* Official rider PDF — merge route handles 1 or many PDFs */}
          <a
            href={`/api/merge-rider/${show.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex items-center justify-between gap-4 bg-white/10 hover:bg-white/15 text-white rounded-2xl px-4 py-3 transition-all group border border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                <Download size={16} className="text-gray-950" />
              </div>
              <div>
                <div className="font-black text-sm">Download Official Rider</div>
                <div className="text-xs text-white/50 mt-0.5">{show.artist} · Full rider document · PDF</div>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-400 shrink-0">Download →</span>
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">

        {/* Already received — confirmation state */}
        {approved ? (
          <div className="bg-gray-900 text-white rounded-2xl p-8 text-center">
            <CheckCircle2 size={44} className="text-green-400 mx-auto mb-3" />
            <h2 className="text-lg font-black mb-1">Rider Received</h2>
            <p className="text-sm text-gray-300 mb-1">
              Confirmed by <strong>{show.buyerName}</strong>
            </p>
            {approvedAt && (
              <p className="text-xs text-gray-400">
                {new Date(approvedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                {' at '}
                {new Date(approvedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-3">
              The tour manager has been notified.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
              Review each item below and mark it confirmed, unavailable, or substituted. When done, approve the full rider at the bottom.
            </p>

            {/* Rider items by category */}
            {Object.entries(grouped).map(([category, catItems]) => (
              <div key={category} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="px-5 py-3 bg-gray-800 border-b border-gray-700">
                  <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wider">{category}</h2>
                </div>
                <div className="divide-y divide-gray-800">
                  {catItems.map(item => {
                    const isExpanded = expandedItem === item.id
                    const statusOpt = BUYER_STATUS_OPTIONS.find(o => o.value === item.status) ?? BUYER_STATUS_OPTIONS[3]

                    return (
                      <div key={item.id} className="px-5 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <ProductImage name={item.name} category={item.category} size={80} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white text-sm">{item.name}</div>
                            <div className="text-xs text-gray-400">{item.quantity}{item.notes ? ` · ${item.notes}` : ''}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={item.status}
                              onChange={e => handleStatusChange(item, e.target.value as ItemStatus)}
                              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer focus:outline-none ${statusOpt.color}`}
                            >
                              {BUYER_STATUS_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            <button onClick={() => setExpandedItem(isExpanded ? null : item.id)} className="text-gray-400 hover:text-gray-600">
                              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-3">
                            <input
                              placeholder={item.status === 'substituted' ? 'What can you substitute?' : 'Add a note for the tour manager…'}
                              value={item.buyerNote}
                              onChange={e => handleNoteChange(item, e.target.value)}
                              className="w-full text-sm bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Message thread */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-5 py-3 bg-gray-800 border-b border-gray-700">
                <h2 className="font-bold text-sm text-gray-300 uppercase tracking-wider">Message Tour Manager</h2>
              </div>
              <div className="p-4">
                {messages.length > 0 && (
                  <div className="mb-3 space-y-2 max-h-48 overflow-y-auto">
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.from === 'buyer' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs rounded-2xl px-3 py-2 text-sm ${msg.from === 'buyer' ? 'bg-amber-500/20 text-white border border-amber-500/30 rounded-br-sm' : 'bg-gray-800 text-white rounded-bl-sm'}`}>
                          <div className="text-xs opacity-60 font-semibold mb-0.5">{msg.sender}</div>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Send a message…"
                    className="flex-1 text-sm bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="bg-amber-500 hover:bg-amber-400 text-gray-950 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40"
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Share with Team */}
            <ShareWithTeam show={show} />

            {/* Received button */}
            <button
              onClick={handleApprove}
              disabled={approving}
              className="w-full bg-amber-500 hover:bg-amber-400 text-gray-950 font-black py-4 rounded-2xl transition-colors text-sm tracking-wide disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
            >
              {approving
                ? <><Loader2 size={15} className="animate-spin" /> Confirming…</>
                : <><CheckCircle2 size={16} /> Confirm Rider Received</>
              }
            </button>
          </>
        )}
      </div>
    </div>
  )
}
