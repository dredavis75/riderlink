import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { getShow } from '@/lib/db'
import { MOCK_SHOWS, type Show, type Hotel } from '@/lib/data'
import { isConfigured } from '@/lib/supabase'

const PARTY_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    paddingBottom: 50,
  },
  header: {
    backgroundColor: '#111827',
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 24,
  },
  headerLabel: {
    fontSize: 8,
    color: '#9ca3af',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  artistName: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  showMeta: {
    fontSize: 10,
    color: '#d1d5db',
  },
  body: {
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  hotelSection: {
    marginBottom: 24,
  },
  hotelName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  hotelAddress: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
    marginBottom: 8,
  },
  partyLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomColor: '#f3f4f6',
    borderBottomWidth: 1,
  },
  cellName: { width: 130, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' },
  cellRoom: { width: 90, fontSize: 9, color: '#374151' },
  cellDate: { width: 80, fontSize: 9, color: '#374151' },
  cellConf: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Oblique', color: '#9ca3af' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopColor: '#e5e7eb',
    borderTopWidth: 1,
    paddingHorizontal: 40,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
})

function HotelSection({ show, hotel, partyLabel }: { show: Show; hotel: Hotel; partyLabel: string }) {
  const guests = show.roomingGuests
    .filter(g => g.hotelId === hotel.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <View style={styles.hotelSection} wrap={false}>
      <Text style={styles.hotelName}>{hotel.name}</Text>
      {hotel.address ? <Text style={styles.hotelAddress}>{hotel.address}</Text> : null}
      <Text style={styles.partyLabel}>{partyLabel} Party</Text>

      {guests.length > 0 && (
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { width: 130 }]}>Name</Text>
          <Text style={[styles.tableHeaderText, { width: 90 }]}>Room Type</Text>
          <Text style={[styles.tableHeaderText, { width: 80 }]}>Check-in</Text>
          <Text style={[styles.tableHeaderText, { width: 80 }]}>Check-out</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Confirmation #</Text>
        </View>
      )}
      {guests.map(guest => (
        <View key={guest.id} style={styles.row}>
          <Text style={styles.cellName}>{guest.firstName} {guest.lastName}</Text>
          <Text style={styles.cellRoom}>{guest.roomType || '—'}</Text>
          <Text style={styles.cellDate}>{guest.checkinDate ?? '—'}</Text>
          <Text style={styles.cellDate}>{guest.checkoutDate ?? '—'}</Text>
          <Text style={styles.cellConf}>{guest.confirmationNumber ?? ''}</Text>
        </View>
      ))}
    </View>
  )
}

function RoomingPDF({ show }: { show: Show }) {
  const hotels = [...show.hotels].sort((a, b) => a.sortOrder - b.sortOrder)
  const exportDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <Document title={`${show.artist} Rooming List — ${show.venue}`} author="RiderLink · Blue Alley Touring">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>Rooming List · RiderLink · Blue Alley Touring</Text>
          <Text style={styles.artistName}>{show.artist}</Text>
          <Text style={styles.showMeta}>{show.venue}  ·  {show.city}</Text>
        </View>

        <View style={styles.body}>
          {hotels.map((hotel, i) => (
            <HotelSection key={hotel.id} show={show} hotel={hotel} partyLabel={PARTY_LABELS[i] ?? String(i + 1)} />
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>RiderLink · Blue Alley Touring · {show.artist}</Text>
          <Text style={styles.footerText}>Exported {exportDate}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let show: Show | null = null
  if (isConfigured) {
    show = await getShow(id)
  } else {
    show = MOCK_SHOWS.find(s => s.id === id) ?? null
  }

  if (!show) {
    return new NextResponse('Show not found', { status: 404 })
  }

  const buffer = await renderToBuffer(<RoomingPDF show={show} />)

  const filename = `${show.artist.replace(/\s+/g, '-')}-Rooming-List-${show.date}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
