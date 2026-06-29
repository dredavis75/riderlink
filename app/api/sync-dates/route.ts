import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export interface TourDate {
  sourceId: string
  source: 'bandsintown' | 'songkick' | 'ticketmaster' | 'seatgeek'
  artist: string
  venue: string
  city: string
  country: string
  date: string       // ISO date string YYYY-MM-DD
  time?: string      // HH:MM
  status: 'confirmed' | 'cancelled' | 'postponed' | 'rescheduled'
  ticketUrl?: string
  onSale?: boolean
}

// ── Bandsintown (no key needed) ───────────────────────────────────────────────

async function fetchBandsintown(artist: string): Promise<TourDate[]> {
  const encoded = encodeURIComponent(artist)
  const url = `https://rest.bandsintown.com/artists/${encoded}/events?app_id=riderlink&date=upcoming`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return []
  const data = await res.json()
  if (!Array.isArray(data)) return []
  return data.map((e: any) => ({
    sourceId: `bit-${e.id}`,
    source: 'bandsintown' as const,
    artist,
    venue: e.venue?.name ?? '',
    city: e.venue?.city ?? '',
    country: e.venue?.country ?? '',
    date: e.datetime?.split('T')[0] ?? '',
    time: e.datetime?.split('T')[1]?.slice(0, 5),
    status: (e.status === 'cancelled' ? 'cancelled'
          : e.status === 'postponed' ? 'postponed'
          : 'confirmed') as TourDate['status'],
    ticketUrl: e.url,
    onSale: !!e.offers?.length,
  })).filter(e => e.date)
}

// ── Songkick (requires free API key) ─────────────────────────────────────────

async function fetchSongkick(artist: string): Promise<TourDate[]> {
  const key = process.env.SONGKICK_API_KEY
  if (!key) return []
  // Step 1: search for artist
  const searchRes = await fetch(
    `https://api.songkick.com/api/3.0/search/artists.json?query=${encodeURIComponent(artist)}&apikey=${key}`
  )
  if (!searchRes.ok) return []
  const searchData = await searchRes.json()
  const artists = searchData?.resultsPage?.results?.artist
  if (!artists?.length) return []

  const skArtistId = artists[0].id

  // Step 2: get upcoming events
  const evRes = await fetch(
    `https://api.songkick.com/api/3.0/artists/${skArtistId}/calendar.json?apikey=${key}`
  )
  if (!evRes.ok) return []
  const evData = await evRes.json()
  const events = evData?.resultsPage?.results?.event
  if (!Array.isArray(events)) return []

  return events.map((e: any) => ({
    sourceId: `sk-${e.id}`,
    source: 'songkick' as const,
    artist,
    venue: e.venue?.displayName ?? '',
    city: e.location?.city?.split(',')[0] ?? '',
    country: e.location?.city?.split(', ').pop() ?? '',
    date: e.start?.date ?? '',
    time: e.start?.time?.slice(0, 5),
    status: (e.status === 'cancelled' ? 'cancelled' : 'confirmed') as TourDate['status'],
    ticketUrl: e.uri,
    onSale: e.status === 'ok',
  })).filter(e => e.date)
}

// ── Ticketmaster (requires free API key) ──────────────────────────────────────

async function fetchTicketmaster(artist: string): Promise<TourDate[]> {
  const key = process.env.TICKETMASTER_API_KEY
  if (!key) return []
  const url = `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${encodeURIComponent(artist)}&classificationName=music&size=50&apikey=${key}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  const events = data?._embedded?.events
  if (!Array.isArray(events)) return []

  return events.map((e: any) => {
    const venue = e._embedded?.venues?.[0]
    return {
      sourceId: `tm-${e.id}`,
      source: 'ticketmaster' as const,
      artist,
      venue: venue?.name ?? '',
      city: venue?.city?.name ?? '',
      country: venue?.country?.countryCode ?? '',
      date: e.dates?.start?.localDate ?? '',
      time: e.dates?.start?.localTime?.slice(0, 5),
      status: (e.dates?.status?.code === 'cancelled' ? 'cancelled'
            : e.dates?.status?.code === 'postponed' ? 'postponed'
            : 'confirmed') as TourDate['status'],
      ticketUrl: e.url,
      onSale: e.dates?.status?.code === 'onsale',
    }
  }).filter(e => e.date && e.venue)
}

// ── SeatGeek (requires free API key) ─────────────────────────────────────────

async function fetchSeatGeek(artist: string): Promise<TourDate[]> {
  const clientId = process.env.SEATGEEK_CLIENT_ID
  if (!clientId) return []
  const url = `https://api.seatgeek.com/2/events?performers.slug=${encodeURIComponent(artist.toLowerCase().replace(/\s+/g, '-'))}&per_page=50&client_id=${clientId}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  if (!Array.isArray(data?.events)) return []

  return (data.events as any[]).map((e) => ({
    sourceId: `sg-${e.id}`,
    source: 'seatgeek' as const,
    artist,
    venue: e.venue?.name ?? '',
    city: e.venue?.city ?? '',
    country: e.venue?.country ?? '',
    date: e.datetime_local?.split('T')[0] ?? '',
    time: e.datetime_local?.split('T')[1]?.slice(0, 5),
    status: (e.status === 'cancelled' ? 'cancelled' : 'confirmed') as TourDate['status'],
    ticketUrl: e.url,
    onSale: e.stats?.listing_count > 0,
  })).filter(e => e.date)
}

// ── Deduplication ─────────────────────────────────────────────────────────────

function deduplicate(dates: TourDate[]): TourDate[] {
  const seen = new Map<string, TourDate>()
  // Priority: bandsintown > songkick > ticketmaster > seatgeek
  const priority = { bandsintown: 0, songkick: 1, ticketmaster: 2, seatgeek: 3 }

  for (const d of dates) {
    // Key: artist + date + normalized venue (first 6 chars covers "Radio City" vs "Radio City Music Hall")
    const key = `${d.artist.toLowerCase()}|${d.date}|${d.venue.toLowerCase().slice(0, 6)}`
    const existing = seen.get(key)
    if (!existing || priority[d.source] < priority[existing.source]) {
      seen.set(key, d)
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const artistsParam = searchParams.get('artists')

  if (!artistsParam) {
    return NextResponse.json({ error: 'artists param required' }, { status: 400 })
  }

  const artists = artistsParam.split(',').map(a => a.trim()).filter(Boolean)

  const results = await Promise.allSettled(
    artists.flatMap(artist => [
      fetchBandsintown(artist),
      fetchSongkick(artist),
      fetchTicketmaster(artist),
      fetchSeatGeek(artist),
    ])
  )

  const allDates: TourDate[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') allDates.push(...r.value)
  }

  const deduped = deduplicate(allDates)

  const sources = {
    bandsintown: !!(true), // always available
    songkick: !!process.env.SONGKICK_API_KEY,
    ticketmaster: !!process.env.TICKETMASTER_API_KEY,
    seatgeek: !!process.env.SEATGEEK_CLIENT_ID,
  }

  return NextResponse.json({ dates: deduped, total: deduped.length, sources })
}
