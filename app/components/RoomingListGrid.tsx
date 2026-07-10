'use client'

import { type Show, type RoomingParty, type RoomingBookingStatus, ROOMING_BOOKING_STATUS_LABELS } from '@/lib/data'
import VenueMap from '@/app/components/VenueMap'

const STATUS_STYLE: Record<RoomingBookingStatus, string> = {
  requested: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  need_approval: 'bg-orange-100 text-orange-800',
  unconfirmed: 'bg-red-100 text-red-800',
}

function fmtDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function RoomingListGrid({ show }: { show: Show }) {
  const days = [...show.roomingDays].sort((a, b) => a.date.localeCompare(b.date))
  const partyGuests = (party: RoomingParty) =>
    show.roomingGuests.filter(g => g.party === party).sort((a, b) => a.sortOrder - b.sortOrder)

  function getAssignment(guestId: string, date: string) {
    return show.roomingAssignments.find(a => a.guestId === guestId && a.date === date)
  }

  function renderPartyRows(party: RoomingParty, label: string) {
    const guests = partyGuests(party)
    if (guests.length === 0) return null
    return (
      <div className="mb-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{label} Party</p>
        {guests.map(guest => (
          <div key={guest.id} className="flex items-stretch gap-0 mb-1">
            <div className="shrink-0 flex items-center px-2 py-1.5 bg-amber-50 rounded-l-lg border border-amber-200" style={{ minWidth: 160 }}>
              <span className="text-xs font-bold text-gray-900 truncate">{guest.firstName} {guest.lastName}</span>
            </div>
            {days.map((day, i) => {
              const assignment = getAssignment(guest.id, day.date)
              return (
                <div key={day.id}
                  className={`shrink-0 flex items-center justify-center text-xs text-gray-700 border-t border-b border-r border-amber-200 px-2 py-1.5 ${i === days.length - 1 ? 'rounded-r-lg' : ''}`}
                  style={{ width: 96 }}>
                  {assignment?.roomLabel || '—'}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  if (days.length === 0) {
    return <p className="text-sm text-gray-400">Rooming list not yet available.</p>
  }

  const hotelsInGrid = show.hotels.filter(h =>
    h.lat != null && h.lng != null && days.some(d => d.hotelId === h.id)
  )

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex items-stretch gap-0 mb-2">
            <div className="shrink-0" style={{ minWidth: 160 }} />
            {days.map(day => {
              const hotel = show.hotels.find(h => h.id === day.hotelId)
              return (
                <div key={day.id} className="shrink-0 border border-amber-200 rounded-lg p-1.5 bg-white" style={{ width: 96 }}>
                  <p className="text-[10px] font-bold text-gray-900 text-center">{fmtDate(day.date)}</p>
                  <p className="text-[9px] text-gray-500 text-center truncate mt-0.5">{hotel?.name ?? 'No hotel'}</p>
                  <span className={`block mt-1 text-center text-[9px] font-bold rounded px-1 py-0.5 ${STATUS_STYLE[day.bookingStatus]}`}>
                    {ROOMING_BOOKING_STATUS_LABELS[day.bookingStatus]}
                  </span>
                </div>
              )
            })}
          </div>

          {renderPartyRows('A', 'A')}
          {renderPartyRows('B', 'B')}
        </div>
      </div>

      {hotelsInGrid.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {hotelsInGrid.map(hotel => (
            <div key={hotel.id}>
              <p className="text-xs font-bold text-gray-900 mb-1">{hotel.name}</p>
              {hotel.address && <p className="text-xs text-gray-500 mb-1.5">{hotel.address}</p>}
              <VenueMap lat={hotel.lat!} lng={hotel.lng!} label={hotel.name} height={140} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
