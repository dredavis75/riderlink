import { NextRequest, NextResponse } from 'next/server'

const KEY = process.env.GOOGLE_PLACES_KEY ?? ''

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const placeId = req.nextUrl.searchParams.get('placeId') ?? ''

  if (!KEY) return NextResponse.json({ error: 'not configured' }, { status: 500 })

  // Place details — get city + address for a selected place
  if (placeId) {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,address_components&key=${KEY}`
    const res = await fetch(url)
    const data = await res.json()
    const comps: any[] = data.result?.address_components ?? []
    const city = comps.find((c: any) => c.types.includes('locality'))?.long_name ?? ''
    const state = comps.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name ?? ''
    return NextResponse.json({
      name: data.result?.name ?? '',
      address: data.result?.formatted_address ?? '',
      city: city && state ? `${city}, ${state}` : city,
    })
  }

  // Autocomplete — search venues by name or city
  if (!q || q.length < 2) return NextResponse.json({ predictions: [] })

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&types=establishment&key=${KEY}`
  const res = await fetch(url)
  const data = await res.json()

  const predictions = (data.predictions ?? []).map((p: any) => ({
    placeId: p.place_id,
    name: p.structured_formatting?.main_text ?? p.description,
    secondary: p.structured_formatting?.secondary_text ?? '',
  }))

  return NextResponse.json({ predictions })
}
