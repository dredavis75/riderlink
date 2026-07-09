'use client'

export default function VenueMap({ lat, lng, label, height = 220 }: { lat: number; lng: number; label?: string; height?: number }) {
  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`
  return (
    <div className="rounded-2xl overflow-hidden border border-amber-200">
      <iframe
        src={src}
        width="100%"
        height={height}
        style={{ border: 0, display: 'block' }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={label ?? 'Venue location'}
      />
    </div>
  )
}
