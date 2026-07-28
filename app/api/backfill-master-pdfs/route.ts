import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: masters } = await sb
    .from('rider_masters')
    .select('id, artist, pdf_url')

  const results: { artist: string; action: string }[] = []

  for (const master of masters ?? []) {
    if (master.pdf_url) {
      results.push({ artist: master.artist, action: 'already has PDF' })
      continue
    }

    const { data: shows } = await sb
      .from('shows')
      .select('id, rider_pdf_url, created_at')
      .eq('artist', master.artist)
      .order('created_at', { ascending: false })

    let foundUrl: string | null = null
    for (const show of shows ?? []) {
      const { data: sections } = await sb
        .from('rider_pdf_sections')
        .select('public_url')
        .eq('show_id', show.id)
        .order('sort_order')
        .limit(1)
      if (sections?.[0]?.public_url) { foundUrl = sections[0].public_url; break }
      if (show.rider_pdf_url) { foundUrl = show.rider_pdf_url; break }
    }

    if (foundUrl) {
      await sb.from('rider_masters').update({ pdf_url: foundUrl }).eq('id', master.id)
      results.push({ artist: master.artist, action: `backfilled from show PDF` })
    } else {
      results.push({ artist: master.artist, action: 'no PDF found anywhere — still needs manual upload' })
    }
  }

  return NextResponse.json({ results })
}
