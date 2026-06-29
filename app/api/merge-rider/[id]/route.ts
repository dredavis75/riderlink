import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const STATIC_RIDERS: Record<string, string> = {
  'G Herbo': '/riders/g-herbo-2026.pdf',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://riderlink.vercel.app'

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Load show + sections in parallel
  const [{ data: show }, { data: sections }] = await Promise.all([
    sb.from('shows').select('artist, venue, rider_pdf_url').eq('id', id).single(),
    sb.from('rider_pdf_sections').select('*').eq('show_id', id).order('sort_order'),
  ])

  // Build ordered list of PDFs to merge
  const sources: { label: string; url: string }[] = []

  if (sections?.length) {
    sources.push(...sections.map((s: any) => ({ label: s.label, url: s.public_url })))
  } else if (show?.rider_pdf_url) {
    sources.push({ label: 'Official Rider', url: show.rider_pdf_url })
  } else {
    // Fall back to static mapping
    const al = (show?.artist ?? '').toLowerCase()
    const key = Object.keys(STATIC_RIDERS).find(k =>
      k.toLowerCase() === al || al.includes(k.toLowerCase().split(' ').at(-1)!)
    )
    if (key) sources.push({ label: `${show?.artist} Official Rider`, url: `${base}${STATIC_RIDERS[key]}` })
  }

  if (!sources.length) {
    return new NextResponse('No rider PDFs found for this show.', { status: 404 })
  }

  // Single PDF — no merge needed, redirect directly
  if (sources.length === 1) {
    return NextResponse.redirect(sources[0].url)
  }

  // Merge multiple PDFs with pdf-lib (preserves hyperlinks & annotations)
  const merged = await PDFDocument.create()

  for (const { url, label } of sources) {
    try {
      const res = await fetch(url)
      if (!res.ok) { console.warn(`Skipping ${label}: HTTP ${res.status}`); continue }
      const bytes = await res.arrayBuffer()
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
      const pages = await merged.copyPages(doc, doc.getPageIndices())
      pages.forEach(p => merged.addPage(p))
    } catch (err) {
      console.error(`Failed to load "${label}":`, err)
    }
  }

  const artist = show?.artist ?? 'Rider'
  const filename = `${artist.replace(/\s+/g, '-')}-Official-Rider.pdf`
  const bytes = await merged.save()

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
