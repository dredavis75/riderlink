'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { Plus, Trash2, Users, Download } from 'lucide-react'
import {
  type Show, type Hotel, type RoomingParty, type RoomingBookingStatus,
  ROOMING_BOOKING_STATUS_LABELS,
} from '@/lib/data'
import {
  addRoomingDay, updateRoomingDay, deleteRoomingDay,
  addRoomingGuest, updateRoomingGuest, deleteRoomingGuest,
  setRoomingAssignment,
} from '@/lib/db'

const STATUS_STYLE: Record<RoomingBookingStatus, string> = {
  requested: 'bg-amber-100 text-amber-800 border-amber-300',
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  need_approval: 'bg-orange-100 text-orange-800 border-orange-300',
  unconfirmed: 'bg-red-100 text-red-800 border-red-300',
}

function fmtDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function nextDate(dates: string[]): string {
  if (dates.length === 0) return new Date().toISOString().slice(0, 10)
  const last = dates[dates.length - 1]
  const d = new Date(last + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export default function RoomingListEditor({
  show, setShow, hotels,
}: {
  show: Show
  setShow: Dispatch<SetStateAction<Show | null>>
  hotels: Hotel[]
}) {
  const [savingCell, setSavingCell] = useState<string | null>(null)

  const days = [...show.roomingDays].sort((a, b) => a.date.localeCompare(b.date))
  const partyGuests = (party: RoomingParty) =>
    show.roomingGuests.filter(g => g.party === party).sort((a, b) => a.sortOrder - b.sortOrder)

  function getAssignment(guestId: string, date: string) {
    return show.roomingAssignments.find(a => a.guestId === guestId && a.date === date)
  }

  async function handleAddDay() {
    const date = nextDate(days.map(d => d.date))
    const day = await addRoomingDay(show.id, { date, hotelId: hotels[0]?.id }, days.length)
    setShow(prev => prev ? { ...prev, roomingDays: [...prev.roomingDays, day] } : prev)
  }

  async function handlePatchDay(id: string, fields: Partial<{ date: string; hotelId: string; bookingStatus: RoomingBookingStatus; note: string; singleCount: number; doubleCount: number; suiteCount: number }>) {
    setShow(prev => prev ? { ...prev, roomingDays: prev.roomingDays.map(d => d.id === id ? { ...d, ...fields } : d) } : prev)
    try { await updateRoomingDay(id, fields) } catch {}
  }

  async function handleDeleteDay(id: string) {
    setShow(prev => prev ? { ...prev, roomingDays: prev.roomingDays.filter(d => d.id !== id) } : prev)
    try { await deleteRoomingDay(id) } catch {}
  }

  async function handleAddGuest(party: RoomingParty) {
    const sortOrder = partyGuests(party).length
    const guest = await addRoomingGuest(show.id, { party, firstName: '', lastName: '' }, sortOrder)
    setShow(prev => prev ? { ...prev, roomingGuests: [...prev.roomingGuests, guest] } : prev)
  }

  async function handlePatchGuest(id: string, fields: Partial<{ firstName: string; lastName: string; sex: string; confirmationNumber: string }>) {
    setShow(prev => prev ? { ...prev, roomingGuests: prev.roomingGuests.map(g => g.id === id ? { ...g, ...fields } : g) } : prev)
    try { await updateRoomingGuest(id, fields) } catch {}
  }

  async function handleDeleteGuest(id: string) {
    setShow(prev => prev ? {
      ...prev,
      roomingGuests: prev.roomingGuests.filter(g => g.id !== id),
      roomingAssignments: prev.roomingAssignments.filter(a => a.guestId !== id),
    } : prev)
    try { await deleteRoomingGuest(id) } catch {}
  }

  async function handleCellChange(guestId: string, date: string, roomLabel: string) {
    setShow(prev => {
      if (!prev) return prev
      const existing = prev.roomingAssignments.find(a => a.guestId === guestId && a.date === date)
      return {
        ...prev,
        roomingAssignments: existing
          ? prev.roomingAssignments.map(a => a === existing ? { ...a, roomLabel } : a)
          : [...prev.roomingAssignments, { id: `local-${guestId}-${date}`, showId: prev.id, guestId, date, roomLabel, sortOrder: 0 }],
      }
    })
  }

  async function handleCellBlur(guestId: string, date: string, roomLabel: string) {
    const key = `${guestId}:${date}`
    setSavingCell(key)
    try {
      const saved = await setRoomingAssignment(show.id, guestId, date, roomLabel)
      setShow(prev => prev ? {
        ...prev,
        roomingAssignments: [...prev.roomingAssignments.filter(a => !(a.guestId === guestId && a.date === date)), saved],
      } : prev)
    } catch {}
    setSavingCell(null)
  }

  function renderPartySection(party: RoomingParty, label: string) {
    const guests = partyGuests(party)
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><Users size={12} /> {label} Party</h5>
          <button onClick={() => handleAddGuest(party)} className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors">
            <Plus size={12} /> Add Guest
          </button>
        </div>
        {guests.length === 0 && <p className="text-xs text-gray-400 mb-2">No guests yet.</p>}
        {guests.map(guest => (
          <div key={guest.id} className="flex items-stretch gap-0 border border-amber-200 rounded-lg mb-1.5 overflow-hidden">
            <div className="flex gap-1 p-1.5 bg-amber-50 shrink-0" style={{ minWidth: 260 }}>
              <input value={guest.firstName} onChange={e => handlePatchGuest(guest.id, { firstName: e.target.value })}
                placeholder="First" className="w-20 text-xs bg-white border border-amber-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500" />
              <input value={guest.lastName} onChange={e => handlePatchGuest(guest.id, { lastName: e.target.value })}
                placeholder="Last" className="w-20 text-xs bg-white border border-amber-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500" />
              <input value={guest.confirmationNumber ?? ''} onChange={e => handlePatchGuest(guest.id, { confirmationNumber: e.target.value })}
                placeholder="Conf. #" className="w-16 text-xs bg-white border border-amber-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500" />
              <button onClick={() => handleDeleteGuest(guest.id)} className="p-1 rounded text-gray-300 hover:text-red-500 shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
            {days.map(day => {
              const assignment = getAssignment(guest.id, day.date)
              const key = `${guest.id}:${day.date}`
              return (
                <input
                  key={day.id}
                  value={assignment?.roomLabel ?? ''}
                  onChange={e => handleCellChange(guest.id, day.date, e.target.value)}
                  onBlur={e => handleCellBlur(guest.id, day.date, e.target.value)}
                  placeholder="—"
                  disabled={savingCell === key}
                  className="w-24 text-xs text-center border-l border-amber-100 px-1 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:z-10 disabled:opacity-50"
                />
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="mt-5 pt-4 border-t border-amber-100">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Rooming List</h4>
        {days.length > 0 && (
          <a href={`/api/pdf/rooming/${show.id}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors">
            <Download size={13} /> Download PDF
          </a>
        )}
      </div>

      {days.length === 0 ? (
        <p className="text-sm text-gray-400 mb-3">No dates added yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Day headers */}
            <div className="flex items-stretch gap-0 mb-2">
              <div className="shrink-0" style={{ minWidth: 260 }} />
              {days.map(day => (
                <div key={day.id} className="shrink-0 border border-amber-200 rounded-lg p-1.5 bg-white ml-0" style={{ width: 96, marginLeft: 0 }}>
                  <div className="flex items-center justify-between gap-1">
                    <input type="date" value={day.date} onChange={e => handlePatchDay(day.id, { date: e.target.value })}
                      className="w-full text-[10px] bg-transparent focus:outline-none" />
                    <button onClick={() => handleDeleteDay(day.id)} className="text-gray-300 hover:text-red-500 shrink-0">
                      <Trash2 size={10} />
                    </button>
                  </div>
                  <select value={day.hotelId ?? ''} onChange={e => handlePatchDay(day.id, { hotelId: e.target.value })}
                    className="w-full text-[10px] bg-white border border-amber-100 rounded px-1 py-0.5 mt-1 focus:outline-none">
                    <option value="">No hotel</option>
                    {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                  <select value={day.bookingStatus} onChange={e => handlePatchDay(day.id, { bookingStatus: e.target.value as RoomingBookingStatus })}
                    className={`w-full text-[10px] font-bold rounded px-1 py-0.5 mt-1 border focus:outline-none ${STATUS_STYLE[day.bookingStatus]}`}>
                    {Object.entries(ROOMING_BOOKING_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <p className="text-[9px] text-gray-400 mt-1 text-center">{fmtDate(day.date)}</p>
                </div>
              ))}
            </div>

            {renderPartySection('A', 'A')}
            <div className="h-3" />
            {renderPartySection('B', 'B')}
          </div>
        </div>
      )}

      <button onClick={handleAddDay} className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors mt-3">
        <Plus size={13} /> Add Day
      </button>
    </div>
  )
}
