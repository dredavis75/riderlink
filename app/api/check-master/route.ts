import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: masters } = await sb.from('rider_masters').select('id, artist, pdf_url')
  const results = []
  for (const m of masters ?? []) {
    const { count } = await sb.from('rider_master_items').select('*', { count: 'exact', head: true }).eq('master_id', m.id)
    results.push({ artist: m.artist, hasPdf: !!m.pdf_url, itemCount: count })
  }
  return NextResponse.json({ results })
}
