import { NextRequest, NextResponse } from 'next/server'

// Wikipedia article titles for known artists (fallback if Deezer fails)
const WIKIPEDIA: Record<string, string> = {
  'G Herbo':     'G_Herbo',
  'Keyshia Cole':'Keyshia_Cole',
  'Flo Milli':   'Flo_Milli',
  'K. Michelle': 'K._Michelle',
  'RL':          'RL_(singer)',
}

const cache = new Map<string, string | null>()

async function fromDeezer(name: string): Promise<string | null> {
  const res = await fetch(
    `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=5`,
    { next: { revalidate: 86400 * 7 } }
  )
  if (!res.ok) return null
  const data = await res.json()
  const items: any[] = data?.data ?? []
  if (!items.length) return null

  const nl = name.toLowerCase()
  const match =
    items.find((a) => a.name?.toLowerCase() === nl) ??
    items.find((a) => a.name?.toLowerCase().includes(nl) || nl.includes(a.name?.toLowerCase())) ??
    items[0]

  // picture_big is 500×500 on Deezer's CDN
  return match?.picture_big ?? match?.picture_medium ?? null
}

async function fromWikipedia(artist: string): Promise<string | null> {
  const title = WIKIPEDIA[artist]
  if (!title) return null
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
    {
      headers: { 'User-Agent': 'RiderLink/1.0 (dre.davis@ybtouring.com)' },
      next: { revalidate: 86400 * 7 },
    }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.originalimage?.source ?? data.thumbnail?.source ?? null
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name') ?? ''
  if (!name) return NextResponse.json({ url: null })

  if (cache.has(name)) return NextResponse.json({ url: cache.get(name) ?? null })

  let url: string | null = null
  try { url = await fromDeezer(name) } catch {}
  if (!url) {
    try { url = await fromWikipedia(name) } catch {}
  }

  cache.set(name, url)
  return NextResponse.json({ url }, {
    headers: { 'Cache-Control': 'public, max-age=604800' },
  })
}
