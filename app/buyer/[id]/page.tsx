'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, RefreshCw, Clock, Send, ChevronDown, ChevronUp, Loader2, Download, Zap, Users, X, Phone, Mail, FileText, Upload, Shield, Music, DollarSign, Wrench, AlertTriangle, ArrowLeft } from 'lucide-react'
import { MOCK_SHOWS, OFFICIAL_RIDER_PDFS, type RiderItem, type ItemStatus, type Show, type DayOfShowContacts } from '@/lib/data'
import { getShow, updateItem as dbUpdateItem, sendMessage as dbSendMessage, subscribeToShow, approveRider, saveShowDayOfShow, getAllManagementContacts, type ManagementContact } from '@/lib/db'
import { supabase, isConfigured } from '@/lib/supabase'
import type { NotifyPayload } from '@/app/api/notify/route'
import ProductImage from '@/app/components/ProductImage'
import ArtistAvatar from '@/app/components/ArtistAvatar'

const ARTIST_COLORS: Record<string, string> = {
  'G Herbo':     'from-emerald-600 to-emerald-800',
  'SKRILLA':     'from-violet-600 to-violet-800',
  'Keyshia Cole':'from-rose-600 to-rose-800',
  'Flo Milli':   'from-amber-500 to-amber-700',
  'Tink':        'from-pink-600 to-pink-800',
  'K. Michelle': 'from-teal-600 to-teal-800',
  'RL':          'from-blue-600 to-blue-800',
}

