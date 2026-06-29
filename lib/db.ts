import { supabase, isConfigured } from './supabase'
import type { Show, RiderItem, Message, ItemStatus, MasterRider, MasterRiderItem, RiderTemplate, RiderPdfSection } from './data'

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapShow(row: any): Show {
  return {
    id: row.id,
    artist: row.artist,
    venue: row.venue,
    city: row.city,
    date: row.date,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    status: row.status,
    buyerApprovedAt: row.buyer_approved_at ?? undefined,
    buyerApprovedName: row.buyer_approved_name ?? undefined,
    riderVersion: row.rider_version ?? undefined,
    riderPdfUrl: row.rider_pdf_url ?? undefined,
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
  }
}

// ── Shows ────────────────────────────────────────────────────────────────────

export async function getShows(): Promise<Show[]> {
  if (!isConfigured) throw new Error('Supabase not configured')
  const { data: shows, error } = await supabase
    .from('shows')
    .select('*, rider_items(*), messages(*)')
    .order('date', { ascending: true })

  if (error) throw error

  return (shows ?? []).map(row => mapShow(row))
}

export async function getShow(id: string): Promise<Show | null> {
  if (!isConfigured) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('shows')
    .select('*, rider_items(*), messages(*)')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return mapShow(data)
}

export async function createShow(show: Omit<Show, 'id' | 'items' | 'messages'> & { items: Omit<RiderItem, 'id'>[] }): Promise<string> {
  const { data, error } = await supabase
    .from('shows')
    .insert({
      artist: show.artist,
      venue: show.venue,
      city: show.city,
      date: show.date,
      buyer_name: show.buyerName,
      buyer_email: show.buyerEmail,
      status: show.status,
    })
    .select('id')
    .single()

  if (error || !data) throw error

  if (show.items.length > 0) {
    const { error: itemErr } = await supabase.from('rider_items').insert(
      show.items.map((item, idx) => ({
        show_id: data.id,
        category: item.category,
        name: item.name,
        quantity: item.quantity,
        notes: item.notes,
        status: 'pending' as ItemStatus,
        buyer_note: '',
        sort_order: idx,
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

// ── Rider Items ───────────────────────────────────────────────────────────────

export async function updateItem(itemId: string, fields: { status?: ItemStatus; name?: string; buyer_note?: string }) {
  const { error } = await supabase.from('rider_items').update(fields).eq('id', itemId)
  if (error) throw error
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

// ── Master Riders ─────────────────────────────────────────────────────────────

function mapMasterRider(row: any): MasterRider {
  return {
    id: row.id,
    artist: row.artist,
    version: row.version,
    updatedAt: row.updated_at,
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
      })),
  }
}

export async function getRiderMasters(): Promise<MasterRider[]> {
  const { data, error } = await supabase
    .from('rider_masters')
    .select('*, rider_master_items(*)')
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

export async function seedRiderMasters(templates: Record<string, RiderTemplate[]>): Promise<void> {
  for (const [artist, items] of Object.entries(templates)) {
    const { data: existing } = await supabase
      .from('rider_masters')
      .select('id')
      .eq('artist', artist)
      .single()

    let masterId: string
    if (existing) {
      masterId = existing.id
    } else {
      const { data, error } = await supabase
        .from('rider_masters')
        .insert({ artist, version: '1.0' })
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
  }
}

export async function updateMasterItem(
  itemId: string,
  fields: Partial<Pick<MasterRiderItem, 'category' | 'name' | 'quantity' | 'notes' | 'sortOrder'>>
): Promise<void> {
  const dbFields: Record<string, unknown> = {}
  if (fields.category !== undefined) dbFields.category = fields.category
  if (fields.name !== undefined) dbFields.name = fields.name
  if (fields.quantity !== undefined) dbFields.quantity = fields.quantity
  if (fields.notes !== undefined) dbFields.notes = fields.notes
  if (fields.sortOrder !== undefined) dbFields.sort_order = fields.sortOrder
  const { error } = await supabase.from('rider_master_items').update(dbFields).eq('id', itemId)
  if (error) throw error
}

export async function deleteMasterItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('rider_master_items').delete().eq('id', itemId)
  if (error) throw error
}

export async function bumpMasterVersion(masterId: string, newVersion: string): Promise<void> {
  const { error } = await supabase
    .from('rider_masters')
    .update({ version: newVersion, updated_at: new Date().toISOString() })
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
