import { NextRequest, NextResponse } from 'next/server'

const KEY = process.env.GOOGLE_PLACES_KEY ?? ''

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const placeId = req.nextUrl.searchParams.get('placeId') ?? ''
  const address = req.nextUrl.searchParams.get('address') ?? ''

  if (!KEY) return NextResponse.json({ error: 'not configured' }, { status: 500 })

  // Place details — get city + address + coordinates for a selected place
  if (placeId) {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,address_components,geometry&key=${KEY}`
    const res = await fetch(url)
    const data = await res.json()
    const comps: any[] = data.result?.address_components ?? []
    const city = comps.find((c: any) => c.types.includes('locality'))?.long_name ?? ''
    const state = comps.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name ?? ''
    const loc = data.result?.geometry?.location
    return NextResponse.json({
      name: data.result?.name ?? '',
      address: data.result?.formatted_address ?? '',
      city: city && state ? `${city}, ${state}` : city,
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
    })
  }

  // Geocode a manually-typed address — fallback when a venue isn't in Places
  if (address) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${KEY}`
    const res = await fetch(url)
    const data = await res.json()
    const result = data.results?.[0]
    if (!result) return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    const comps: any[] = result.address_components ?? []
    const city = comps.find((c: any) => c.types.includes('locality'))?.long_name ?? ''
    const state = comps.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name ?? ''
    return NextResponse.json({
      address: result.formatted_address ?? address,
      city: city && state ? `${city}, ${state}` : city,
      lat: result.geometry?.location?.lat ?? null,
      lng: result.geometry?.location?.lng ?? null,
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
