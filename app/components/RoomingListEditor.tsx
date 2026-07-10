'use client'

import { type Dispatch, type SetStateAction } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { type Show } from '@/lib/data'
import { addRoomingGuest, updateRoomingGuest, deleteRoomingGuest } from '@/lib/db'

// The rooming list for one hotel — party label (A/B/C...) is derived from the
// hotel's position in show.hotels, not stored, since it's just hotel order.
export default function RoomingListEditor({
  show, setShow, hotelId, partyLabel,
}: {
  show: Show
  setShow: Dispatch<SetStateAction<Show | null>>
  hotelId: string
  partyLabel: string
}) {
  const guests = show.roomingGuests
    .filter(g => g.hotelId === hotelId)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  async function handleAddGuest() {
    const sortOrder = guests.length
    const guest = await addRoomingGuest(show.id, { hotelId, firstName: '', lastName: '' }, sortOrder)
    setShow(prev => prev ? { ...prev, roomingGuests: [...prev.roomingGuests, guest] } : prev)
  }

  async function handlePatchGuest(id: string, fields: Partial<{ firstName: string; lastName: string; roomType: string; checkinDate: string; checkoutDate: string; confirmationNumber: string }>) {
    setShow(prev => prev ? { ...prev, roomingGuests: prev.roomingGuests.map(g => g.id === id ? { ...g, ...fields } : g) } : prev)
    try { await updateRoomingGuest(id, fields) } catch {}
  }

  async function handleDeleteGuest(id: string) {
    setShow(prev => prev ? { ...prev, roomingGuests: prev.roomingGuests.filter(g => g.id !== id) } : prev)
    try { await deleteRoomingGuest(id) } catch {}
  }

  return (
    <div className="mt-3 pt-3 border-t border-amber-100">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-xs font-black text-gray-500 uppercase tracking-widest">{partyLabel} Party — Rooming List</h5>
        <button onClick={handleAddGuest} className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors">
          <Plus size={12} /> Add Guest
        </button>
      </div>

      {guests.length === 0 ? (
        <p className="text-xs text-gray-400">No guests yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[720px] space-y-1.5">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_28px] gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wide px-1">
              <span>First</span>
              <span>Last</span>
              <span>Room Type</span>
              <span>Check-in</span>
              <span>Check-out</span>
              <span>Confirmation #</span>
              <span />
            </div>
            {guests.map(guest => (
              <div key={guest.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_28px] gap-1.5 items-center">
                <input value={guest.firstName} onChange={e => handlePatchGuest(guest.id, { firstName: e.target.value })}
                  placeholder="First name"
                  className="text-sm bg-white border border-amber-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <input value={guest.lastName} onChange={e => handlePatchGuest(guest.id, { lastName: e.target.value })}
                  placeholder="Last name"
                  className="text-sm bg-white border border-amber-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <input value={guest.roomType} onChange={e => handlePatchGuest(guest.id, { roomType: e.target.value })}
                  placeholder="King Suite, Double…"
                  className="text-sm bg-white border border-amber-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <input type="date" value={guest.checkinDate ?? ''} onChange={e => handlePatchGuest(guest.id, { checkinDate: e.target.value })}
                  className="text-sm bg-white border border-amber-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <input type="date" value={guest.checkoutDate ?? ''} onChange={e => handlePatchGuest(guest.id, { checkoutDate: e.target.value })}
                  className="text-sm bg-white border border-amber-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <input value={guest.confirmationNumber ?? ''} onChange={e => handlePatchGuest(guest.id, { confirmationNumber: e.target.value })}
                  placeholder="Conf. #"
                  className="text-sm bg-white border border-amber-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <button onClick={() => handleDeleteGuest(guest.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
