'use client'

import { useState, useEffect, useCallback, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Send, Copy, CheckCircle2, AlertCircle,
  MessageSquare, Edit3, ExternalLink, Loader2, Zap, Download, Sparkles, Trash2,
  Calendar, Phone, Mail, Shield, Music, DollarSign, Wrench, FileText, Clock, Users, XCircle, PauseCircle, X, RotateCcw, Plus, MapPin, Building2, Plane, ImagePlus,
} from 'lucide-react'
import { MOCK_SHOWS, STATUS_CONFIG, SHOW_STATUS_CONFIG, OFFICIAL_RIDER_PDFS, FLIGHT_CLASS_LABELS, type RiderItem, type ItemStatus, type Show, type FlightClass } from '@/lib/data'
import {
  getShow, updateItem, deleteShowItem, sendMessage, subscribeToShow, updateBuyer, updateShowStatus, updateShowVenue, resetShowRiderFromMaster, addShowItem, getAllManagementContacts, type ManagementContact,
  addHotel, updateHotel, deleteHotel, deleteRoomingGuest, addFlight, updateFlight, deleteFlight, updateShowTravelFlags,
  propagateItemImageToMaster,
} from '@/lib/db'
import { supabase } from '@/lib/supabase'
import ArtistAvatar from '@/app/components/ArtistAvatar'
import ProductImage from '@/app/components/ProductImage'
import VenueMap from '@/app/components/VenueMap'
import HotelVenueMap from '@/app/components/HotelVenueMap'
import RoomingListEditor from '@/app/components/RoomingListEditor'

