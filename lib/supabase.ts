import { createClient } from '@supabase/supabase-js'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const isConfigured = rawUrl.startsWith('https://') && rawKey.length > 20

const url = isConfigured ? rawUrl : 'https://xyzplaceholder.supabase.co'
const key = isConfigured ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'

export const supabase = createClient(url, key)

export type Database = {
  shows: {
    Row: {
      id: string
      artist: string
      venue: string
      city: string
      date: string
      buyer_name: string
      buyer_email: string
      status: 'draft' | 'sent' | 'active' | 'confirmed'
      created_at: string
    }
    Insert: Omit<Database['shows']['Row'], 'created_at'>
    Update: Partial<Database['shows']['Insert']>
  }
  rider_items: {
    Row: {
      id: string
      show_id: string
      category: string
      name: string
      quantity: string
      notes: string
      status: 'pending' | 'confirmed' | 'unavailable' | 'substituted'
      buyer_note: string
      sort_order: number
    }
    Insert: Omit<Database['rider_items']['Row'], never>
    Update: Partial<Database['rider_items']['Insert']>
  }
  messages: {
    Row: {
      id: string
      show_id: string
      from_role: 'manager' | 'buyer'
      sender: string
      text: string
      created_at: string
    }
    Insert: Omit<Database['messages']['Row'], 'id' | 'created_at'>
    Update: never
  }
}
