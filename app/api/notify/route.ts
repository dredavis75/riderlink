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
  type: 'rider_submitted' | 'buyer_message'
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
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
}

function buildEmail(payload: NotifyPayload): { subject: string; html: string } {
  const showLine = `${payload.artistName} @ ${payload.venue}, ${payload.city}`
  const dateStr = formatDate(payload.date)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const showUrl = `${appUrl}/show/${payload.showId}`

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
