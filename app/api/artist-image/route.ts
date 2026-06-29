import { NextRequest, NextResponse } from 'next/server'

const cache = new Map<string, string | null>()

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name') ?? ''
  if (!name) return NextResponse.json({ url: null })

  if (cache.has(name)) {
    return NextResponse.json({ url: cache.get(name) ?? null })
  }

  try {
    const res = await fetch(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=3`,
      { next: { revalidate: 86400 } }
    )
    const data = await res.json()

    // Pick the first result whose name roughly matches
    const nameLower = name.toLowerCase()
    const match = (data?.data ?? []).find((a: any) =>
      a.name?.toLowerCase().includes(nameLower.split(' ').at(-1)!) ||
      nameLower.includes(a.name?.toLowerCase())
    ) ?? data?.data?.[0]

    const url: string | null = match?.picture_big ?? match?.picture_medium ?? null
    cache.set(name, url)
    return NextResponse.json({ url })
  } catch {
    cache.set(name, null)
    return NextResponse.json({ url: null })
  }
}
