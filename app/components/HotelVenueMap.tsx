'use client'

// Shows both the hotel and the venue as pins on one map, using Google's free
// directions embed (no API key needed) — the route endpoints double as pins.
export default function HotelVenueMap({
  hotelLat, hotelLng, hotelLabel,
  venueLat, venueLng, venueLabel,
  height = 220,
}: {
  hotelLat: number
  hotelLng: number
  hotelLabel?: string
  venueLat?: number
  venueLng?: number
  venueLabel?: string
  height?: number
}) {
  const hasVenue = venueLat != null && venueLng != null
  const src = hasVenue
    ? `https://maps.google.com/maps?saddr=${hotelLat},${hotelLng}&daddr=${venueLat},${venueLng}&output=embed`
    : `https://maps.google.com/maps?q=${hotelLat},${hotelLng}&z=15&output=embed`

  return (
    <div className="rounded-2xl overflow-hidden border border-amber-200">
      <iframe
        src={src}
        width="100%"
        height={height}
        style={{ border: 0, display: 'block' }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={hasVenue ? `${hotelLabel ?? 'Hotel'} to ${venueLabel ?? 'venue'}` : hotelLabel ?? 'Hotel location'}
      />
    </div>
  )
}
