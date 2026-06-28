import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { getShow } from '@/lib/db'
import { MOCK_SHOWS, type Show } from '@/lib/data'
import { isConfigured } from '@/lib/supabase'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    paddingBottom: 60,
  },
  // Header band
  header: {
    backgroundColor: '#111827',
    paddingHorizontal: 40,
    paddingTop: 36,
    paddingBottom: 28,
  },
  headerLabel: {
    fontSize: 8,
    color: '#9ca3af',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  artistName: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  showMeta: {
    fontSize: 11,
    color: '#d1d5db',
    marginBottom: 2,
  },
  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    paddingHorizontal: 40,
    paddingVertical: 14,
    gap: 24,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
  summaryCount: {
    fontSize: 9,
    color: '#6b7280',
  },
  // Body
  body: {
    paddingHorizontal: 40,
    paddingTop: 24,
  },
  // Buyer info
  buyerBox: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buyerLabel: {
    fontSize: 8,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  buyerValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  buyerEmail: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  // Category section
  categoryHeader: {
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 4,
    marginTop: 16,
  },
  categoryTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  // Item row
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomColor: '#f3f4f6',
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  statusBadge: {
    width: 72,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 1,
  },
  statusText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  itemQty: {
    fontSize: 9,
    color: '#6b7280',
    width: 70,
    textAlign: 'right',
    marginTop: 1,
  },
  itemNotes: {
    fontSize: 8,
    fontFamily: 'Helvetica-Oblique',
    color: '#9ca3af',
    marginTop: 6,
    lineHeight: 1.5,
  },
  buyerNote: {
    fontSize: 8,
    fontFamily: 'Helvetica-Oblique',
    color: '#d97706',
    marginTop: 5,
    lineHeight: 1.5,
  },
  itemDetails: {
    flex: 1,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopColor: '#e5e7eb',
    borderTopWidth: 1,
    paddingHorizontal: 40,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
})

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  confirmed:   { bg: '#f0fdf4', text: '#15803d', label: 'Confirmed' },
  pending:     { bg: '#fffbeb', text: '#b45309', label: 'Pending' },
  unavailable: { bg: '#fef2f2', text: '#b91c1c', label: 'Unavailable' },
  substituted: { bg: '#eff6ff', text: '#1d4ed8', label: 'Substituting' },
}

function groupByCategory(items: Show['items']) {
  return items.reduce<Record<string, Show['items']>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})
}

function RiderPDF({ show }: { show: Show }) {
  const grouped = groupByCategory(show.items)
  const confirmed = show.items.filter(i => i.status === 'confirmed').length
  const pending = show.items.filter(i => i.status === 'pending').length
  const unavailable = show.items.filter(i => i.status === 'unavailable').length
  const substituted = show.items.filter(i => i.status === 'substituted').length
  const showDate = new Date(show.date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const exportDate = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <Document title={`${show.artist} Rider — ${show.venue}`} author="RiderLink · Blue Alley Touring">
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>Hospitality Rider · RiderLink · Blue Alley Touring</Text>
          <Text style={styles.artistName}>{show.artist}</Text>
          <Text style={styles.showMeta}>{show.venue}  ·  {show.city}</Text>
          <Text style={styles.showMeta}>{showDate}</Text>
        </View>

        {/* Summary bar */}
        <View style={styles.summaryBar}>
          {confirmed > 0 && (
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: '#16a34a' }]} />
              <Text style={styles.summaryText}>{confirmed} <Text style={styles.summaryCount}>confirmed</Text></Text>
            </View>
          )}
          {pending > 0 && (
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: '#d97706' }]} />
              <Text style={styles.summaryText}>{pending} <Text style={styles.summaryCount}>pending</Text></Text>
            </View>
          )}
          {unavailable > 0 && (
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: '#dc2626' }]} />
              <Text style={styles.summaryText}>{unavailable} <Text style={styles.summaryCount}>unavailable</Text></Text>
            </View>
          )}
          {substituted > 0 && (
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: '#2563eb' }]} />
              <Text style={styles.summaryText}>{substituted} <Text style={styles.summaryCount}>substituting</Text></Text>
            </View>
          )}
          <Text style={[styles.summaryCount, { marginLeft: 'auto' }]}>{show.items.length} total items</Text>
        </View>

        <View style={styles.body}>

          {/* Buyer info */}
          <View style={styles.buyerBox}>
            <View>
              <Text style={styles.buyerLabel}>Buyer / Promoter</Text>
              <Text style={styles.buyerValue}>{show.buyerName}</Text>
              <Text style={styles.buyerEmail}>{show.buyerEmail}</Text>
            </View>
            <View>
              <Text style={styles.buyerLabel}>Status</Text>
              <Text style={[styles.buyerValue, { textTransform: 'capitalize' }]}>{show.status}</Text>
            </View>
          </View>

          {/* Items by category */}
          {Object.entries(grouped).map(([category, items]) => (
            <View key={category} wrap={false}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{category}</Text>
              </View>
              {items.map(item => {
                const s = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending
                return (
                  <View key={item.id} style={styles.itemRow} wrap={false}>
                    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                      <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
                    </View>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
                      {item.buyerNote ? <Text style={styles.buyerNote}>Buyer: {item.buyerNote}</Text> : null}
                    </View>
                    <Text style={styles.itemQty}>{item.quantity}</Text>
                  </View>
                )
              })}
            </View>
          ))}

        </View>

        {/* Footer */}
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

  const buffer = await renderToBuffer(<RiderPDF show={show} />)

  const filename = `${show.artist.replace(/\s+/g, '-')}-Rider-${show.date}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
