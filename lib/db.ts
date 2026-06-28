import { supabase, isConfigured } from './supabase'
import type { Show, RiderItem, Message, ItemStatus } from './data'

// ── Shows ────────────────────────────────────────────────────────────────────

export async function getShows(): Promise<Show[]> {
  if (!isConfigured) throw new Error('Supabase not configured')
  const { data: shows, error } = await supabase
    .from('shows')
    .select('*, rider_items(*), messages(*)')
    .order('date', { ascending: true })

  if (error) throw error

  return (shows ?? []).map(row => ({
    id: row.id,
    artist: row.artist,
    venue: row.venue,
    city: row.city,
    date: row.date,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    status: row.status,
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
  }))
}

export async function getShow(id: string): Promise<Show | null> {
  if (!isConfigured) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('shows')
    .select('*, rider_items(*), messages(*)')
    .eq('id', id)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    artist: data.artist,
    venue: data.venue,
    city: data.city,
    date: data.date,
    buyerName: data.buyer_name,
    buyerEmail: data.buyer_email,
    status: data.status,
    items: (data.rider_items ?? [])
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
    messages: (data.messages ?? [])
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
