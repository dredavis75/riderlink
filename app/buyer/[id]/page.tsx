'use client'

import { useState, useEffect, use } from 'react'
import { CheckCircle2, XCircle, RefreshCw, Clock, Send, ChevronDown, ChevronUp, Loader2, Download, Zap } from 'lucide-react'
import { MOCK_SHOWS, type RiderItem, type ItemStatus, type Show } from '@/lib/data'
import { getShow, updateItem as dbUpdateItem, sendMessage as dbSendMessage, subscribeToShow, approveRider } from '@/lib/db'
import { isConfigured } from '@/lib/supabase'
import type { NotifyPayload } from '@/app/api/notify/route'

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

  return (
    <div className="min-h-screen bg-gray-50">
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
            <a
              href={`/api/pdf/${show.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all"
            >
              <Download size={13} /> PDF
            </a>
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
            <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-3">
              Review each item below and mark it confirmed, unavailable, or substituted. When done, approve the full rider at the bottom.
            </p>

            {/* Rider items by category */}
            {Object.entries(grouped).map(([category, catItems]) => (
              <div key={category} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <h2 className="font-bold text-sm text-gray-700 uppercase tracking-wider">{category}</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {catItems.map(item => {
                    const isExpanded = expandedItem === item.id
                    const statusOpt = BUYER_STATUS_OPTIONS.find(o => o.value === item.status) ?? BUYER_STATUS_OPTIONS[3]

                    return (
                      <div key={item.id} className="px-5 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm">{item.name}</div>
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
                              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
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
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h2 className="font-bold text-sm text-gray-700 uppercase tracking-wider">Message Tour Manager</h2>
              </div>
              <div className="p-4">
                {messages.length > 0 && (
                  <div className="mb-3 space-y-2 max-h-48 overflow-y-auto">
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.from === 'buyer' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs rounded-2xl px-3 py-2 text-sm ${msg.from === 'buyer' ? 'bg-gray-900 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
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
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-40"
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Received button */}
            <button
              onClick={handleApprove}
              disabled={approving}
              className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-gray-700 transition-colors text-sm tracking-wide disabled:opacity-40 flex items-center justify-center gap-2"
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
