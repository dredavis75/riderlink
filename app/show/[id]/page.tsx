'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Copy, CheckCircle2, AlertCircle, MessageSquare, Edit3, ExternalLink, Loader2 } from 'lucide-react'
import { MOCK_SHOWS, STATUS_CONFIG, SHOW_STATUS_CONFIG, type RiderItem, type ItemStatus, type Show } from '@/lib/data'
import { getShow, updateItem, sendMessage, subscribeToShow } from '@/lib/db'

function groupByCategory(items: RiderItem[]) {
  return items.reduce<Record<string, RiderItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})
}

export default function ShowDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [show, setShow] = useState<Show | null>(MOCK_SHOWS.find(s => s.id === id) ?? null)
  const [saving, setSaving] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'rider' | 'messages'>('rider')
  const [live, setLive] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getShow(id)
      if (data) { setShow(data); setLive(true) }
    } catch {
      // keep mock
    }
  }, [id])

  useEffect(() => {
    load()
    const unsub = subscribeToShow(id, load)
    return unsub
  }, [id, load])

  if (!show) return <div className="p-8 text-gray-500">Show not found.</div>

  const cfg = SHOW_STATUS_CONFIG[show.status]
  const grouped = groupByCategory(show.items)
  const issueCount = show.items.filter(i => i.status === 'unavailable' || i.status === 'substituted').length
  const unreadBuyer = show.messages.filter(m => m.from === 'buyer').length
  const buyerLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/buyer/${show.id}`

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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 py-4">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3 transition-colors">
            <ArrowLeft size={15} /> All Shows
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-black text-gray-900">{show.artist}</h1>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                {show.riderVersion && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">v{show.riderVersion}</span>}
                {live && <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live</span>}
              </div>
              <p className="text-sm text-gray-500">{show.venue} · {show.city} · {new Date(show.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <p className="text-sm text-gray-400 mt-0.5">Buyer: {show.buyerName} · {show.buyerEmail}</p>
            </div>
            <button onClick={copyLink} className="shrink-0 flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
              {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Buyer Link'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-6">
        {show.buyerApprovedAt && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm text-green-700 font-medium">
            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
            <span>
              Rider received by <strong>{show.buyerApprovedName}</strong>
              {' · '}
              {new Date(show.buyerApprovedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              {' at '}
              {new Date(show.buyerApprovedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        )}
        {issueCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-2 text-sm text-red-700 font-medium">
            <AlertCircle size={15} />
            {issueCount} item{issueCount > 1 ? 's' : ''} flagged by buyer — review below.
          </div>
        )}

        <div className="flex gap-2 mb-6 items-center">
          <button onClick={() => setActiveTab('rider')}
            className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${activeTab === 'rider' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            Rider Items
          </button>
          <button onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${activeTab === 'messages' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            <MessageSquare size={13} /> Messages
            {unreadBuyer > 0 && <span className="bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{unreadBuyer}</span>}
          </button>
          <a href={`/buyer/${show.id}`} target="_blank" className="ml-auto flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ExternalLink size={13} /> Buyer view
          </a>
        </div>

        {activeTab === 'rider' && (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, catItems]) => (
              <div key={category} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h2 className="font-bold text-sm text-gray-700 uppercase tracking-wider">{category}</h2>
                  <span className="text-xs text-gray-400">{catItems.length} items</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {catItems.map(item => {
                    const sCfg = STATUS_CONFIG[item.status]
                    return (
                      <div key={item.id} className={`px-5 py-4 ${item.status === 'unavailable' ? 'bg-red-50/40' : item.status === 'substituted' ? 'bg-blue-50/40' : ''}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {editingItem === item.id ? (
                              <div className="flex gap-2">
                                <input value={editValue} onChange={e => setEditValue(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)}
                                  className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900" autoFocus />
                                <button onClick={() => saveEdit(item.id)} className="text-sm font-semibold text-green-600">Save</button>
                                <button onClick={() => setEditingItem(null)} className="text-sm text-gray-400">Cancel</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                                <button onClick={() => { setEditingItem(item.id); setEditValue(item.name) }} className="text-gray-300 hover:text-gray-600 transition-colors">
                                  <Edit3 size={12} />
                                </button>
                              </div>
                            )}
                            <span className="text-xs text-gray-400">{item.quantity}{item.notes ? ` · ${item.notes}` : ''}</span>
                            {item.buyerNote && (
                              <div className="mt-2 text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-blue-700">
                                <span className="font-semibold">Buyer:</span> {item.buyerNote}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {saving === item.id && <Loader2 size={13} className="animate-spin text-gray-400" />}
                            <select value={item.status} onChange={e => handleStatusChange(item, e.target.value as ItemStatus)}
                              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${sCfg.bg} ${sCfg.color} cursor-pointer focus:outline-none`}>
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
            ))}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-5 space-y-3 overflow-y-auto" style={{ minHeight: 300, maxHeight: 420 }}>
              {show.messages.length === 0 && (
                <div className="text-center text-gray-400 text-sm pt-12">No messages yet. Send the buyer link to start the conversation.</div>
              )}
              {show.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.from === 'manager' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${msg.from === 'manager' ? 'bg-gray-900 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                    <div className="font-semibold text-xs mb-1 opacity-60">{msg.sender}</div>
                    {msg.text}
                    <div className="text-xs mt-1 opacity-40">{new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 p-4 flex gap-3">
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Message the buyer..."
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
