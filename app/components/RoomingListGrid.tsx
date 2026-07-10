'use client'

import { type Show } from '@/lib/data'
import HotelVenueMap from '@/app/components/HotelVenueMap'

const PARTY_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function RoomingListGrid({ show }: { show: Show }) {
  const hotels = [...show.hotels].sort((a, b) => a.sortOrder - b.sortOrder)

  if (hotels.length === 0) {
    return <p className="text-sm text-gray-400">Rooming list not yet available.</p>
  }

  return (
    <div className="space-y-5">
      {hotels.map((hotel, i) => {
        const guests = show.roomingGuests
          .filter(g => g.hotelId === hotel.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
        const partyLabel = PARTY_LABELS[i] ?? String(i + 1)

        return (
          <div key={hotel.id} className="border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-bold text-gray-900">{hotel.name}</p>
            {hotel.address && <p className="text-xs text-gray-500 mt-0.5 mb-2">{hotel.address}</p>}

            {hotel.lat != null && hotel.lng != null && (
              <div className="mb-3">
                <HotelVenueMap
                  hotelLat={hotel.lat} hotelLng={hotel.lng} hotelLabel={hotel.name}
                  venueLat={show.venueLat} venueLng={show.venueLng} venueLabel={show.venue}
                  height={200}
                />
              </div>
            )}

            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{partyLabel} Party</p>
            {guests.length === 0 ? (
              <p className="text-xs text-gray-400">No guests yet.</p>
            ) : (
              <div className="space-y-1.5">
                {guests.map(guest => (
                  <div key={guest.id} className="flex items-center justify-between text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <span className="font-semibold text-gray-900">{guest.firstName} {guest.lastName}</span>
                    <span className="text-xs text-gray-600">{guest.roomType}</span>
                    <span className="text-xs text-gray-500">{guest.checkinDate ?? '—'} → {guest.checkoutDate ?? '—'}</span>
                    {guest.confirmationNumber && <span className="text-xs text-gray-400 italic">Conf: {guest.confirmationNumber}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