const CATEGORY_ORDER = [
  'Dressing Room',
  'Food',
  'Beverages',
  'Production Office',
  'Dancers Room',
  'Band Room',
  'Essentials',
  'Dinner',
  'Security',
  'Venue',
  'Production',
  'Transportation',
  'Hotel',
  'Other',
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

const BUYER_STATUS_OPTIONS: { value: ItemStatus; label: string; color: string }[] = [
  { value: 'confirmed',   label: 'Confirmed',   color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
  { value: 'unavailable', label: 'Unavailable',  color: 'text-red-700 bg-red-50 border-red-300' },
  { value: 'substituted', label: 'Substituting', color: 'text-blue-700 bg-blue-50 border-blue-300' },
  { value: 'pending',     label: 'Pending',      color: 'text-amber-700 bg-amber-50 border-amber-300' },
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
              className="flex items-center gap-2 bg-white text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors"
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

const EMPTY_CONTACT = { name: '', phone: '', email: '' }

function ContactCard({ icon: Icon, role, value, onChange }: {
  icon: React.FC<{ size?: number; className?: string }>
  role: string
  value: { name: string; phone: string; email: string }
  onChange: (v: { name: string; phone: string; email: string }) => void
}) {
  return (
    <div className="bg-white border border-amber-200 rounded-2xl p-4 space-y-2.5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <Icon size={13} className="text-amber-700" />
        </div>
        <span className="text-xs font-black text-gray-700 uppercase tracking-wider">{role}</span>
      </div>
      <input
        placeholder="Full name"
        value={value.name}
        onChange={e => onChange({ ...value, name: e.target.value })}
        className="w-full text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-gray-400 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <Phone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Phone"
            value={value.phone}
            onChange={e => onChange({ ...value, phone: e.target.value })}
            className="w-full text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-gray-400 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="relative">
          <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Email"
            value={value.email}
            onChange={e => onChange({ ...value, email: e.target.value })}
            className="w-full text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-gray-400 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>
    </div>
  )
}

function DayOfShowSection({ show, onNotify }: { show: Show; onNotify: (p: NotifyPayload) => void }) {
  const [rosMode, setRosMode] = useState<'text' | 'pdf'>('text')
  const [rosText, setRosText] = useState(show.runOfShowText ?? '')
  const [pdfFiles, setPdfFiles] = useState<File[]>([])
  const [extraFiles, setExtraFiles] = useState<File[]>([])
  const [hasCurfew, setHasCurfew] = useState<boolean>(!!show.curfew && show.curfew !== 'none')
  const [curfewTime, setCurfewTime] = useState(show.curfew && show.curfew !== 'none' ? show.curfew : '')
  const [contacts, setContacts] = useState<DayOfShowContacts>(() => show.dayOfShowContacts ?? {
    artistRelations:   { ...EMPTY_CONTACT },
    headOfSecurity:    { ...EMPTY_CONTACT },
    settlement:        { ...EMPTY_CONTACT },
    productionManager: { ...EMPTY_CONTACT },
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function uploadFile(file: File, prefix: string): Promise<{ name: string; url: string }> {
    const path = `${prefix}/${show.id}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`
    const { error: upErr } = await supabase.storage.from('rider-pdfs').upload(path, file, { contentType: 'application/pdf', upsert: true })
    if (upErr) throw new Error(`Upload failed for ${file.name}: ${upErr.message}`)
    return { name: file.name, url: supabase.storage.from('rider-pdfs').getPublicUrl(path).data.publicUrl }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      let pdfUrl: string | undefined
      let attachments: { name: string; url: string }[] = []

      if (rosMode === 'pdf' && pdfFiles.length > 0) {
        const results = await Promise.all(pdfFiles.map(f => uploadFile(f, 'run-of-show')))
        pdfUrl = results[0]?.url
        attachments = results
      }

      if (extraFiles.length > 0) {
        const extras = await Promise.all(extraFiles.map(f => uploadFile(f, 'buyer-docs')))
        attachments = [...attachments, ...extras]
      }

      if (isConfigured) {
        await saveShowDayOfShow(show.id, {
          runOfShowText: rosMode === 'text' ? rosText : undefined,
          runOfShowPdfUrl: pdfUrl,
          curfew: hasCurfew ? curfewTime : 'none',
          dayOfShowContacts: contacts,
          buyerAttachments: attachments.length > 0 ? attachments : undefined,
        })
      }

      onNotify({
        type: 'day_of_show_submitted',
        showId: show.id,
        artistName: show.artist,
        venue: show.venue,
        city: show.city,
        date: show.date,
        buyerName: show.buyerName,
        curfew: hasCurfew ? curfewTime : '',
        runOfShowText: rosMode === 'text' ? rosText : undefined,
        runOfShowPdfUrl: pdfUrl,
        dayOfShowContacts: contacts,
      })

      setSubmitted(true)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-white border border-amber-200 rounded-2xl p-6 text-center space-y-2">
        <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
        <p className="font-black text-gray-900">Day of Show Info Sent</p>
        <p className="text-sm text-gray-500">Tour manager has been notified.</p>
        <button onClick={() => setSubmitted(false)} className="text-xs text-amber-700 font-bold hover:underline mt-1">Edit</button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 bg-amber-50 border-b border-amber-200">
        <h2 className="font-black text-sm text-gray-700 uppercase tracking-wider">Day of Show Info</h2>
        <p className="text-xs text-gray-500 mt-0.5">Run of show, curfew, and key contacts for the tour manager</p>
      </div>

      <div className="p-4 sm:p-5 space-y-6">
        {/* ── Run of Show ── */}
        <div>
          <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">Run of Show</p>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setRosMode('text')}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-all ${rosMode === 'text' ? 'bg-amber-500 text-gray-950' : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50'}`}>
              <FileText size={12} /> Type it in
            </button>
            <button onClick={() => setRosMode('pdf')}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-all ${rosMode === 'pdf' ? 'bg-amber-500 text-gray-950' : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50'}`}>
              <Upload size={12} /> Upload PDF
            </button>
          </div>

          {rosMode === 'text' ? (
            <textarea
              value={rosText}
              onChange={e => setRosText(e.target.value)}
              placeholder={`6:00 PM — Doors open\n7:00 PM — Support act on stage\n8:00 PM — Support off\n8:30 PM — ${show.artist} on stage\n10:00 PM — ${show.artist} off\n10:15 PM — Venue clear`}
              rows={7}
              className="w-full text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none font-mono leading-relaxed"
            />
          ) : (
            <div className="space-y-2">
              {pdfFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                  <FileText size={14} className="text-amber-600 shrink-0" />
                  <span className="text-sm text-gray-700 flex-1 truncate">{f.name}</span>
                  <button onClick={() => setPdfFiles(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 p-1">
                    <X size={13} />
                  </button>
                </div>
              ))}
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-amber-300 rounded-xl p-5 cursor-pointer hover:bg-amber-50 transition-colors">
                <Upload size={18} className="text-amber-500" />
                <span className="text-sm font-bold text-gray-700">{pdfFiles.length === 0 ? 'Add run of show PDF' : 'Add another PDF'}</span>
                <input type="file" accept=".pdf" multiple className="hidden"
                  onChange={e => setPdfFiles(prev => [...prev, ...Array.from(e.target.files ?? [])])} />
              </label>
            </div>
          )}
        </div>

        {/* ── Additional Documents ── */}
        <div>
          <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-1">Additional Documents</p>
          <p className="text-xs text-gray-400 mb-3">Venue maps, catering menus, contracts, anything else</p>
          <div className="space-y-2">
            {extraFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                <FileText size={14} className="text-amber-600 shrink-0" />
                <span className="text-sm text-gray-700 flex-1 truncate">{f.name}</span>
                <button onClick={() => setExtraFiles(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 p-1">
                  <X size={13} />
                </button>
              </div>
            ))}
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-amber-300 rounded-xl p-4 cursor-pointer hover:bg-amber-50 transition-colors">
              <Upload size={16} className="text-amber-500" />
              <span className="text-sm font-bold text-gray-700">Add PDF files</span>
              <input type="file" accept=".pdf" multiple className="hidden"
                onChange={e => setExtraFiles(prev => [...prev, ...Array.from(e.target.files ?? [])])} />
            </label>
          </div>
        </div>

        {/* ── Curfew ── */}
        <div>
          <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">Venue Curfew</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              <button onClick={() => { setHasCurfew(false); setCurfewTime('') }}
                className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all ${!hasCurfew ? 'bg-emerald-500 text-white' : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50'}`}>
                No Curfew
              </button>
              <button onClick={() => setHasCurfew(true)}
                className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl transition-all ${hasCurfew ? 'bg-red-500 text-white' : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50'}`}>
                <Clock size={12} /> Has Curfew
              </button>
            </div>
            {hasCurfew && (
              <input type="text" placeholder="e.g. 11:00 PM" value={curfewTime}
                onChange={e => setCurfewTime(e.target.value)}
                className="text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-gray-400 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 w-36"
                autoFocus />
            )}
          </div>
        </div>

        {/* ── Day of Show Contacts ── */}
        <div>
          <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">Day of Show Contacts</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ContactCard icon={Music}      role="Artist Relations"   value={contacts.artistRelations}   onChange={v => setContacts(c => ({ ...c, artistRelations: v }))} />
            <ContactCard icon={Shield}     role="Head of Security"   value={contacts.headOfSecurity}    onChange={v => setContacts(c => ({ ...c, headOfSecurity: v }))} />
            <ContactCard icon={DollarSign} role="Settlement Contact" value={contacts.settlement}        onChange={v => setContacts(c => ({ ...c, settlement: v }))} />
            <ContactCard icon={Wrench}     role="Production Manager" value={contacts.productionManager} onChange={v => setContacts(c => ({ ...c, productionManager: v }))} />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-black py-4 rounded-2xl transition-colors text-sm tracking-wide disabled:opacity-40 flex items-center justify-center gap-2">
          {submitting
            ? <><Loader2 size={14} className="animate-spin" /> Uploading & Sending…</>
            : <><Send size={14} /> Send Day of Show Info</>}
        </button>
      </div>
    </div>
  )
}

export default function BuyerPortal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const isAdmin = searchParams.get('admin') === '1'

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
  const [introDismissed, setIntroDismissed] = useState(false)
  const [mgmtContacts, setMgmtContacts] = useState<ManagementContact[]>([])

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
          const contacts = await getAllManagementContacts()
          setMgmtContacts(contacts[data.artist] ?? [])
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
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (!show) {
    return <div className="p-8 text-center text-gray-500">This rider link is not valid or has expired.</div>
  }

  if (!introDismissed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-gray-950 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="relative z-10 max-w-lg w-full text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img src="/logo.png" alt="RiderLink" className="w-16 h-16 rounded-2xl shadow-xl shadow-amber-500/20 object-cover" />
          </div>

          {/* Artist + Venue */}
          <div>
            <p className="text-xs font-black tracking-widest text-amber-500 uppercase mb-2">Official Rider Package</p>
            <h1 className="text-4xl font-black text-white leading-tight mb-1">{show.artist}</h1>
            <p className="text-lg text-gray-300 font-semibold">{show.venue}</p>
            <p className="text-sm text-gray-500 mt-1">{show.city} &nbsp;·&nbsp; {new Date(show.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          {/* Divider */}
          <div className="border-t border-amber-500/20" />

          {/* Thank you + intro copy */}
          <div className="space-y-4 text-left bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-white font-semibold text-base leading-relaxed">
              Thank you for having {show.artist} at {show.venue}.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              This page contains the official rider for this engagement. Please review each item carefully and mark it as <span className="text-emerald-400 font-semibold">Confirmed</span>, <span className="text-red-400 font-semibold">Unavailable</span>, or <span className="text-blue-400 font-semibold">Substituted</span>.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              If you need to substitute an item, please leave a note explaining what you&apos;ll provide instead. Once all items have been reviewed, you&apos;ll be able to approve and submit the rider.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Questions or concerns? Use the message thread at the bottom of the page to communicate directly with the team.
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={() => setIntroDismissed(true)}
            className="w-full bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-base px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-amber-500/20"
          >
            Review Rider →
          </button>

          {/* Footer */}
          <p className="text-xs text-gray-600">Powered by RiderLink · Blue Alley Touring</p>
        </div>
      </div>
    )
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

  const gradient = ARTIST_COLORS[show.artist] ?? 'from-gray-700 to-gray-900'

  return (
    <div className="min-h-screen bg-transparent">
      {/* Admin back button */}
      {isAdmin && (
        <a href={`/show/${id}`}
          className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-gray-950 border border-amber-500 text-amber-400 font-bold text-xs px-3 py-2 rounded-xl shadow-lg hover:bg-amber-500 hover:text-gray-950 transition-all">
          <ArrowLeft size={13} /> Back to Portal
        </a>
      )}
      {/* Header — crowd banner + artist tint */}
      <div className="relative overflow-hidden" style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1400&auto=format&fit=crop&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`} />
        <div className="absolute inset-0 bg-black/55 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-5 py-7">
          <div className="flex items-start gap-4 mb-5">
            <ArtistAvatar artist={show.artist} size={96} rounded="rounded-2xl" className="shadow-xl shadow-black/30 border-2 border-white/20 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <img src="/logo.png" alt="RiderLink" className="w-7 h-7 rounded-lg object-cover shadow shadow-amber-500/30" />
                <span className="text-xs font-black text-amber-400 tracking-widest uppercase">Show Rider{show.riderVersion ? ` · v${show.riderVersion}` : ''}</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-1">{show.artist}</h1>
              <p className="text-white/70 text-sm">{show.venue} · {show.city}</p>
              <p className="text-white/50 text-xs mt-0.5">
                {new Date(show.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          {!approved && (
            <div>
              <div className="flex justify-between text-xs text-white/50 mb-2">
                <span>{confirmed} of {total} items responded</span>
                <span className="font-bold text-white/70">{pct}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full fill-bar" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {/* Official rider PDF */}
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
          <div className="bg-white border border-amber-200 rounded-2xl p-8 text-center">
            <CheckCircle2 size={44} className="text-emerald-500 mx-auto mb-3" />
            <h2 className="text-lg font-black text-gray-900 mb-1">Rider Received</h2>
            <p className="text-sm text-gray-600 mb-1">
              Confirmed by <strong>{show.buyerName}</strong>
            </p>
            {approvedAt && (
              <p className="text-xs text-gray-400">
                {new Date(approvedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                {' at '}
                {new Date(approvedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-3">The tour manager has been notified.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 bg-white border border-amber-200 rounded-xl px-4 py-3">
              Review each item below and mark it confirmed, unavailable, or substituted. When done, approve the full rider at the bottom.
            </p>

            {/* Management contacts — only for artists with entries */}
            {mgmtContacts.length > 0 && (
              <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-amber-200 flex items-center justify-between">
                  <h2 className="font-black text-xs text-gray-500 uppercase tracking-widest">Management</h2>
                  <span className="text-xs font-bold text-gray-400">{mgmtContacts.length} contact{mgmtContacts.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-amber-100">
                  {mgmtContacts.map(m => (
                    <div key={m.email} className="px-5 py-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-amber-500 text-gray-950 flex items-center justify-center font-black text-sm shrink-0">{m.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{m.name}</p>
                        <p className="text-xs text-gray-500">{m.role}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                        {m.phone && <a href={`tel:${m.phone.replace(/\D/g,'')}`} className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold hover:text-amber-900"><Phone size={12} />{m.phone}</a>}
                        {m.email && <a href={`mailto:${m.email}`} className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold hover:text-amber-900"><Mail size={12} />{m.email}</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rider items by category */}
            {sortCategories(Object.keys(grouped)).map(category => { const catItems = grouped[category]; return (
              <div key={category} className="bg-blue-50 rounded-2xl border border-amber-200 border-l-4 border-l-blue-400 overflow-hidden">
                <div className="px-5 py-3 border-b border-amber-200 flex items-center justify-between">
                  <h2 className="font-black text-xs text-gray-500 uppercase tracking-widest">{category}</h2>
                  <span className="text-xs font-bold text-gray-400">{catItems.length} items</span>
                </div>
                <div className="divide-y divide-amber-100">
                  {catItems.map(item => {
                    const isExpanded = expandedItem === item.id
                    const statusOpt = BUYER_STATUS_OPTIONS.find(o => o.value === item.status) ?? BUYER_STATUS_OPTIONS[3]

                    return (
                      <div key={item.id} className="px-5 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <ProductImage name={item.name} category={item.category} size={80} />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.quantity}{item.notes ? ` · ${item.notes}` : ''}</div>
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
                              className="w-full text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-gray-400 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )})}

            {/* Message thread */}
            <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-200">
                <h2 className="font-black text-xs text-gray-500 uppercase tracking-widest">Message Tour Manager</h2>
              </div>
              <div className="p-4">
                {messages.length > 0 && (
                  <div className="mb-3 space-y-2 max-h-48 overflow-y-auto">
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.from === 'buyer' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs rounded-2xl px-3 py-2 text-sm ${msg.from === 'buyer' ? 'bg-amber-100 text-gray-900 border border-amber-200 rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
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
                    className="flex-1 text-sm bg-amber-50 border border-amber-200 text-gray-900 placeholder-gray-400 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
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

            {/* Day of Show Info */}
            <DayOfShowSection show={show} onNotify={notify} />

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
