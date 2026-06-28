'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronRight, CheckCircle2, Loader2, MapPin } from 'lucide-react'
import { ARTIST_ROSTER, RIDER_TEMPLATES, type RiderTemplate } from '@/lib/data'
import { createShow } from '@/lib/db'

interface Props {
  onClose: () => void
}

interface Prediction {
  placeId: string
  name: string
  secondary: string
}

const STEPS = ['Details', 'Rider'] as const

export default function NewShowModal({ onClose }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<0 | 1>(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1 fields
  const [artist, setArtist] = useState<string>(ARTIST_ROSTER[0])
  const [venue, setVenue] = useState('')
  const [city, setCity] = useState('')
  const [date, setDate] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')

  // Venue autocomplete
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Buyer autocomplete
  interface PromoterHit { name: string; email: string; venue: string; city: string }
  const [promoterHits, setPromoterHits] = useState<PromoterHit[]>([])
  const [showBuyerDropdown, setShowBuyerDropdown] = useState(false)
  const buyerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const buyerDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
      if (buyerDropdownRef.current && !buyerDropdownRef.current.contains(e.target as Node)) setShowBuyerDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const searchVenues = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) { setPredictions([]); setShowDropdown(false); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setPredictions(data.predictions ?? [])
        setShowDropdown(true)
      } catch {}
      setSearching(false)
    }, 300)
  }, [])

  const searchBuyers = useCallback((q: string) => {
    if (buyerDebounceRef.current) clearTimeout(buyerDebounceRef.current)
    if (q.length < 2) { setPromoterHits([]); setShowBuyerDropdown(false); return }
    buyerDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/promoters?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setPromoterHits(data.promoters ?? [])
        setShowBuyerDropdown(true)
      } catch {}
    }, 250)
  }, [])

  const selectBuyer = (p: { name: string; email: string }) => {
    setBuyerName(p.name)
    setBuyerEmail(p.email)
    setShowBuyerDropdown(false)
    setPromoterHits([])
  }

  const selectVenue = async (p: Prediction) => {
    setVenue(p.name)
    setShowDropdown(false)
    setPredictions([])
    // Fetch city from place details
    try {
      const res = await fetch(`/api/places?placeId=${p.placeId}`)
      const data = await res.json()
      if (data.city) setCity(data.city)
    } catch {}
  }

  // Step 2
  const defaultItems = (): RiderTemplate[] =>
    (RIDER_TEMPLATES[artist] ?? []).map(i => ({ ...i }))

  const [useTemplate, setUseTemplate] = useState(true)
  const [items, setItems] = useState<RiderTemplate[]>(defaultItems)

  const handleArtistChange = (a: string) => {
    setArtist(a)
    setItems((RIDER_TEMPLATES[a] ?? []).map(i => ({ ...i })))
    setUseTemplate(!!(RIDER_TEMPLATES[a]))
  }

  const step1Valid = artist && venue.trim() && city.trim() && date && buyerName.trim() && buyerEmail.trim()

  const goToStep2 = () => {
    if (!step1Valid) return
    setItems(useTemplate ? defaultItems() : [])
    setUseTemplate(!!(RIDER_TEMPLATES[artist]))
    setStep(1)
  }

  const addItem = () =>
    setItems(prev => [...prev, { category: 'Food', name: '', quantity: '', notes: '' }])

  const removeItem = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx))

  const updateItem = (idx: number, field: keyof RiderTemplate, val: string) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item))

  const handleCreate = async () => {
    setSaving(true)
    setError('')
    try {
      const id = await createShow({
        artist,
        venue: venue.trim(),
        city: city.trim(),
        date,
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        status: 'draft',
        items: items.filter(i => i.name.trim()).map(i => ({
          ...i,
          id: '',
          status: 'pending' as const,
          buyerNote: '',
        })),
      })
      router.push(`/show/${id}`)
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong')
      setSaving(false)
    }
  }

  const CATEGORIES = ['Food', 'Beverages', 'Production', 'Essentials', 'Other']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900">New Show</h2>
            <div className="flex items-center gap-2 mt-1">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${i === step ? 'text-gray-900' : i < step ? 'text-green-600' : 'text-gray-400'}`}>
                    {i < step
                      ? <CheckCircle2 size={13} className="text-green-500" />
                      : <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${i === step ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</span>
                    }
                    {s}
                  </div>
                  {i < STEPS.length - 1 && <ChevronRight size={12} className="text-gray-300" />}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {step === 0 && (
            <div className="space-y-5">
              {/* Artist */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Artist</label>
                <div className="flex flex-wrap gap-2">
                  {ARTIST_ROSTER.map(a => (
                    <button
                      key={a}
                      onClick={() => handleArtistChange(a)}
                      className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all ${
                        artist === a
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                  <input
                    placeholder="Other artist…"
                    value={ARTIST_ROSTER.includes(artist as any) ? '' : artist}
                    onChange={e => handleArtistChange(e.target.value)}
                    className="px-3.5 py-2 rounded-xl text-sm border border-gray-200 placeholder-gray-400 focus:outline-none focus:border-gray-400 min-w-[140px]"
                  />
                </div>
              </div>

              {/* Venue autocomplete */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Venue</label>
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <input
                      value={venue}
                      onChange={e => { setVenue(e.target.value); searchVenues(e.target.value) }}
                      onFocus={() => predictions.length > 0 && setShowDropdown(true)}
                      placeholder="Start typing a venue name or city…"
                      autoComplete="off"
                      className="w-full px-3.5 py-2.5 pr-9 rounded-xl text-sm border border-gray-200 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                    />
                    {searching
                      ? <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-gray-400" />
                      : <MapPin size={14} className="absolute right-3 top-3 text-gray-300" />
                    }
                  </div>

                  {showDropdown && predictions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {predictions.map(p => (
                        <button
                          key={p.placeId}
                          onMouseDown={() => selectVenue(p)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                        >
                          <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                          {p.secondary && <div className="text-xs text-gray-500 mt-0.5">{p.secondary}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* City — auto-filled but editable */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">City</label>
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Auto-filled when you pick a venue"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-gray-200 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Show Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-gray-400"
                />
              </div>

              {/* Buyer */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Buyer / Promoter</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative" ref={buyerDropdownRef}>
                    <input
                      value={buyerName}
                      onChange={e => { setBuyerName(e.target.value); searchBuyers(e.target.value) }}
                      onFocus={() => promoterHits.length > 0 && setShowBuyerDropdown(true)}
                      placeholder="Full name"
                      autoComplete="off"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-gray-200 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                    />
                    {showBuyerDropdown && promoterHits.length > 0 && (
                      <div className="absolute z-50 w-72 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        {promoterHits.map((p, i) => (
                          <button
                            key={i}
                            onMouseDown={() => selectBuyer(p)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                          >
                            <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{p.email}</div>
                            <div className="text-xs text-gray-400">{p.venue} · {p.city}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={e => setBuyerEmail(e.target.value)}
                    placeholder="email@venue.com"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-gray-200 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {RIDER_TEMPLATES[artist] && (
                <div className="flex gap-3">
                  <button
                    onClick={() => { setUseTemplate(true); setItems(defaultItems()) }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${useTemplate ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                  >
                    Use {artist} standard rider
                  </button>
                  <button
                    onClick={() => { setUseTemplate(false); setItems([]) }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${!useTemplate ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                  >
                    Start blank
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start bg-gray-50 rounded-xl p-3">
                    <div className="flex-1 grid grid-cols-12 gap-2">
                      <select
                        value={item.category}
                        onChange={e => updateItem(idx, 'category', e.target.value)}
                        className="col-span-3 px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 bg-white focus:outline-none focus:border-gray-400"
                      >
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <input
                        value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)}
                        placeholder="Item name"
                        className="col-span-5 px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                      />
                      <input
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="col-span-2 px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                      />
                      <input
                        value={item.notes}
                        onChange={e => updateItem(idx, 'notes', e.target.value)}
                        placeholder="Notes"
                        className="col-span-2 px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                      />
                    </div>
                    <button onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500 transition-colors mt-1.5">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addItem}
                className="w-full py-2.5 rounded-xl text-sm font-semibold border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all"
              >
                + Add item
              </button>

              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          {step === 1
            ? <button onClick={() => setStep(0)} className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">← Back</button>
            : <div />
          }
          {step === 0 ? (
            <button
              onClick={goToStep2}
              disabled={!step1Valid}
              className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next: Rider <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-40"
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : 'Create Show'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
