import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import twilio from 'twilio'

const MANAGER_EMAIL = process.env.MANAGER_EMAIL ?? 'dre.davis@bluealleytouring.com'
const MANAGER_PHONE = process.env.MANAGER_PHONE ?? ''

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null

export interface NotifyPayload {
  type: 'rider_submitted' | 'buyer_message' | 'day_of_show_submitted'
  showId: string
  artistName: string
  venue: string
  city: string
  date: string
  buyerName: string
  flaggedItems?: Array<{ name: string; status: string; note: string }>
  confirmedCount?: number
  totalCount?: number
  messageText?: string
  curfew?: string
  runOfShowText?: string
  runOfShowPdfUrl?: string
  dayOfShowContacts?: {
    artistRelations:  { name: string; phone: string; email: string }
    headOfSecurity:   { name: string; phone: string; email: string }
    settlement:       { name: string; phone: string; email: string }
    productionManager:{ name: string; phone: string; email: string }
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
}

function buildEmail(payload: NotifyPayload): { subject: string; html: string } {
  const showLine = `${payload.artistName} @ ${payload.venue}, ${payload.city}`
  const dateStr = formatDate(payload.date)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const showUrl = `${appUrl}/show/${payload.showId}`

  if (payload.type === 'day_of_show_submitted') {
    const c = payload.dayOfShowContacts
    const contactRows = c ? [
      { role: 'Artist Relations',   ...c.artistRelations },
      { role: 'Head of Security',   ...c.headOfSecurity },
      { role: 'Settlement Contact', ...c.settlement },
      { role: 'Production Manager', ...c.productionManager },
    ].filter(r => r.name || r.phone || r.email).map(r => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;vertical-align:top">
          <div style="font-size:12px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">${r.role}</div>
          <div style="font-size:14px;font-weight:600;color:#111827">${r.name || '—'}</div>
          ${r.phone ? `<div style="font-size:13px;color:#4b5563;margin-top:2px">📞 ${r.phone}</div>` : ''}
          ${r.email ? `<div style="font-size:13px;color:#4b5563;margin-top:2px">✉️ ${r.email}</div>` : ''}
        </td>
      </tr>
    `).join('') : ''

    const rosText = payload.runOfShowText
      ? `<div style="background:#f9fafb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px 20px;font-size:13px;color:#111827;white-space:pre-wrap;font-family:monospace;line-height:1.6">${payload.runOfShowText}</div>`
      : payload.runOfShowPdfUrl
      ? `<div style="margin-top:8px"><a href="${payload.runOfShowPdfUrl}" style="display:inline-block;background:#f59e0b;color:#111827;text-decoration:none;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px">📄 Download Run of Show PDF →</a></div>`
      : '<p style="color:#6b7280;font-size:13px">No run of show provided.</p>'

    return {
      subject: `📋 Day of Show info from ${payload.buyerName} — ${showLine}`,
      html: `
        <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
          <div style="background:#111827;padding:24px 28px">
            <div style="color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">RiderLink · Day of Show</div>
            <div style="color:#fff;font-size:20px;font-weight:900">${showLine}</div>
            <div style="color:#9ca3af;font-size:13px;margin-top:4px">${dateStr}</div>
          </div>
          <div style="padding:28px">
            ${payload.curfew ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:14px;font-weight:700;color:#b91c1c">⏰ Curfew: ${payload.curfew}</div>` : '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:14px;font-weight:700;color:#15803d">✅ No venue curfew</div>'}
            <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#374151">Run of Show</p>
            ${rosText}
            ${c ? `<p style="margin:24px 0 12px;font-size:14px;font-weight:700;color:#374151">Day of Show Contacts</p><table style="width:100%;border-collapse:collapse">${contactRows}</table>` : ''}
            <div style="margin-top:24px">
              <a href="${showUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px">View Show →</a>
            </div>
          </div>
        </div>
      `,
    }
  }

  if (payload.type === 'buyer_message') {
    return {
      subject: `💬 New message from ${payload.buyerName} — ${showLine}`,
      html: `
        <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
          <div style="background:#111827;padding:24px 28px">
            <div style="color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">RiderLink · Blue Alley Touring</div>
            <div style="color:#fff;font-size:20px;font-weight:900">${showLine}</div>
            <div style="color:#9ca3af;font-size:13px;margin-top:4px">${dateStr}</div>
          </div>
          <div style="padding:28px">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;font-weight:600">New message from ${payload.buyerName}:</p>
            <div style="background:#f9fafb;border-left:4px solid #111827;border-radius:8px;padding:16px 20px;font-size:15px;color:#111827;font-style:italic">
              "${payload.messageText}"
            </div>
            <div style="margin-top:24px">
              <a href="${showUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px">
                View Show →
              </a>
            </div>
          </div>
        </div>
      `,
    }
  }

  const flagged = payload.flaggedItems ?? []
  const issueCount = flagged.length
  const allClear = issueCount === 0

  const itemRows = flagged.map(item => {
    const icon = item.status === 'unavailable' ? '❌' : '🔄'
    const label = item.status === 'unavailable' ? 'Unavailable' : 'Substituting'
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6">
          <span style="font-size:14px">${icon}</span>
          <strong style="font-size:14px;color:#111827;margin-left:8px">${item.name}</strong>
          <span style="font-size:12px;color:#6b7280;margin-left:6px">(${label})</span>
          ${item.note ? `<div style="font-size:13px;color:#4b5563;margin-top:4px;margin-left:24px">${item.note}</div>` : ''}
        </td>
      </tr>
    `
  }).join('')

  return {
    subject: allClear
      ? `✅ ${payload.buyerName} confirmed rider — ${showLine}`
      : `⚠️ ${issueCount} item${issueCount > 1 ? 's' : ''} flagged — ${showLine}`,
    html: `
      <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
        <div style="background:#111827;padding:24px 28px">
          <div style="color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">RiderLink · Blue Alley Touring</div>
          <div style="color:#fff;font-size:20px;font-weight:900">${showLine}</div>
          <div style="color:#9ca3af;font-size:13px;margin-top:4px">${dateStr}</div>
        </div>
        <div style="padding:28px">
          <div style="display:flex;gap:16px;margin-bottom:24px">
            <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 18px;text-align:center">
              <div style="font-size:24px;font-weight:900;color:#16a34a">${payload.confirmedCount}</div>
              <div style="font-size:12px;color:#15803d;font-weight:600">Confirmed</div>
            </div>
            <div style="flex:1;background:${allClear ? '#f0fdf4' : '#fef2f2'};border:1px solid ${allClear ? '#bbf7d0' : '#fecaca'};border-radius:12px;padding:14px 18px;text-align:center">
              <div style="font-size:24px;font-weight:900;color:${allClear ? '#16a34a' : '#dc2626'}">${issueCount}</div>
              <div style="font-size:12px;color:${allClear ? '#15803d' : '#b91c1c'};font-weight:600">Issues</div>
            </div>
            <div style="flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px 18px;text-align:center">
              <div style="font-size:24px;font-weight:900;color:#374151">${payload.totalCount}</div>
              <div style="font-size:12px;color:#6b7280;font-weight:600">Total Items</div>
            </div>
          </div>

          ${flagged.length > 0 ? `
            <p style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:700">Items that need attention:</p>
            <table style="width:100%;border-collapse:collapse">${itemRows}</table>
          ` : `
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;font-size:15px;color:#15803d;font-weight:600;text-align:center">
              🎉 All items confirmed — nothing flagged!
            </div>
          `}

          <div style="margin-top:24px">
            <a href="${showUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px">
              View Show →
            </a>
          </div>
        </div>
        <div style="background:#f9fafb;padding:14px 28px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb">
          Responded by ${payload.buyerName} via RiderLink
        </div>
      </div>
    `,
  }
}

function buildSms(payload: NotifyPayload): string {
  const show = `${payload.artistName} @ ${payload.venue}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const link = `${appUrl}/show/${payload.showId}`

  if (payload.type === 'day_of_show_submitted') {
    const curfewNote = payload.curfew ? `Curfew: ${payload.curfew}.` : 'No curfew.'
    return `RiderLink 📋 Day of show info from ${payload.buyerName} (${show}). ${curfewNote} ${link}`
  }

  if (payload.type === 'buyer_message') {
    const preview = (payload.messageText ?? '').slice(0, 80)
    const ellipsis = (payload.messageText ?? '').length > 80 ? '…' : ''
    return `RiderLink 💬 ${payload.buyerName} (${show}): "${preview}${ellipsis}" ${link}`
  }

  const issueCount = (payload.flaggedItems ?? []).length
  if (issueCount === 0) {
    return `RiderLink ✅ ${payload.buyerName} confirmed all items for ${show}. ${link}`
  }
  return `RiderLink ⚠️ ${payload.buyerName} flagged ${issueCount} item${issueCount > 1 ? 's' : ''} on ${show} rider. ${link}`
}

export async function POST(req: NextRequest) {
  const payload: NotifyPayload = await req.json()
  const { subject, html } = buildEmail(payload)
  const smsBody = buildSms(payload)
  const results: Record<string, string> = {}

  // Email via Resend
  if (resend) {
    try {
      await resend.emails.send({
        from: 'RiderLink <notifications@bluealleytouring.com>',
        to: MANAGER_EMAIL,
        subject,
        html,
      })
      results.email = 'sent'
    } catch (e: any) {
      results.email = `failed: ${e?.message}`
    }
  } else {
    results.email = 'not configured'
  }

  // SMS via Twilio
  if (twilioClient && MANAGER_PHONE && process.env.TWILIO_FROM_NUMBER) {
    try {
      await twilioClient.messages.create({
        body: smsBody,
        from: process.env.TWILIO_FROM_NUMBER,
        to: MANAGER_PHONE,
      })
      results.sms = 'sent'
    } catch (e: any) {
      results.sms = `failed: ${e?.message}`
    }
  } else {
    results.sms = 'not configured'
  }

  return NextResponse.json({ ok: true, results })
}
