import { supabase, isConfigured } from './supabase'
import type { Show, RiderItem, Message, ItemStatus, MasterRider, MasterRiderItem, RiderTemplate, RiderPdfSection, DayOfShowContacts, BuyerAttachment, Hotel, RoomingGuest, BuyerContact, Flight, FlightClass } from './data'

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapShow(row: any): Show {
  return {
    id: row.id,
    artist: row.artist,
    venue: row.venue,
    city: row.city,
    venueAddress: row.venue_address ?? undefined,
    venueLat: row.venue_lat ?? undefined,
    venueLng: row.venue_lng ?? undefined,
    date: row.date,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    status: row.status,
    buyerApprovedAt: row.buyer_approved_at ?? undefined,
    buyerApprovedName: row.buyer_approved_name ?? undefined,
    buyerInvitedAt: row.buyer_invited_at ?? undefined,
    buyerOpenedAt: row.buyer_opened_at ?? undefined,
    buyerLastOpenedAt: row.buyer_last_opened_at ?? undefined,
    buyerOpenCount: row.buyer_open_count ?? 0,
    riderVersion: row.rider_version ?? undefined,
    riderPdfUrl: row.rider_pdf_url ?? undefined,
    masterRiderId: row.master_rider_id ?? undefined,
    runOfShowText: row.run_of_show_text ?? undefined,
    runOfShowPdfUrl: row.run_of_show_pdf_url ?? undefined,
    curfew: row.curfew ?? undefined,
    dayOfShowContacts: row.day_of_show_contacts ?? undefined,
    buyerAttachments: row.buyer_attachments ?? undefined,
    buyerCoversHotel: row.buyer_covers_hotel ?? false,
    buyerCoversFlights: row.buyer_covers_flights ?? false,
    items: (row.rider_items ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((i: any): RiderItem => ({
        id: i.id,
        category: i.category,
        name: i.name,
        quantity: i.quantity,
        notes: i.notes ?? '',
        status: i.status,
        buyerNote: i.buyer_note ?? '',
        imageUrl: i.image_url ?? undefined,
      })),
    messages: (row.messages ?? [])
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((m: any): Message => ({
        id: m.id,
        from: m.from_role,
        sender: m.sender,
        text: m.text,
        timestamp: m.created_at,
      })),
    hotels: (row.hotels ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((h: any): Hotel => ({
        id: h.id,
        showId: h.show_id,
        name: h.name,
        address: h.address || undefined,
        lat: h.lat ?? undefined,
        lng: h.lng ?? undefined,
        sortOrder: h.sort_order,
      })),
    roomingGuests: (row.rooming_guests ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((g: any): RoomingGuest => ({
        id: g.id,
        showId: g.show_id,
        hotelId: g.hotel_id ?? undefined,
        firstName: g.first_name ?? '',
        lastName: g.last_name ?? '',
        roomType: g.room_type ?? '',
        checkinDate: g.checkin_date ?? undefined,
        checkoutDate: g.checkout_date ?? undefined,
        confirmationNumber: g.confirmation_number || undefined,
        sortOrder: g.sort_order,
      })),
    flights: (row.flights ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((f: any): Flight => ({
        id: f.id,
        showId: f.show_id,
        passengerName: f.passenger_name ?? '',
        airline: f.airline ?? '',
        flightNumber: f.flight_number ?? '',
        origin: f.origin ?? '',
        destination: f.destination ?? '',
        flightDate: f.flight_date ?? undefined,
        classOfService: (f.class_of_service ?? 'coach') as FlightClass,
        sortOrder: f.sort_order,
      })),
    buyerContacts: (row.buyer_contacts ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((c: any): BuyerContact => ({
        id: c.id,
        showId: c.show_id,
        name: c.name ?? '',
        role: c.role ?? '',
        email: c.email ?? '',
        phone: c.phone || undefined,
        sortOrder: c.sort_order,
        invitedAt: c.invited_at ?? undefined,
        openedAt: c.opened_at ?? undefined,
        lastOpenedAt: c.last_opened_at ?? undefined,
        openCount: c.open_count ?? 0,
      })),
  }
}

// ── Shows ────────────────────────────────────────────────────────────────────

export async function getShows(workspaceId = 'default'): Promise<Show[]> {
  if (!isConfigured) throw new Error('Supabase not configured')
  const { data: shows, error } = await supabase
    .from('shows')
    .select('*, rider_items(*), messages(*), hotels(*), rooming_guests(*), flights(*), buyer_contacts(*)')
    .eq('workspace_id', workspaceId)
    .order('date', { ascending: true })

  if (error) throw error

  return (shows ?? []).map(row => mapShow(row))
}

export async function getShow(id: string): Promise<Show | null> {
  if (!isConfigured) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('shows')
    .select('*, rider_items(*), messages(*), hotels(*), rooming_guests(*), flights(*), buyer_contacts(*)')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return mapShow(data)
}

export async function createShow(show: Omit<Show, 'id' | 'items' | 'messages' | 'buyerCoversHotel' | 'buyerCoversFlights' | 'hotels' | 'roomingGuests' | 'flights' | 'buyerContacts'> & { items: Omit<RiderItem, 'id'>[] }, workspaceId = 'default'): Promise<string> {
  let itemsToInsert = show.items
  let masterRiderId: string | null = null
  let masterPdfUrl: string | null = null
  let masterVersion: string | null = null

  // Look up the artist's master rider regardless of how items were seeded —
  // the official rider PDF link is independent of item source (template vs master vs manual).
  const { data: master } = await supabase
    .from('rider_masters')
    .select('id, pdf_url, version, rider_master_items(*)')
    .eq('artist', show.artist)
    .eq('workspace_id', workspaceId)
    .single()

  if (master) {
    masterRiderId = master.id
    masterPdfUrl = master.pdf_url ?? null
    masterVersion = master.version ?? null
  }

  // Auto-populate items from master rider only if none were provided
  if (itemsToInsert.length === 0 && master?.rider_master_items?.length) {
    itemsToInsert = (master.rider_master_items as any[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(i => ({
        category: i.category,
        name: i.name,
        quantity: i.quantity,
        notes: i.notes ?? '',
        status: 'pending' as ItemStatus,
        buyerNote: '',
        imageUrl: i.image_url ?? undefined,
      }))
  }

  const { data, error } = await supabase
    .from('shows')
    .insert({
      artist: show.artist,
      venue: show.venue,
      city: show.city,
      venue_address: show.venueAddress ?? null,
      venue_lat: show.venueLat ?? null,
      venue_lng: show.venueLng ?? null,
      date: show.date,
      buyer_name: show.buyerName,
      buyer_email: show.buyerEmail,
      status: show.status,
      workspace_id: workspaceId,
      master_rider_id: masterRiderId,
      rider_pdf_url: masterPdfUrl,
      rider_version: masterVersion,
    })
    .select('id')
    .single()

  if (error || !data) throw error

  if (itemsToInsert.length > 0) {
    const { error: itemErr } = await supabase.from('rider_items').insert(
      itemsToInsert.map((item, idx) => ({
        show_id: data.id,
        category: item.category,
        name: item.name,
        quantity: item.quantity,
        notes: item.notes,
        status: 'pending' as ItemStatus,
        buyer_note: '',
        sort_order: idx,
        image_url: item.imageUrl ?? null,
      }))
    )
    if (itemErr) throw itemErr
  }

  return data.id
}

export async function updateShowStatus(showId: string, status: Show['status']) {
  const { error } = await supabase.from('shows').update({ status }).eq('id', showId)
  if (error) throw error
}

export async function resetShowRiderFromMaster(showId: string, artist: string, workspaceId = 'default'): Promise<void> {
  const { data: master, error: masterErr } = await supabase
    .from('rider_masters')
    .select('id, pdf_url, version, rider_master_items(*)')
    .eq('artist', artist)
    .eq('workspace_id', workspaceId)
    .single()

  if (masterErr || !master) throw new Error('No master rider found for this artist')

  const { error: deleteErr } = await supabase.from('rider_items').delete().eq('show_id', showId)
  if (deleteErr) throw deleteErr

  const items = (master.rider_master_items as any[] ?? []).sort((a, b) => a.sort_order - b.sort_order)
  if (items.length > 0) {
    const { error: insertErr } = await supabase.from('rider_items').insert(
      items.map((i, idx) => ({
        show_id: showId,
        category: i.category,
        name: i.name,
        quantity: i.quantity,
        notes: i.notes ?? '',
        status: 'pending' as ItemStatus,
        buyer_note: '',
        sort_order: idx,
        image_url: i.image_url ?? null,
      }))
    )
    if (insertErr) throw insertErr
  }

  const { error: showErr } = await supabase
    .from('shows')
    .update({
      master_rider_id: master.id,
      rider_pdf_url: master.pdf_url ?? null,
      rider_version: master.version ?? null,
    })
    .eq('id', showId)
  if (showErr) throw showErr
}

export async function updateBuyer(showId: string, buyerName: string, buyerEmail: string) {
  const { error } = await supabase.from('shows').update({ buyer_name: buyerName, buyer_email: buyerEmail }).eq('id', showId)
  if (error) throw error
}

export async function markBuyerInvited(showId: string): Promise<void> {
  const { error } = await supabase.from('shows').update({ buyer_invited_at: new Date().toISOString() }).eq('id', showId)
  if (error) throw error
}

// Records a link open — sets opened_at only the first time, always bumps
// last_opened_at/open_count. Targets the primary buyer (on `shows`) when no
// contactId is given, otherwise a specific `buyer_contacts` row.
export async function recordBuyerOpen(showId: string, contactId?: string): Promise<void> {
  const now = new Date().toISOString()
  if (contactId) {
    const { data } = await supabase.from('buyer_contacts').select('opened_at, open_count').eq('id', contactId).single()
    if (!data) return
    await supabase.from('buyer_contacts').update({
      opened_at: data.opened_at ?? now,
      last_opened_at: now,
      open_count: (data.open_count ?? 0) + 1,
    }).eq('id', contactId)
  } else {
    const { data } = await supabase.from('shows').select('buyer_opened_at, buyer_open_count').eq('id', showId).single()
    if (!data) return
    await supabase.from('shows').update({
      buyer_opened_at: data.buyer_opened_at ?? now,
      buyer_last_opened_at: now,
      buyer_open_count: (data.buyer_open_count ?? 0) + 1,
    }).eq('id', showId)
  }
}

export async function updateShowVenue(
  showId: string,
  fields: { venue?: string; city?: string; venueAddress?: string; venueLat?: number; venueLng?: number }
) {
  const dbFields: Record<string, unknown> = {}
  if (fields.venue !== undefined) dbFields.venue = fields.venue
  if (fields.city !== undefined) dbFields.city = fields.city
  if (fields.venueAddress !== undefined) dbFields.venue_address = fields.venueAddress
  if (fields.venueLat !== undefined) dbFields.venue_lat = fields.venueLat
  if (fields.venueLng !== undefined) dbFields.venue_lng = fields.venueLng
  const { error } = await supabase.from('shows').update(dbFields).eq('id', showId)
  if (error) throw error
}

export async function deleteShow(showId: string): Promise<void> {
  const { error } = await supabase.from('shows').delete().eq('id', showId)
  if (error) throw error
}

// ── Rider Items ───────────────────────────────────────────────────────────────

export async function deleteShowItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('rider_items').delete().eq('id', itemId)
  if (error) throw error
}

export async function updateItem(itemId: string, fields: { status?: ItemStatus; name?: string; buyer_note?: string; category?: string; quantity?: string; notes?: string; image_url?: string }) {
  const { error } = await supabase.from('rider_items').update(fields).eq('id', itemId)
  if (error) throw error
}

export async function addShowItem(
  showId: string,
  item: Pick<RiderItem, 'category' | 'name' | 'quantity' | 'notes'>,
  sortOrder: number
): Promise<RiderItem> {
  const { data, error } = await supabase
    .from('rider_items')
    .insert({ show_id: showId, ...item, status: 'pending' as ItemStatus, buyer_note: '', sort_order: sortOrder })
    .select()
    .single()
  if (error || !data) throw error
  return {
    id: data.id,
    category: data.category,
    name: data.name,
    quantity: data.quantity,
    notes: data.notes ?? '',
    status: data.status,
    buyerNote: data.buyer_note ?? '',
    imageUrl: data.image_url ?? undefined,
  }
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function sendMessage(showId: string, from: 'manager' | 'buyer', sender: string, text: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ show_id: showId, from_role: from, sender, text })
    .select()
    .single()

  if (error || !data) throw error

  return {
    id: data.id,
    from: data.from_role,
    sender: data.sender,
    text: data.text,
    timestamp: data.created_at,
  }
}

// ── Buyer Approval ────────────────────────────────────────────────────────────

export async function approveRider(showId: string, buyerName: string) {
  const { error } = await supabase
    .from('shows')
    .update({
      buyer_approved_at: new Date().toISOString(),
      buyer_approved_name: buyerName,
      status: 'confirmed',
    })
    .eq('id', showId)
  if (error) throw error
}

export async function saveShowDayOfShow(
  showId: string,
  data: {
    runOfShowText?: string
    runOfShowPdfUrl?: string
    curfew?: string
    dayOfShowContacts?: DayOfShowContacts
    buyerAttachments?: BuyerAttachment[]
  }
) {
  const fields: Record<string, unknown> = {}
  if (data.runOfShowText !== undefined) fields.run_of_show_text = data.runOfShowText
  if (data.runOfShowPdfUrl !== undefined) fields.run_of_show_pdf_url = data.runOfShowPdfUrl
  if (data.curfew !== undefined) fields.curfew = data.curfew
  if (data.dayOfShowContacts !== undefined) fields.day_of_show_contacts = data.dayOfShowContacts
  if (data.buyerAttachments !== undefined) fields.buyer_attachments = data.buyerAttachments
  const { error } = await supabase.from('shows').update(fields).eq('id', showId)
  if (error) throw error
}

// ── Master Riders ─────────────────────────────────────────────────────────────

function mapMasterRider(row: any): MasterRider {
  return {
    id: row.id,
    artist: row.artist,
    version: row.version,
    updatedAt: row.updated_at,
    pdfUrl: row.pdf_url ?? undefined,
    items: (row.rider_master_items ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((i: any): MasterRiderItem => ({
        id: i.id,
        masterId: i.master_id,
        category: i.category,
        name: i.name,
        quantity: i.quantity,
        notes: i.notes ?? '',
        sortOrder: i.sort_order,
        imageUrl: i.image_url ?? undefined,
      })),
  }
}

export async function getRiderMasters(workspaceId = 'default'): Promise<MasterRider[]> {
  const { data, error } = await supabase
    .from('rider_masters')
    .select('*, rider_master_items(*)')
    .eq('workspace_id', workspaceId)
    .order('artist')
  if (error) throw error
  return (data ?? []).map(mapMasterRider)
}

export async function getRiderMaster(artist: string): Promise<MasterRider | null> {
  const { data, error } = await supabase
    .from('rider_masters')
    .select('*, rider_master_items(*)')
    .eq('artist', artist)
    .single()
  if (error || !data) return null
  return mapMasterRider(data)
}

export async function seedRiderMasters(templates: Record<string, RiderTemplate[]>, workspaceId = 'default'): Promise<void> {
  for (const [artist, items] of Object.entries(templates)) {
    const { data: existing } = await supabase
      .from('rider_masters')
      .select('id')
      .eq('artist', artist)
      .eq('workspace_id', workspaceId)
      .single()

    let masterId: string
    if (existing) {
      masterId = existing.id
    } else {
      const { data, error } = await supabase
        .from('rider_masters')
        .insert({ artist, version: '1.0', workspace_id: workspaceId })
        .select('id')
        .single()
      if (error || !data) continue
      masterId = data.id
    }

    // Delete existing items and re-seed
    await supabase.from('rider_master_items').delete().eq('master_id', masterId)
    if (items.length > 0) {
      await supabase.from('rider_master_items').insert(
        items.map((item, idx) => ({
          master_id: masterId,
          category: item.category,
          name: item.name,
          quantity: item.quantity,
          notes: item.notes,
          sort_order: idx,
        }))
      )
    }
  }
}

export async function addMasterItem(
  masterId: string,
  item: Pick<MasterRiderItem, 'category' | 'name' | 'quantity' | 'notes'>,
  sortOrder: number
): Promise<MasterRiderItem> {
  const { data, error } = await supabase
    .from('rider_master_items')
    .insert({ master_id: masterId, ...item, sort_order: sortOrder })
    .select()
    .single()
  if (error || !data) throw error
  return {
    id: data.id,
    masterId: data.master_id,
    category: data.category,
    name: data.name,
    quantity: data.quantity,
    notes: data.notes ?? '',
    sortOrder: data.sort_order,
    imageUrl: data.image_url ?? undefined,
  }
}

export async function updateMasterItem(
  itemId: string,
  fields: Partial<Pick<MasterRiderItem, 'category' | 'name' | 'quantity' | 'notes' | 'sortOrder' | 'imageUrl'>>
): Promise<void> {
  const dbFields: Record<string, unknown> = {}
  if (fields.category !== undefined) dbFields.category = fields.category
  if (fields.name !== undefined) dbFields.name = fields.name
  if (fields.quantity !== undefined) dbFields.quantity = fields.quantity
  if (fields.notes !== undefined) dbFields.notes = fields.notes
  if (fields.sortOrder !== undefined) dbFields.sort_order = fields.sortOrder
  if (fields.imageUrl !== undefined) dbFields.image_url = fields.imageUrl
  const { error } = await supabase.from('rider_master_items').update(dbFields).eq('id', itemId)
  if (error) throw error
}

export async function deleteMasterItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('rider_master_items').delete().eq('id', itemId)
  if (error) throw error
}

export async function deleteMasterRider(masterId: string): Promise<void> {
  const { error } = await supabase.from('rider_masters').delete().eq('id', masterId)
  if (error) throw error
}

// Best-effort: when a photo is set on a show's rider item, also pin it on
// the matching master rider item (by name) so it's the permanent default
// for that artist going forward — no-ops if there's no master or no
// matching item, since not every show item exists on the master template.
export async function propagateItemImageToMaster(
  artist: string,
  itemName: string,
  imageUrl: string,
  workspaceId = 'default'
): Promise<void> {
  const { data: master } = await supabase
    .from('rider_masters')
    .select('id, rider_master_items(id, name)')
    .eq('artist', artist)
    .eq('workspace_id', workspaceId)
    .single()
  if (!master) return
  const match = (master.rider_master_items as any[] ?? []).find(
    (i) => i.name.trim().toLowerCase() === itemName.trim().toLowerCase()
  )
  if (!match) return
  await supabase.from('rider_master_items').update({ image_url: imageUrl }).eq('id', match.id)
}

export async function bumpMasterVersion(masterId: string, newVersion: string): Promise<void> {
  const { error } = await supabase
    .from('rider_masters')
    .update({ version: newVersion, updated_at: new Date().toISOString() })
    .eq('id', masterId)
  if (error) throw error
}

export async function saveMasterPdfUrl(masterId: string, pdfUrl: string | null): Promise<void> {
  const { error } = await supabase
    .from('rider_masters')
    .update({ pdf_url: pdfUrl })
    .eq('id', masterId)
  if (error) throw error
}

// ── Real-time subscriptions ───────────────────────────────────────────────────

export function subscribeToShow(showId: string, onUpdate: () => void) {
  const channel = supabase
    .channel(`show-${showId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_items', filter: `show_id=eq.${showId}` }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages',    filter: `show_id=eq.${showId}` }, onUpdate)
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

export function subscribeToAllShows(onUpdate: () => void) {
  const channel = supabase
    .channel('all-shows')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shows' },       onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_items' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' },    onUpdate)
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

// ── Rider PDF Sections ────────────────────────────────────────────────────────

function mapSection(row: any): RiderPdfSection {
  return {
    id: row.id,
    showId: row.show_id,
    label: row.label,
    publicUrl: row.public_url,
    storagePath: row.storage_path,
    sortOrder: row.sort_order,
  }
}

export async function getSections(showId: string): Promise<RiderPdfSection[]> {
  const { data } = await supabase
    .from('rider_pdf_sections')
    .select('*')
    .eq('show_id', showId)
    .order('sort_order')
  return (data ?? []).map(mapSection)
}

export async function getSectionsForShows(showIds: string[]): Promise<Record<string, RiderPdfSection[]>> {
  if (!showIds.length) return {}
  const { data } = await supabase
    .from('rider_pdf_sections')
    .select('*')
    .in('show_id', showIds)
    .order('sort_order')
  const out: Record<string, RiderPdfSection[]> = {}
  for (const row of data ?? []) {
    const s = mapSection(row)
    if (!out[s.showId]) out[s.showId] = []
    out[s.showId].push(s)
  }
  return out
}

export async function addSection(
  showId: string,
  label: string,
  publicUrl: string,
  storagePath: string,
  sortOrder: number
): Promise<RiderPdfSection> {
  const { data, error } = await supabase
    .from('rider_pdf_sections')
    .insert({ show_id: showId, label, public_url: publicUrl, storage_path: storagePath, sort_order: sortOrder })
    .select()
    .single()
  if (error) throw error
  return mapSection(data)
}

export async function deleteSection(id: string): Promise<void> {
  await supabase.from('rider_pdf_sections').delete().eq('id', id)
}

export async function updateSectionLabel(id: string, label: string): Promise<void> {
  await supabase.from('rider_pdf_sections').update({ label }).eq('id', id)
}

// ── Hotels + Rooming List ──────────────────────────────────────────────────────

function mapHotel(row: any): Hotel {
  return {
    id: row.id,
    showId: row.show_id,
    name: row.name,
    address: row.address || undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    sortOrder: row.sort_order,
  }
}

export async function addHotel(
  showId: string,
  fields: { name: string; address?: string; lat?: number; lng?: number },
  sortOrder: number
): Promise<Hotel> {
  const { data, error } = await supabase
    .from('hotels')
    .insert({ show_id: showId, name: fields.name, address: fields.address ?? '', lat: fields.lat ?? null, lng: fields.lng ?? null, sort_order: sortOrder })
    .select()
    .single()
  if (error || !data) throw error
  return mapHotel(data)
}

export async function updateHotel(
  id: string,
  fields: Partial<{ name: string; address: string; lat: number; lng: number }>
): Promise<void> {
  const { error } = await supabase.from('hotels').update(fields).eq('id', id)
  if (error) throw error
}

export async function deleteHotel(id: string): Promise<void> {
  const { error } = await supabase.from('hotels').delete().eq('id', id)
  if (error) throw error
}

function mapRoomingGuest(row: any): RoomingGuest {
  return {
    id: row.id,
    showId: row.show_id,
    hotelId: row.hotel_id ?? undefined,
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    roomType: row.room_type ?? '',
    checkinDate: row.checkin_date ?? undefined,
    checkoutDate: row.checkout_date ?? undefined,
    confirmationNumber: row.confirmation_number || undefined,
    sortOrder: row.sort_order,
  }
}

export async function addRoomingGuest(
  showId: string,
  fields: { hotelId?: string; firstName: string; lastName: string; roomType?: string; checkinDate?: string; checkoutDate?: string; confirmationNumber?: string },
  sortOrder: number
): Promise<RoomingGuest> {
  const { data, error } = await supabase
    .from('rooming_guests')
    .insert({
      show_id: showId,
      hotel_id: fields.hotelId || null,
      first_name: fields.firstName,
      last_name: fields.lastName,
      room_type: fields.roomType ?? '',
      checkin_date: fields.checkinDate || null,
      checkout_date: fields.checkoutDate || null,
      confirmation_number: fields.confirmationNumber || null,
      sort_order: sortOrder,
    })
    .select()
    .single()
  if (error || !data) throw error
  return mapRoomingGuest(data)
}

export async function updateRoomingGuest(
  id: string,
  fields: Partial<{ hotelId: string; firstName: string; lastName: string; roomType: string; checkinDate: string; checkoutDate: string; confirmationNumber: string }>
): Promise<void> {
  const dbFields: Record<string, unknown> = {}
  if (fields.hotelId !== undefined) dbFields.hotel_id = fields.hotelId || null
  if (fields.firstName !== undefined) dbFields.first_name = fields.firstName
  if (fields.lastName !== undefined) dbFields.last_name = fields.lastName
  if (fields.roomType !== undefined) dbFields.room_type = fields.roomType
  if (fields.checkinDate !== undefined) dbFields.checkin_date = fields.checkinDate || null
  if (fields.checkoutDate !== undefined) dbFields.checkout_date = fields.checkoutDate || null
  if (fields.confirmationNumber !== undefined) dbFields.confirmation_number = fields.confirmationNumber || null
  const { error } = await supabase.from('rooming_guests').update(dbFields).eq('id', id)
  if (error) throw error
}

export async function deleteRoomingGuest(id: string): Promise<void> {
  const { error } = await supabase.from('rooming_guests').delete().eq('id', id)
  if (error) throw error
}

// ── Flights ─────────────────────────────────────────────────────────────────────

function mapFlight(row: any): Flight {
  return {
    id: row.id,
    showId: row.show_id,
    passengerName: row.passenger_name ?? '',
    airline: row.airline ?? '',
    flightNumber: row.flight_number ?? '',
    origin: row.origin ?? '',
    destination: row.destination ?? '',
    flightDate: row.flight_date ?? undefined,
    classOfService: (row.class_of_service ?? 'coach') as FlightClass,
    sortOrder: row.sort_order,
  }
}

export async function addFlight(
  showId: string,
  fields: { passengerName: string; airline: string; flightNumber: string; origin: string; destination: string; flightDate?: string; classOfService: FlightClass },
  sortOrder: number
): Promise<Flight> {
  const { data, error } = await supabase
    .from('flights')
    .insert({
      show_id: showId,
      passenger_name: fields.passengerName,
      airline: fields.airline,
      flight_number: fields.flightNumber,
      origin: fields.origin,
      destination: fields.destination,
      flight_date: fields.flightDate || null,
      class_of_service: fields.classOfService,
      sort_order: sortOrder,
    })
    .select()
    .single()
  if (error || !data) throw error
  return mapFlight(data)
}

export async function updateFlight(
  id: string,
  fields: Partial<{ passengerName: string; airline: string; flightNumber: string; origin: string; destination: string; flightDate: string; classOfService: FlightClass }>
): Promise<void> {
  const dbFields: Record<string, unknown> = {}
  if (fields.passengerName !== undefined) dbFields.passenger_name = fields.passengerName
  if (fields.airline !== undefined) dbFields.airline = fields.airline
  if (fields.flightNumber !== undefined) dbFields.flight_number = fields.flightNumber
  if (fields.origin !== undefined) dbFields.origin = fields.origin
  if (fields.destination !== undefined) dbFields.destination = fields.destination
  if (fields.flightDate !== undefined) dbFields.flight_date = fields.flightDate || null
  if (fields.classOfService !== undefined) dbFields.class_of_service = fields.classOfService
  const { error } = await supabase.from('flights').update(dbFields).eq('id', id)
  if (error) throw error
}

export async function deleteFlight(id: string): Promise<void> {
  const { error } = await supabase.from('flights').delete().eq('id', id)
  if (error) throw error
}

// ── Buyer Contacts ─────────────────────────────────────────────────────────────

function mapBuyerContact(row: any): BuyerContact {
  return {
    id: row.id,
    showId: row.show_id,
    name: row.name ?? '',
    role: row.role ?? '',
    email: row.email ?? '',
    phone: row.phone || undefined,
    sortOrder: row.sort_order,
    invitedAt: row.invited_at ?? undefined,
    openedAt: row.opened_at ?? undefined,
    lastOpenedAt: row.last_opened_at ?? undefined,
    openCount: row.open_count ?? 0,
  }
}

export async function addBuyerContact(
  showId: string,
  fields: { name: string; role: string; email: string; phone?: string },
  sortOrder: number
): Promise<BuyerContact> {
  const { data, error } = await supabase
    .from('buyer_contacts')
    .insert({
      show_id: showId,
      name: fields.name,
      role: fields.role,
      email: fields.email,
      phone: fields.phone || null,
      sort_order: sortOrder,
    })
    .select()
    .single()
  if (error || !data) throw error
  return mapBuyerContact(data)
}

export async function updateBuyerContact(
  id: string,
  fields: Partial<{ name: string; role: string; email: string; phone: string }>
): Promise<void> {
  const dbFields: Record<string, unknown> = {}
  if (fields.name !== undefined) dbFields.name = fields.name
  if (fields.role !== undefined) dbFields.role = fields.role
  if (fields.email !== undefined) dbFields.email = fields.email
  if (fields.phone !== undefined) dbFields.phone = fields.phone || null
  const { error } = await supabase.from('buyer_contacts').update(dbFields).eq('id', id)
  if (error) throw error
}

export async function deleteBuyerContact(id: string): Promise<void> {
  const { error } = await supabase.from('buyer_contacts').delete().eq('id', id)
  if (error) throw error
}

export async function markContactInvited(contactId: string): Promise<void> {
  const { error } = await supabase.from('buyer_contacts').update({ invited_at: new Date().toISOString() }).eq('id', contactId)
  if (error) throw error
}

export async function updateShowTravelFlags(showId: string, fields: { buyerCoversHotel?: boolean; buyerCoversFlights?: boolean }): Promise<void> {
  const dbFields: Record<string, unknown> = {}
  if (fields.buyerCoversHotel !== undefined) dbFields.buyer_covers_hotel = fields.buyerCoversHotel
  if (fields.buyerCoversFlights !== undefined) dbFields.buyer_covers_flights = fields.buyerCoversFlights
  const { error } = await supabase.from('shows').update(dbFields).eq('id', showId)
  if (error) throw error
}

// ── Artist Management Contacts ────────────────────────────────────────────────

export interface ManagementContact {
  id: string
  artist: string
  name: string
  email: string
  phone: string
  role: string
  sortOrder: number
}

function mapContact(row: any): ManagementContact {
  return {
    id: row.id,
    artist: row.artist,
    name: row.name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    role: row.role ?? 'Management',
    sortOrder: row.sort_order ?? 0,
  }
}

export async function getManagementContacts(artist: string): Promise<ManagementContact[]> {
  const { data } = await supabase
    .from('artist_management')
    .select('*')
    .eq('artist', artist)
    .order('sort_order')
  return (data ?? []).map(mapContact)
}

export async function getAllManagementContacts(workspaceId = 'default'): Promise<Record<string, ManagementContact[]>> {
  const { data } = await supabase
    .from('artist_management')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('sort_order')
  const out: Record<string, ManagementContact[]> = {}
  for (const row of data ?? []) {
    const c = mapContact(row)
    if (!out[c.artist]) out[c.artist] = []
    out[c.artist].push(c)
  }
  return out
}

export async function addManagementContact(
  artist: string,
  contact: Omit<ManagementContact, 'id' | 'artist' | 'sortOrder'>,
  sortOrder: number,
  workspaceId = 'default'
): Promise<ManagementContact> {
  const { data, error } = await supabase
    .from('artist_management')
    .insert({ artist, ...contact, sort_order: sortOrder, workspace_id: workspaceId })
    .select()
    .single()
  if (error || !data) throw error
  return mapContact(data)
}

export async function updateManagementContact(
  id: string,
  fields: Partial<Pick<ManagementContact, 'name' | 'email' | 'phone' | 'role'>>
): Promise<void> {
  const { error } = await supabase.from('artist_management').update(fields).eq('id', id)
  if (error) throw error
}

export async function deleteManagementContact(id: string): Promise<void> {
  await supabase.from('artist_management').delete().eq('id', id)
}

// ── Community Photos ──────────────────────────────────────────────────────────

export interface CommunityPhoto {
  id: string
  keyword: string
  url: string
  uploadedBy: string
}

export async function getCommunityPhotos(workspaceId = 'default'): Promise<CommunityPhoto[]> {
  const { data } = await supabase
    .from('community_photos')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  return (data ?? []).map(row => ({
    id: row.id,
    keyword: row.keyword,
    url: row.url,
    uploadedBy: row.workspace_id ?? '',
  }))
}

export async function updateCommunityPhoto(id: string, keyword: string): Promise<void> {
  const { error } = await supabase.from('community_photos').update({ keyword: keyword.trim().toLowerCase() }).eq('id', id)
  if (error) throw error
}

export async function deleteCommunityPhoto(id: string): Promise<void> {
  const { error } = await supabase.from('community_photos').delete().eq('id', id)
  if (error) throw error
}

// ── Workspaces ────────────────────────────────────────────────────────────────

export async function getWorkspace(id: string): Promise<{ companyName: string } | null> {
  const { data } = await supabase.from('workspaces').select('company_name').eq('id', id).single()
  return data ? { companyName: data.company_name } : null
}
