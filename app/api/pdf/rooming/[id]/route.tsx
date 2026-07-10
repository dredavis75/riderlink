import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { getShow } from '@/lib/db'
import { MOCK_SHOWS, ROOMING_BOOKING_STATUS_LABELS, type Show, type RoomingDay, type RoomingGuest, type RoomingParty, type RoomingBookingStatus } from '@/lib/data'
import { isConfigured } from '@/lib/supabase'

const DAYS_PER_PAGE = 5
const NAME_COL_WIDTH = 130
const DAY_COL_WIDTH = 100

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    paddingBottom: 50,
  },
  header: {
    backgroundColor: '#111827',
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 20,
  },
  headerLabel: {
    fontSize: 8,
    color: '#9ca3af',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  artistName: {
    fontSize: 22,
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
    paddingHorizontal: 32,
    paddingTop: 20,
  },
  table: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
  },
  headerCellWrap: {
    width: NAME_COL_WIDTH,
  },
  dayCell: {
    width: DAY_COL_WIDTH,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 6,
    padding: 6,
    marginLeft: 6,
  },
  dayDate: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textAlign: 'center',
  },
  dayHotel: {
    fontSize: 7,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  dayStatus: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    borderRadius: 3,
    paddingVertical: 2,
    marginTop: 3,
    textTransform: 'uppercase',
  },
  partyLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 16,
    marginBottom: 6,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  guestName: {
    width: NAME_COL_WIDTH,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  guestConfirmation: {
    fontSize: 7,
    fontFamily: 'Helvetica-Oblique',
    color: '#9ca3af',
    marginTop: 1,
  },
  roomCell: {
    width: DAY_COL_WIDTH,
    fontSize: 8,
    color: '#374151',
    textAlign: 'center',
    marginLeft: 6,
    borderBottomColor: '#f3f4f6',
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopColor: '#e5e7eb',
    borderTopWidth: 1,
    paddingHorizontal: 32,
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

const STATUS_STYLE: Record<RoomingBookingStatus, { bg: string; text: string }> = {
  requested: { bg: '#fffbeb', text: '#b45309' },
  confirmed: { bg: '#f0fdf4', text: '#15803d' },
  need_approval: { bg: '#fff7ed', text: '#c2410c' },
  unconfirmed: { bg: '#fef2f2', text: '#b91c1c' },
}

function fmtDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function PartyRows({
  party, label, guests, days, show,
}: {
  party: RoomingParty
  label: string
  guests: RoomingGuest[]
  days: RoomingDay[]
  show: Show
}) {
  const rows = guests.filter(g => g.party === party).sort((a, b) => a.sortOrder - b.sortOrder)
  if (rows.length === 0) return null
  return (
    <View wrap={false}>
      <Text style={styles.partyLabel}>{label} Party</Text>
      {rows.map(guest => (
        <View key={guest.id} style={styles.guestRow}>
          <View style={styles.guestName}>
            <Text>{guest.firstName} {guest.lastName}</Text>
            {guest.confirmationNumber ? <Text style={styles.guestConfirmation}>Conf: {guest.confirmationNumber}</Text> : null}
          </View>
          {days.map(day => {
            const assignment = show.roomingAssignments.find(a => a.guestId === guest.id && a.date === day.date)
            return (
              <Text key={day.id} style={styles.roomCell}>{assignment?.roomLabel || '—'}</Text>
            )
          })}
        </View>
      ))}
    </View>
  )
}

function RoomingPDF({ show }: { show: Show }) {
  const days = [...show.roomingDays].sort((a, b) => a.date.localeCompare(b.date))
  const dayChunks = days.length > 0 ? chunk(days, DAYS_PER_PAGE) : [[]]
  const exportDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <Document title={`${show.artist} Rooming List — ${show.venue}`} author="RiderLink · Blue Alley Touring">
      {dayChunks.map((dayChunk, pageIndex) => (
        <Page key={pageIndex} size="A4" orientation="landscape" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.headerLabel}>Rooming List · RiderLink · Blue Alley Touring</Text>
            <Text style={styles.artistName}>{show.artist}</Text>
            <Text style={styles.showMeta}>{show.venue}  ·  {show.city}</Text>
          </View>

          <View style={styles.body}>
            <View style={styles.row}>
              <View style={styles.headerCellWrap} />
              {dayChunk.map(day => {
                const hotel = show.hotels.find(h => h.id === day.hotelId)
                const s = STATUS_STYLE[day.bookingStatus]
                return (
                  <View key={day.id} style={styles.dayCell}>
                    <Text style={styles.dayDate}>{fmtDate(day.date)}</Text>
                    <Text style={styles.dayHotel}>{hotel?.name ?? 'No hotel'}</Text>
                    <Text style={[styles.dayStatus, { backgroundColor: s.bg, color: s.text }]}>
                      {ROOMING_BOOKING_STATUS_LABELS[day.bookingStatus]}
                    </Text>
                  </View>
                )
              })}
            </View>

            <PartyRows party="A" label="A" guests={show.roomingGuests} days={dayChunk} show={show} />
            <PartyRows party="B" label="B" guests={show.roomingGuests} days={dayChunk} show={show} />
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>RiderLink · Blue Alley Touring · {show.artist}</Text>
            <Text style={styles.footerText}>Exported {exportDate}</Text>
          </View>
        </Page>
      ))}
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