const PARTY_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

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
  const [editQuantity, setEditQuantity]     = useState('')
  const [editNotes, setEditNotes]           = useState('')
  const [uploadingItemImageId, setUploadingItemImageId] = useState<string | null>(null)
  const [itemImageMsg, setItemImageMsg] = useState<{ id: string; ok: boolean } | null>(null)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [addingItemTo, setAddingItemTo]     = useState<string | null>(null)
  const [newItemName, setNewItemName]       = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('')
  const [newItemNotes, setNewItemNotes]     = useState('')
  const [categoryValue, setCategoryValue]   = useState('')
  const [copied, setCopied]           = useState(false)
  const [activeTab, setActiveTab]     = useState<'rider' | 'messages' | 'dayofshow' | 'travel'>('rider')
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
  const [addressOpen, setAddressOpen]     = useState(false)
  const [addressInput, setAddressInput]   = useState('')
  const [lookingUpAddress, setLookingUpAddress] = useState(false)
  const [addressError, setAddressError]   = useState('')
  const [inviting, setInviting]       = useState(false)
  const [inviteResult, setInviteResult] = useState<string | null>(null)
  const [mgmtContacts, setMgmtContacts] = useState<ManagementContact[]>([])
  const [statusModal, setStatusModal] = useState<'cancelled' | 'postponed' | 'restore' | null>(null)
  const [statusReason, setStatusReason] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [riderResetModal, setRiderResetModal] = useState(false)
  const [resettingRider, setResettingRider] = useState(false)
  const [riderResetMsg, setRiderResetMsg] = useState<string | null>(null)

  // Hotels
  const [addingHotel, setAddingHotel] = useState(false)
  const [newHotelName, setNewHotelName] = useState('')
  const [newHotelAddress, setNewHotelAddress] = useState('')
  const [newHotelLat, setNewHotelLat] = useState<number | null>(null)
  const [newHotelLng, setNewHotelLng] = useState<number | null>(null)
  const [lookingUpHotel, setLookingUpHotel] = useState(false)
  const [hotelError, setHotelError] = useState('')
  const [editingHotelId, setEditingHotelId] = useState<string | null>(null)
  const [editHotelName, setEditHotelName] = useState('')
  const [editHotelAddress, setEditHotelAddress] = useState('')
  const [hotelPredictions, setHotelPredictions] = useState<{ placeId: string; name: string; secondary: string }[]>([])
  const [searchingHotels, setSearchingHotels] = useState(false)
  const [showHotelDropdown, setShowHotelDropdown] = useState(false)
  const hotelDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hotelDropdownRef = useRef<HTMLDivElement>(null)

  // Flights
  const [addingFlight, setAddingFlight] = useState(false)
  const [newFlightPassenger, setNewFlightPassenger] = useState('')
  const [newFlightAirline, setNewFlightAirline] = useState('')
  const [newFlightNumber, setNewFlightNumber] = useState('')
  const [newFlightOrigin, setNewFlightOrigin] = useState('')
  const [newFlightDestination, setNewFlightDestination] = useState('')
  const [newFlightDate, setNewFlightDate] = useState('')
  const [newFlightClass, setNewFlightClass] = useState<FlightClass>('coach')
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null)
  const [editFlightPassenger, setEditFlightPassenger] = useState('')
  const [editFlightAirline, setEditFlightAirline] = useState('')
  const [editFlightNumber, setEditFlightNumber] = useState('')
  const [editFlightOrigin, setEditFlightOrigin] = useState('')
  const [editFlightDestination, setEditFlightDestination] = useState('')
  const [editFlightDate, setEditFlightDate] = useState('')
  const [editFlightClass, setEditFlightClass] = useState<FlightClass>('coach')
  const [lookingUpFlight, setLookingUpFlight] = useState(false)
  const [flightLookupError, setFlightLookupError] = useState('')

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

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (hotelDropdownRef.current && !hotelDropdownRef.current.contains(e.target as Node)) setShowHotelDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
    setShow(prev => prev ? { ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, name: editValue, quantity: editQuantity, notes: editNotes } : i) } : prev)
    setEditingItem(null)
    try { await updateItem(itemId, { name: editValue, quantity: editQuantity, notes: editNotes }) } catch {}
  }

  async function handleDeleteItem(itemId: string) {
    setShow(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== itemId) } : prev)
    try { await deleteShowItem(itemId) } catch {}
  }

  async function handleAddItem(category: string) {
    if (!show || !newItemName.trim()) return
    const sortOrder = show.items.length
    try {
      const item = await addShowItem(show.id, {
        category, name: newItemName.trim(), quantity: newItemQuantity.trim(), notes: newItemNotes.trim(),
      }, sortOrder)
      setShow(prev => prev ? { ...prev, items: [...prev.items, item] } : prev)
      setAddingItemTo(null)
      setNewItemName(''); setNewItemQuantity(''); setNewItemNotes('')
    } catch { /* keep form open on failure */ }
  }

  async function handleUploadItemImage(itemId: string, itemName: string, file: File) {
    setUploadingItemImageId(itemId)
    setItemImageMsg(null)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `item-overrides/${itemId}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('rider-photos')
        .upload(path, file, { contentType: file.type, upsert: true })
      if (uploadErr) throw uploadErr
      const { data: urlData } = supabase.storage.from('rider-photos').getPublicUrl(path)
      await updateItem(itemId, { image_url: urlData.publicUrl })
      setShow(prev => prev ? { ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, imageUrl: urlData.publicUrl } : i) } : prev)
      if (show) propagateItemImageToMaster(show.artist, itemName, urlData.publicUrl).catch(() => {})
      setItemImageMsg({ id: itemId, ok: true })
    } catch {
      setItemImageMsg({ id: itemId, ok: false })
    }
    setUploadingItemImageId(null)
    setTimeout(() => setItemImageMsg(prev => (prev?.id === itemId ? null : prev)), 2500)
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

  async function handleSaveAddress() {
    if (!show || !addressInput.trim()) return
    setLookingUpAddress(true)
    setAddressError('')
    try {
      const res = await fetch(`/api/places?address=${encodeURIComponent(addressInput.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Address not found')
      const venueAddress = data.address as string
      const venueLat = typeof data.lat === 'number' ? data.lat : undefined
      const venueLng = typeof data.lng === 'number' ? data.lng : undefined
      await updateShowVenue(show.id, { venueAddress, venueLat, venueLng })
      setShow(prev => prev ? { ...prev, venueAddress, venueLat, venueLng } : prev)
      setAddressOpen(false)
    } catch (e: any) {
      setAddressError(e?.message ?? 'Could not find that address')
    }
    setLookingUpAddress(false)
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
    const targetStatus: Show['status'] = statusModal === 'restore' ? 'active' : statusModal
    setUpdatingStatus(true)
    try {
      await updateShowStatus(show.id, targetStatus)
      setShow(p => p ? { ...p, status: targetStatus } : p)
      if (statusModal === 'cancelled' || statusModal === 'postponed') {
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
        setStatusMsg(`✓ Show marked as ${statusModal} — confirmation email sent`)
      } else {
        setStatusMsg('✓ Show restored to Active')
      }
      setStatusModal(null)
      setStatusReason('')
    } catch (e: any) {
      setStatusMsg('✕ ' + e.message)
    }
    setUpdatingStatus(false)
  }

  async function handleResetRiderFromMaster() {
    if (!show) return
    setResettingRider(true)
    try {
      await resetShowRiderFromMaster(show.id, show.artist)
      await load()
      setRiderResetMsg('✓ Rider reset to the latest master rider')
      setRiderResetModal(false)
    } catch (e: any) {
      setRiderResetMsg('✕ ' + e.message)
    }
    setResettingRider(false)
  }

  async function handleToggleBuyerCoversHotel() {
    if (!show) return
    const next = !show.buyerCoversHotel
    setShow(prev => prev ? { ...prev, buyerCoversHotel: next } : prev)
    try { await updateShowTravelFlags(show.id, { buyerCoversHotel: next }) } catch {}
  }

  async function handleToggleBuyerCoversFlights() {
    if (!show) return
    const next = !show.buyerCoversFlights
    setShow(prev => prev ? { ...prev, buyerCoversFlights: next } : prev)
    try { await updateShowTravelFlags(show.id, { buyerCoversFlights: next }) } catch {}
  }

  function searchHotels(q: string) {
    if (hotelDebounceRef.current) clearTimeout(hotelDebounceRef.current)
    if (q.length < 2) { setHotelPredictions([]); setShowHotelDropdown(false); return }
    hotelDebounceRef.current = setTimeout(async () => {
      setSearchingHotels(true)
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}&type=lodging`)
        const data = await res.json()
        setHotelPredictions(data.predictions ?? [])
        setShowHotelDropdown(true)
      } catch {}
      setSearchingHotels(false)
    }, 300)
  }

  async function selectHotelPrediction(p: { placeId: string; name: string; secondary: string }) {
    setNewHotelName(p.name)
    setShowHotelDropdown(false)
    setHotelPredictions([])
    try {
      const res = await fetch(`/api/places?placeId=${p.placeId}`)
      const data = await res.json()
      if (data.address) setNewHotelAddress(data.address)
      setNewHotelLat(typeof data.lat === 'number' ? data.lat : null)
      setNewHotelLng(typeof data.lng === 'number' ? data.lng : null)
    } catch {}
  }

  async function lookupNewHotelAddress() {
    if (!newHotelAddress.trim()) return
    setLookingUpHotel(true)
    setHotelError('')
    try {
      const res = await fetch(`/api/places?address=${encodeURIComponent(newHotelAddress.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Address not found')
      setNewHotelAddress(data.address)
      setNewHotelLat(typeof data.lat === 'number' ? data.lat : null)
      setNewHotelLng(typeof data.lng === 'number' ? data.lng : null)
    } catch (e: any) {
      setHotelError(e?.message ?? 'Could not find that address')
      setNewHotelLat(null)
      setNewHotelLng(null)
    }
    setLookingUpHotel(false)
  }

  async function handleAddHotel() {
    if (!show || !newHotelName.trim()) return
    try {
      const hotel = await addHotel(show.id, {
        name: newHotelName.trim(),
        address: newHotelAddress.trim() || undefined,
        lat: newHotelLat ?? undefined,
        lng: newHotelLng ?? undefined,
      }, show.hotels.length)
      setShow(prev => prev ? { ...prev, hotels: [...prev.hotels, hotel] } : prev)
      setAddingHotel(false)
      setNewHotelName(''); setNewHotelAddress(''); setNewHotelLat(null); setNewHotelLng(null); setHotelError('')
    } catch (e: any) {
      setHotelError(e?.message ?? 'Could not add hotel')
    }
  }

  async function handleSaveHotelEdit(id: string) {
    setShow(prev => prev ? { ...prev, hotels: prev.hotels.map(h => h.id === id ? { ...h, name: editHotelName, address: editHotelAddress } : h) } : prev)
    setEditingHotelId(null)
    try { await updateHotel(id, { name: editHotelName, address: editHotelAddress }) } catch {}
  }

  async function handleDeleteHotel(id: string) {
    const affectedGuestIds = (show?.roomingGuests ?? []).filter(g => g.hotelId === id).map(g => g.id)
    setShow(prev => prev ? {
      ...prev,
      hotels: prev.hotels.filter(h => h.id !== id),
      roomingGuests: prev.roomingGuests.filter(g => g.hotelId !== id),
    } : prev)
    try {
      await Promise.all(affectedGuestIds.map(gid => deleteRoomingGuest(gid)))
      await deleteHotel(id)
    } catch {}
  }

  async function lookupNewFlight() {
    if (!newFlightAirline.trim() || !newFlightNumber.trim()) return
    setLookingUpFlight(true)
    setFlightLookupError('')
    try {
      const params = new URLSearchParams({ airline: newFlightAirline.trim(), flightNumber: newFlightNumber.trim() })
      if (newFlightDate) params.set('date', newFlightDate)
      const res = await fetch(`/api/flight-lookup?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Flight not found')
      setNewFlightOrigin(data.originCode ? `${data.origin} (${data.originCode})` : data.origin)
      setNewFlightDestination(data.destinationCode ? `${data.destination} (${data.destinationCode})` : data.destination)
      if (data.date) setNewFlightDate(data.date)
    } catch (e: any) {
      setFlightLookupError(e?.message ?? 'Could not find that flight')
    }
    setLookingUpFlight(false)
  }

  async function handleAddFlight() {
    if (!show || !newFlightPassenger.trim()) return
    try {
      const flight = await addFlight(show.id, {
        passengerName: newFlightPassenger.trim(), airline: newFlightAirline.trim(), flightNumber: newFlightNumber.trim(),
        origin: newFlightOrigin.trim(), destination: newFlightDestination.trim(), flightDate: newFlightDate || undefined,
        classOfService: newFlightClass,
      }, show.flights.length)
      setShow(prev => prev ? { ...prev, flights: [...prev.flights, flight] } : prev)
      setAddingFlight(false)
      setNewFlightPassenger(''); setNewFlightAirline(''); setNewFlightNumber(''); setNewFlightOrigin(''); setNewFlightDestination(''); setNewFlightDate(''); setNewFlightClass('coach')
    } catch { /* keep form open on failure */ }
  }

  async function handleSaveFlightEdit(id: string) {
    setShow(prev => prev ? {
      ...prev,
      flights: prev.flights.map(f => f.id === id ? {
        ...f, passengerName: editFlightPassenger, airline: editFlightAirline, flightNumber: editFlightNumber,
        origin: editFlightOrigin, destination: editFlightDestination, flightDate: editFlightDate, classOfService: editFlightClass,
      } : f),
    } : prev)
    setEditingFlightId(null)
    try {
      await updateFlight(id, {
        passengerName: editFlightPassenger, airline: editFlightAirline, flightNumber: editFlightNumber,
        origin: editFlightOrigin, destination: editFlightDestination, flightDate: editFlightDate, classOfService: editFlightClass,
      })
    } catch {}
  }

  async function handleDeleteFlight(id: string) {
    setShow(prev => prev ? { ...prev, flights: prev.flights.filter(f => f.id !== id) } : prev)
    try { await deleteFlight(id) } catch {}
  }

  function distanceFromVenue(lat?: number, lng?: number): string | null {
    if (!show?.venueLat || !show?.venueLng || lat == null || lng == null) return null
    const R = 3958.8 // miles
    const dLat = (lat - show.venueLat) * Math.PI / 180
    const dLng = (lng - show.venueLng) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(show.venueLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return `${d.toFixed(1)} mi from venue`
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
                {addressOpen ? (
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <input value={addressInput} onChange={e => setAddressInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveAddress()}
                      placeholder="Full venue address" autoFocus
                      className="text-xs bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-lg px-2 py-1 w-56 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                    <button onClick={handleSaveAddress} disabled={lookingUpAddress || !addressInput.trim()}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 disabled:opacity-40">
                      {lookingUpAddress ? 'Looking up…' : 'Save'}
                    </button>
                    <button onClick={() => { setAddressOpen(false); setAddressError('') }} className="text-xs text-white/40 hover:text-white/70">Cancel</button>
                    {addressError && <span className="text-xs text-red-300 w-full">{addressError}</span>}
                  </div>
                ) : (
                  <button onClick={() => { setAddressOpen(true); setAddressInput(show.venueAddress ?? '') }}
                    className="text-white/40 text-xs mt-1 hidden sm:flex items-center gap-1 hover:text-white/70 transition-colors group">
                    <MapPin size={10} />
                    {show.venueAddress ?? 'Add venue address'}
                    <Edit3 size={9} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                  </button>
                )}
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
              {show.status === 'postponed' && (
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border bg-orange-500/15 text-orange-300 border-orange-400/30">
                  <PauseCircle size={13} /> Postponed
                </div>
              )}
              {show.status === 'cancelled' && (
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border bg-red-500/15 text-red-300 border-red-400/30">
                    <XCircle size={13} /> Cancelled
                  </div>
                  <button onClick={() => { setStatusModal('restore'); setStatusMsg(null) }}
                    className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 transition-all">
                    <RotateCcw size={13} /> Restore Show
                  </button>
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
              <button onClick={() => { setRiderResetModal(true); setRiderResetMsg(null) }}
                className="flex items-center gap-2 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-all">
                <RotateCcw size={13} /> Reset to Latest Rider
              </button>
              {riderResetMsg && <p className={`text-xs font-semibold ${riderResetMsg.startsWith('✓') ? 'text-emerald-300' : 'text-red-300'}`}>{riderResetMsg}</p>}
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

        {/* Venue location map */}
        {show.venueLat != null && show.venueLng != null && (
          <div className="mb-4">
            <VenueMap lat={show.venueLat} lng={show.venueLng} label={`${show.venue}, ${show.city}`} />
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
            <button onClick={() => setActiveTab('travel')}
              className={`flex items-center gap-2 text-sm font-black px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'travel' ? 'bg-amber-500 text-gray-950 shadow-lg shadow-amber-500/20' : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'}`}>
              <Building2 size={13} /> Travel
              {(show.hotels.length > 0 || show.flights.length > 0) && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
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
                            <label className="relative shrink-0 cursor-pointer group/img" title="Set a photo for this item">
                              <ProductImage name={item.name} category={item.category} imageUrl={item.imageUrl} size={80} />
                              <div className="absolute inset-0 rounded-xl bg-black/0 group-hover/img:bg-black/40 transition-colors flex items-center justify-center">
                                {uploadingItemImageId === item.id
                                  ? <Loader2 size={18} className="animate-spin text-white" />
                                  : <ImagePlus size={18} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />}
                              </div>
                              {itemImageMsg?.id === item.id && (
                                <div className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow ${itemImageMsg.ok ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                  {itemImageMsg.ok ? <CheckCircle2 size={13} className="text-white" /> : <X size={13} className="text-white" />}
                                </div>
                              )}
                              <input type="file" accept="image/*" className="hidden"
                                onChange={e => { if (e.target.files?.[0]) handleUploadItemImage(item.id, item.name, e.target.files[0]); e.target.value = '' }} />
                            </label>
                            <div className="flex-1 min-w-0">
                              {editingItem === item.id ? (
                                <div className="space-y-1.5">
                                  <input value={editValue} onChange={e => setEditValue(e.target.value)}
                                    placeholder="Item name"
                                    className="w-full text-sm bg-white border border-amber-200 text-gray-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" autoFocus />
                                  <div className="flex gap-1.5">
                                    <input value={editQuantity} onChange={e => setEditQuantity(e.target.value)}
                                      placeholder="Quantity"
                                      className="w-24 text-sm bg-white border border-amber-200 text-gray-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                                    <input value={editNotes} onChange={e => setEditNotes(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)}
                                      placeholder="Notes"
                                      className="flex-1 text-sm bg-white border border-amber-200 text-gray-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => saveEdit(item.id)} className="text-sm font-bold text-emerald-700">Save</button>
                                    <button onClick={() => setEditingItem(null)} className="text-sm text-gray-500">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                                    <button onClick={() => { setEditingItem(item.id); setEditValue(item.name); setEditQuantity(item.quantity); setEditNotes(item.notes) }} className="text-gray-300 hover:text-gray-600 transition-colors">
                                      <Edit3 size={11} />
                                    </button>
                                  </div>
                                  <span className="text-xs text-gray-500">{item.quantity}{item.notes ? ` · ${item.notes}` : ''}</span>
                                </>
                              )}
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
                  <div className="px-5 py-3 border-t border-amber-100">
                    {addingItemTo === category ? (
                      <div className="space-y-1.5">
                        <input value={newItemName} onChange={e => setNewItemName(e.target.value)}
                          placeholder="Item name" autoFocus
                          className="w-full text-sm bg-white border border-amber-200 text-gray-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        <div className="flex gap-1.5">
                          <input value={newItemQuantity} onChange={e => setNewItemQuantity(e.target.value)}
                            placeholder="Quantity"
                            className="w-24 text-sm bg-white border border-amber-200 text-gray-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                          <input value={newItemNotes} onChange={e => setNewItemNotes(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddItem(category)}
                            placeholder="Notes"
                            className="flex-1 text-sm bg-white border border-amber-200 text-gray-900 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAddItem(category)} disabled={!newItemName.trim()}
                            className="text-sm font-bold text-emerald-700 disabled:opacity-40">Add Item</button>
                          <button onClick={() => { setAddingItemTo(null); setNewItemName(''); setNewItemQuantity(''); setNewItemNotes('') }}
                            className="text-sm text-gray-500">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingItemTo(category)}
                        className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors">
                        <Plus size={13} /> Add Item
                      </button>
                    )}
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

        {/* ── Travel tab ── */}
        {activeTab === 'travel' && (
          <div className="space-y-5 animate-slide-up">
            {/* Hotels + Rooming List */}
            <div className="bg-white border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Building2 size={13} /> Hotels &amp; Rooming List</h3>
                <button onClick={handleToggleBuyerCoversHotel}
                  className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl transition-all ${show.buyerCoversHotel ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {show.buyerCoversHotel ? <CheckCircle2 size={13} /> : <Building2 size={13} />}
                  Buyer Covers Hotel
                </button>
              </div>
              {show.buyerCoversHotel && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
                  Visible to the buyer on their buyer page.
                </p>
              )}

              <div className="space-y-2 mb-4">
                {show.hotels.length === 0 && !addingHotel && <p className="text-sm text-gray-400">No hotels added yet.</p>}
                {show.hotels.map((hotel, hotelIndex) => (
                  <div key={hotel.id} className="border border-amber-200 rounded-xl p-3 bg-amber-50">
                    {editingHotelId === hotel.id ? (
                      <div className="space-y-1.5">
                        <input value={editHotelName} onChange={e => setEditHotelName(e.target.value)} placeholder="Hotel name"
                          className="w-full text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        <input value={editHotelAddress} onChange={e => setEditHotelAddress(e.target.value)} placeholder="Address"
                          className="w-full text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveHotelEdit(hotel.id)} className="text-sm font-bold text-emerald-700">Save</button>
                          <button onClick={() => setEditingHotelId(null)} className="text-sm text-gray-500">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900 text-sm">{hotel.name}</span>
                            <button onClick={() => { setEditingHotelId(hotel.id); setEditHotelName(hotel.name); setEditHotelAddress(hotel.address ?? '') }} className="text-gray-300 hover:text-gray-600 transition-colors">
                              <Edit3 size={11} />
                            </button>
                          </div>
                          {hotel.address && <p className="text-xs text-gray-500 mt-0.5">{hotel.address}</p>}
                          {distanceFromVenue(hotel.lat, hotel.lng) && <p className="text-xs text-amber-700 font-semibold mt-0.5">{distanceFromVenue(hotel.lat, hotel.lng)}</p>}
                        </div>
                        <button onClick={() => handleDeleteHotel(hotel.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                    {hotel.lat != null && hotel.lng != null && (
                      <div className="mt-2">
                        <HotelVenueMap
                          hotelLat={hotel.lat} hotelLng={hotel.lng} hotelLabel={hotel.name}
                          venueLat={show.venueLat} venueLng={show.venueLng} venueLabel={show.venue}
                          height={160}
                        />
                      </div>
                    )}
                    <RoomingListEditor show={show} setShow={setShow} hotelId={hotel.id} partyLabel={PARTY_LABELS[hotelIndex] ?? String(hotelIndex + 1)} />
                  </div>
                ))}
              </div>

              {addingHotel ? (
                <div className="space-y-1.5 border border-amber-200 rounded-xl p-3 bg-amber-50">
                  <div className="relative" ref={hotelDropdownRef}>
                    <div className="relative">
                      <input
                        value={newHotelName}
                        onChange={e => { setNewHotelName(e.target.value); setNewHotelLat(null); setNewHotelLng(null); searchHotels(e.target.value) }}
                        onFocus={() => hotelPredictions.length > 0 && setShowHotelDropdown(true)}
                        placeholder="Start typing a hotel name…"
                        autoComplete="off"
                        autoFocus
                        className="w-full text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                      {searchingHotels
                        ? <Loader2 size={13} className="absolute right-2.5 top-2 animate-spin text-gray-400" />
                        : <MapPin size={13} className="absolute right-2.5 top-2 text-gray-300" />
                      }
                    </div>
                    {showHotelDropdown && hotelPredictions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-amber-200 rounded-xl shadow-2xl overflow-hidden">
                        {hotelPredictions.map(p => (
                          <button
                            key={p.placeId}
                            onMouseDown={() => selectHotelPrediction(p)}
                            className="w-full text-left px-3 py-2 hover:bg-amber-50 transition-colors border-b border-amber-100 last:border-0"
                          >
                            <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                            {p.secondary && <div className="text-xs text-gray-500 mt-0.5">{p.secondary}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input value={newHotelAddress} onChange={e => { setNewHotelAddress(e.target.value); setNewHotelLat(null); setNewHotelLng(null) }}
                      onKeyDown={e => e.key === 'Enter' && lookupNewHotelAddress()}
                      placeholder="Address (optional, for map + distance)"
                      className="flex-1 text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    <button onClick={lookupNewHotelAddress} disabled={lookingUpHotel || !newHotelAddress.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-gray-950 disabled:opacity-40 transition-colors">
                      {lookingUpHotel ? <Loader2 size={12} className="animate-spin" /> : 'Look Up'}
                    </button>
                  </div>
                  {hotelError && <p className="text-xs text-red-600">{hotelError}</p>}
                  {newHotelLat != null && newHotelLng != null && (
                    <p className="text-xs text-emerald-700 flex items-center gap-1"><MapPin size={11} /> Location found — will show on the map</p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={handleAddHotel} disabled={!newHotelName.trim()} className="text-sm font-bold text-emerald-700 disabled:opacity-40">Add Hotel</button>
                    <button onClick={() => { setAddingHotel(false); setNewHotelName(''); setNewHotelAddress(''); setNewHotelLat(null); setNewHotelLng(null); setHotelError('') }} className="text-sm text-gray-500">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingHotel(true)} className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors">
                  <Plus size={13} /> Add Hotel
                </button>
              )}

            </div>

            {/* Flights */}
            <div className="bg-white border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Plane size={13} /> Flights</h3>
                <button onClick={handleToggleBuyerCoversFlights}
                  className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl transition-all ${show.buyerCoversFlights ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {show.buyerCoversFlights ? <CheckCircle2 size={13} /> : <Plane size={13} />}
                  Buyer Covers Flights
                </button>
              </div>
              {show.buyerCoversFlights && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
                  Visible to the buyer on their buyer page.
                </p>
              )}

              <div className="space-y-2 mb-3">
                {show.flights.length === 0 && !addingFlight && <p className="text-sm text-gray-400">No flights added yet.</p>}
                {show.flights.map(flight => (
                  <div key={flight.id} className="border border-amber-200 rounded-xl p-3 bg-amber-50">
                    {editingFlightId === flight.id ? (
                      <div className="space-y-1.5">
                        <input value={editFlightPassenger} onChange={e => setEditFlightPassenger(e.target.value)} placeholder="Passenger name"
                          className="w-full text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        <div className="flex gap-1.5">
                          <input value={editFlightAirline} onChange={e => setEditFlightAirline(e.target.value)} placeholder="Airline"
                            className="flex-1 text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                          <input value={editFlightNumber} onChange={e => setEditFlightNumber(e.target.value)} placeholder="Flight #"
                            className="w-24 text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        </div>
                        <div className="flex gap-1.5">
                          <input value={editFlightOrigin} onChange={e => setEditFlightOrigin(e.target.value)} placeholder="From"
                            className="flex-1 text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                          <input value={editFlightDestination} onChange={e => setEditFlightDestination(e.target.value)} placeholder="To"
                            className="flex-1 text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        </div>
                        <div className="flex gap-1.5">
                          <input type="date" value={editFlightDate} onChange={e => setEditFlightDate(e.target.value)}
                            className="flex-1 text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                          <select value={editFlightClass} onChange={e => setEditFlightClass(e.target.value as FlightClass)}
                            className="flex-1 text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500">
                            {(Object.keys(FLIGHT_CLASS_LABELS) as FlightClass[]).map(c => <option key={c} value={c}>{FLIGHT_CLASS_LABELS[c]}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveFlightEdit(flight.id)} className="text-sm font-bold text-emerald-700">Save</button>
                          <button onClick={() => setEditingFlightId(null)} className="text-sm text-gray-500">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{flight.passengerName}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{flight.airline} {flight.flightNumber} · {flight.origin} → {flight.destination}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{flight.flightDate ?? '—'} · <span className="font-semibold text-amber-700">{FLIGHT_CLASS_LABELS[flight.classOfService]}</span></p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => { setEditingFlightId(flight.id); setEditFlightPassenger(flight.passengerName); setEditFlightAirline(flight.airline); setEditFlightNumber(flight.flightNumber); setEditFlightOrigin(flight.origin); setEditFlightDestination(flight.destination); setEditFlightDate(flight.flightDate ?? ''); setEditFlightClass(flight.classOfService) }}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 transition-colors">
                            <Edit3 size={12} />
                          </button>
                          <button onClick={() => handleDeleteFlight(flight.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {addingFlight ? (
                <div className="space-y-1.5 border border-amber-200 rounded-xl p-3 bg-amber-50">
                  <input value={newFlightPassenger} onChange={e => setNewFlightPassenger(e.target.value)} placeholder="Passenger name" autoFocus
                    className="w-full text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  <div className="flex gap-1.5">
                    <input value={newFlightAirline} onChange={e => setNewFlightAirline(e.target.value)} placeholder="Airline"
                      className="flex-1 text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    <input value={newFlightNumber} onChange={e => setNewFlightNumber(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && lookupNewFlight()}
                      placeholder="Flight #"
                      className="w-24 text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    <button onClick={lookupNewFlight} disabled={lookingUpFlight || !newFlightAirline.trim() || !newFlightNumber.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-gray-950 disabled:opacity-40 transition-colors shrink-0">
                      {lookingUpFlight ? <Loader2 size={12} className="animate-spin" /> : 'Look Up'}
                    </button>
                  </div>
                  {flightLookupError && <p className="text-xs text-red-600">{flightLookupError}</p>}
                  <div className="flex gap-1.5">
                    <input value={newFlightOrigin} onChange={e => setNewFlightOrigin(e.target.value)} placeholder="From"
                      className="flex-1 text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    <input value={newFlightDestination} onChange={e => setNewFlightDestination(e.target.value)} placeholder="To"
                      className="flex-1 text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div className="flex gap-1.5">
                    <input type="date" value={newFlightDate} onChange={e => setNewFlightDate(e.target.value)}
                      className="flex-1 text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    <select value={newFlightClass} onChange={e => setNewFlightClass(e.target.value as FlightClass)}
                      className="flex-1 text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500">
                      {(Object.keys(FLIGHT_CLASS_LABELS) as FlightClass[]).map(c => <option key={c} value={c}>{FLIGHT_CLASS_LABELS[c]}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddFlight} disabled={!newFlightPassenger.trim()} className="text-sm font-bold text-emerald-700 disabled:opacity-40">Add Flight</button>
                    <button onClick={() => { setAddingFlight(false); setNewFlightPassenger(''); setNewFlightAirline(''); setNewFlightNumber(''); setNewFlightOrigin(''); setNewFlightDestination(''); setNewFlightDate(''); setNewFlightClass('coach'); setFlightLookupError('') }} className="text-sm text-gray-500">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingFlight(true)} className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors">
                  <Plus size={13} /> Add Flight
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cancel / Postpone / Restore confirm modal */}
      {statusModal && show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-gray-900">
                {statusModal === 'cancelled' ? 'Are you sure you want to cancel this show?'
                  : statusModal === 'postponed' ? 'Are you sure you want to postpone this show?'
                  : 'Restore this show?'}
              </h3>
              <button onClick={() => { setStatusModal(null); setStatusReason('') }} className="p-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {statusModal === 'cancelled'
                ? 'This is a fail-safe to prevent accidental cancellations — the show will move to Archived on your dashboard. You can restore it later if plans change.'
                : statusModal === 'postponed'
                ? 'This is a fail-safe to prevent accidental postponements — the show stays on your dashboard marked as postponed.'
                : 'This brings the show back to Active status in your main list so you can pick up where you left off.'}
              {' '}
              {statusModal !== 'restore' && (show.buyerEmail
                ? `${show.buyerName || 'The buyer'} (${show.buyerEmail}), you, and the artist's management team will be emailed automatically.`
                : 'You and the artist\'s management team will be emailed automatically.')}
            </p>

            {statusModal !== 'restore' && (
              <>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Reason <span className="text-gray-400 font-normal normal-case">(optional, included in the email)</span>
                </label>
                <textarea
                  value={statusReason}
                  onChange={e => setStatusReason(e.target.value)}
                  placeholder={statusModal === 'cancelled' ? 'e.g. Venue conflict' : 'e.g. New date TBD, artist illness'}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 transition-all mb-4 resize-none"
                />
              </>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setStatusModal(null); setStatusReason('') }}
                className="flex-1 text-sm font-bold px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
                Never mind
              </button>
              <button onClick={handleConfirmStatusChange} disabled={updatingStatus}
                className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl text-white disabled:opacity-50 transition-colors ${
                  statusModal === 'cancelled' ? 'bg-red-600 hover:bg-red-500'
                  : statusModal === 'postponed' ? 'bg-orange-500 hover:bg-orange-400'
                  : 'bg-emerald-600 hover:bg-emerald-500'
                }`}>
                {updatingStatus
                  ? <Loader2 size={14} className="animate-spin" />
                  : statusModal === 'cancelled' ? <XCircle size={14} />
                  : statusModal === 'postponed' ? <PauseCircle size={14} />
                  : <RotateCcw size={14} />}
                {statusModal === 'cancelled' ? 'Yes, Cancel Show' : statusModal === 'postponed' ? 'Yes, Postpone Show' : 'Restore Show'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset to Latest Rider confirm modal */}
      {riderResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-gray-900">Reset this show's rider?</h3>
              <button onClick={() => setRiderResetModal(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              This replaces every item on this show's rider with a fresh copy of the artist's current master rider, and resets all statuses back to pending.
              Any items you've added just for this show, or statuses the buyer has already confirmed/flagged, will be lost. This can't be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setRiderResetModal(false)}
                className="flex-1 text-sm font-bold px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
                Never mind
              </button>
              <button onClick={handleResetRiderFromMaster} disabled={resettingRider}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl text-white disabled:opacity-50 transition-colors bg-red-600 hover:bg-red-500">
                {resettingRider ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Yes, Reset Rider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
