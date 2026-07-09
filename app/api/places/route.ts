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

  // Geocode a manually-typed address — fallback when a venue isn't in Places.
  // Uses Places Autocomplete + Place Details rather than the standalone
  // Geocoding API, since that's a separate API that may not be
  // enabled/allowed for this key — this stays entirely within Places API,
  // which is already confirmed working for the venue search above.
  if (address) {
    async function findPlaceId(input: string, types?: string): Promise<string | null> {
      const typeParam = types ? `&types=${types}` : ''
      const acUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}${typeParam}&key=${KEY}`
      const acRes = await fetch(acUrl)
      const acData = await acRes.json()
      return acData.predictions?.[0]?.place_id ?? null
    }

    // Try establishment first — it correctly handles both venue/business
    // names AND full street addresses at that business's location, and
    // avoids geocode-type mismatching a venue name against an unrelated
    // place with the same literal name (e.g. "Warsaw" the venue in
    // Brooklyn vs. the town of Warsaw, NY). Fall back to geocode type for
    // addresses with no associated business, then fully unrestricted as
    // a last resort so this practically never fails outright.
    const topPlaceId = (await findPlaceId(address, 'establishment'))
      ?? (await findPlaceId(address, 'geocode'))
      ?? (await findPlaceId(address))
    if (!topPlaceId) return NextResponse.json({ error: 'Address not found' }, { status: 404 })

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${topPlaceId}&fields=formatted_address,address_components,geometry&key=${KEY}`
    const detailsRes = await fetch(detailsUrl)
    const detailsData = await detailsRes.json()
    const result = detailsData.result
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
