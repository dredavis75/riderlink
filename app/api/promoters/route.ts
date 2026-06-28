import { NextRequest, NextResponse } from 'next/server'
import { supabase, isConfigured } from '@/lib/supabase'
import { MOCK_SHOWS } from '@/lib/data'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''

  if (!isConfigured) {
    const buyers = MOCK_SHOWS.map(s => ({ name: s.buyerName, email: s.buyerEmail, venue: s.venue, city: s.city }))
    const filtered = q ? buyers.filter(b => b.name.toLowerCase().includes(q.toLowerCase())) : buyers
    return NextResponse.json({ promoters: filtered })
  }

  const { data, error } = await supabase
    .from('shows')
    .select('buyer_name, buyer_email, venue, city')
    .ilike('buyer_name', `%${q}%`)
    .order('buyer_name')

  if (error) return NextResponse.json({ promoters: [] })

  // Deduplicate by email
  const seen = new Set<string>()
  const promoters = (data ?? [])
    .filter(r => {
      if (!r.buyer_email || seen.has(r.buyer_email)) return false
      seen.add(r.buyer_email)
      return true
    })
    .map(r => ({ name: r.buyer_name, email: r.buyer_email, venue: r.venue, city: r.city }))

  return NextResponse.json({ promoters })
}
