'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { Plus, Trash2, Send, Loader2 } from 'lucide-react'
import { type Show, type BuyerContact } from '@/lib/data'
import { addBuyerContact, updateBuyerContact, deleteBuyerContact, markContactInvited } from '@/lib/db'

const ROLE_SUGGESTIONS = ['Buyer', 'Production Manager', 'Hospitality Manager', 'Tour Manager', 'Promoter Rep']

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function statusLabel(invitedAt?: string, openedAt?: string): { text: string; className: string } {
  if (openedAt) return { text: `Opened ${fmt(openedAt)}`, className: 'text-emerald-600' }
  if (invitedAt) return { text: `Sent ${fmt(invitedAt)}`, className: 'text-amber-600' }
  return { text: 'Not sent yet', className: 'text-gray-400' }
}

// Additional buyer-side recipients (production manager, hospitality manager,
// etc.) beyond the primary buyer — each gets their own tracked link.
export default function BuyerContactsPanel({
  show, setShow, artistName, venue, city, date,
}: {
  show: Show
  setShow: Dispatch<SetStateAction<Show | null>>
  artistName: string
  venue: string
  city: string
  date: string
}) {
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [resultById, setResultById] = useState<Record<string, string>>({})

  const contacts = [...show.buyerContacts].sort((a, b) => a.sortOrder - b.sortOrder)

  async function handleAdd() {
    const contact = await addBuyerContact(show.id, { name: '', role: '', email: '' }, contacts.length)
    setShow(prev => prev ? { ...prev, buyerContacts: [...prev.buyerContacts, contact] } : prev)
  }

  async function handlePatch(id: string, fields: Partial<{ name: string; role: string; email: string; phone: string }>) {
    setShow(prev => prev ? { ...prev, buyerContacts: prev.buyerContacts.map(c => c.id === id ? { ...c, ...fields } : c) } : prev)
    try { await updateBuyerContact(id, fields) } catch {}
  }

  async function handleDelete(id: string) {
    setShow(prev => prev ? { ...prev, buyerContacts: prev.buyerContacts.filter(c => c.id !== id) } : prev)
    try { await deleteBuyerContact(id) } catch {}
  }

  async function handleSend(contact: BuyerContact) {
    if (!contact.email.trim()) return
    setSendingId(contact.id)
    setResultById(prev => ({ ...prev, [contact.id]: '' }))
    try {
      const res = await fetch('/api/invite-buyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerName: contact.name, buyerEmail: contact.email, buyerPhone: contact.phone,
          artistName, venue, city, date, showId: show.id, contactId: contact.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Send failed')
      await markContactInvited(contact.id)
      const now = new Date().toISOString()
      setShow(prev => prev ? { ...prev, buyerContacts: prev.buyerContacts.map(c => c.id === contact.id ? { ...c, invitedAt: now } : c) } : prev)
      setResultById(prev => ({ ...prev, [contact.id]: '✓ Sent' }))
    } catch (e: any) {
      setResultById(prev => ({ ...prev, [contact.id]: '✕ ' + e.message }))
    }
    setSendingId(null)
  }

  return (
    <div className="mt-3 pt-3 border-t border-amber-100 space-y-2">
      <datalist id="buyer-contact-roles">
        {ROLE_SUGGESTIONS.map(r => <option key={r} value={r} />)}
      </datalist>

      {contacts.map(contact => {
        const status = statusLabel(contact.invitedAt, contact.openedAt)
        return (
          <div key={contact.id} className="border border-amber-200 rounded-xl p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <input value={contact.name} onChange={e => handlePatch(contact.id, { name: e.target.value })}
                placeholder="Name"
                className="text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-gray-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <input value={contact.role} onChange={e => handlePatch(contact.id, { role: e.target.value })}
                placeholder="Role (e.g. Production Manager)" list="buyer-contact-roles"
                className="text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-gray-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <input value={contact.email} onChange={e => handlePatch(contact.id, { email: e.target.value })}
                placeholder="Email" type="email"
                className="text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-gray-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <input value={contact.phone ?? ''} onChange={e => handlePatch(contact.id, { phone: e.target.value })}
                placeholder="Phone (optional)" type="tel"
                className="text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-gray-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => handleSend(contact)} disabled={sendingId === contact.id || !contact.email.trim()}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 disabled:opacity-40 transition-colors shrink-0">
                {sendingId === contact.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Send
              </button>
              <span className={`text-xs font-semibold text-center flex-1 ${status.className}`}>{resultById[contact.id] || status.text}</span>
              <button onClick={() => handleDelete(contact.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )
      })}

      <button onClick={handleAdd} className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors">
        <Plus size={13} /> Add Contact
      </button>
    </div>
  )
}
