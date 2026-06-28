'use client'

import { useState, useEffect, use } from 'react'
import { CheckCircle2, XCircle, RefreshCw, Clock, Send, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { MOCK_SHOWS, type RiderItem, type ItemStatus, type Show } from '@/lib/data'
import { getShow, updateItem as dbUpdateItem, sendMessage as dbSendMessage, subscribeToShow } from '@/lib/db'
import { isConfigured } from '@/lib/supabase'
import type { NotifyPayload } from '@/app/api/notify/route'

function groupByCategory(items: RiderItem[]) {
  return items.reduce<Record<string, RiderItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})
}

const BUYER_STATUS_OPTIONS: { value: ItemStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'confirmed',   label: 'Confirmed',   icon: <CheckCircle2 size={14} />, color: 'text-green-600 bg-green-50 border-green-300' },
  { value: 'unavailable', label: 'Unavailable',  icon: <XCircle size={14} />,      color: 'text-red-600 bg-red-50 border-red-300' },
  { value: 'substituted', label: 'Substituting', icon: <RefreshCw size={14} />,    color: 'text-blue-600 bg-blue-50 border-blue-300' },
  { value: 'pending',     label: 'Pending',      icon: <Clock size={14} />,         color: 'text-gray-500 bg-gray-50 border-gray-300' },
]

async function notify(payload: NotifyPayload) {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // notifications are best-effort
  }
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
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      if (isConfigured) {
        const data = await getShow(id)
        if (data) {
          setShow(data)
          setItems(data.items)
          setMessages(data.messages)
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
      if (data) {
        setMessages(data.messages)
      }
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

  async function handleSubmit() {
    if (!show) return
    setSubmitting(true)

    const flaggedItems = items
      .filter(i => i.status === 'unavailable' || i.status === 'substituted')
      .map(i => ({ name: i.name, status: i.status, note: i.buyerNote }))

    notify({
      type: 'rider_submitted',
      showId: show.id,
      artistName: show.artist,
      venue: show.venue,
      city: show.city,
      date: show.date,
      buyerName: show.buyerName,
      flaggedItems,
      confirmedCount: items.filter(i => i.status === 'confirmed').length,
      totalCount: items.length,
    })

    setSubmitted(true)
    setSubmitting(false)
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
      <div className="bg-gray-900 text-white">
        <div className="max-w-2xl mx-auto px-5 py-6">
          <div className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Hospitality Rider</div>
          <h1 className="text-2xl font-black tracking-tight mb-1">{show.artist}</h1>
          <p className="text-gray-300 text-sm">{show.venue} · {show.city}</p>
          <p className="text-gray-400 text-sm">
            {new Date(show.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <div className="mt-5">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>{confirmed} of {total} items confirmed</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
            <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Response submitted!</h2>
            <p className="text-sm text-gray-500">The tour manager has been notified. They may follow up if any items need clarification.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-3">
              Please confirm each item below. If something is unavailable, mark it and leave a note with what you can offer instead.
            </p>

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
                              placeholder={item.status === 'substituted' ? 'What can you substitute?' : 'Add a note for the tour manager...'}
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
                    placeholder="Send a message..."
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

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-gray-700 transition-colors text-sm tracking-wide disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 size={15} className="animate-spin" /> Submitting…</> : 'Submit Rider Response'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
