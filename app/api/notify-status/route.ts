import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'Blue Alley Touring'
const FROM_EMAIL   = process.env.EMAIL_FROM_ADDRESS ?? 'noreply@bluealleytouring.com'

export async function POST(req: NextRequest) {
  const { showId, status, artistName, venue, city, date, buyerName, buyerEmail, reason } = await req.json()

  if (!showId || !['cancelled', 'postponed'].includes(status)) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  if (!buyerEmail) {
    return NextResponse.json({ ok: true, sent: false, reason: 'no buyer email on file' })
  }

  if (!resend) {
    return NextResponse.json({ ok: true, sent: false, reason: 'email not configured' })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://riderlink.vercel.app'
  const showUrl = `${base}/show/${showId}`
  const showDate = new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const isCancelled = status === 'cancelled'
  const accent = isCancelled ? '#dc2626' : '#f97316'
  const label = isCancelled ? 'Cancelled' : 'Postponed'

  try {
    await resend.emails.send({
      from: `RiderLink <${FROM_EMAIL}>`,
      to: buyerEmail.trim(),
      subject: `${label}: ${artistName} — ${venue} · ${showDate}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #09090b; padding: 28px 32px; border-radius: 16px 16px 0 0;">
            <div style="color: white; font-weight: 900; font-size: 18px;">RiderLink</div>
            <div style="color: #f59e0b; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">${COMPANY_NAME}</div>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
            <div style="display:inline-block; background:${accent}1a; color:${accent}; font-weight:800; font-size:12px; letter-spacing:0.05em; text-transform:uppercase; padding:6px 14px; border-radius:999px; margin-bottom:16px;">${label}</div>
            <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 900; color: #111827;">${artistName} — ${venue}</h1>
            <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px;">${city} · ${showDate}</p>
            <p style="color: #374151; font-size: 14px; margin: 0 0 24px;">
              ${buyerName ? `Hi ${buyerName}, this` : 'This'} show has been marked as <strong>${label.toLowerCase()}</strong>.
              ${reason ? `<br/><br/><strong>Note:</strong> ${reason}` : ''}
            </p>
            <a href="${showUrl}" style="display: inline-block; background: #111827; color: white; font-weight: 900; font-size: 14px; padding: 14px 28px; border-radius: 12px; text-decoration: none;">
              View Show →
            </a>
          </div>
        </div>
      `,
    })
    return NextResponse.json({ ok: true, sent: true })
  } catch (err: any) {
    console.error('notify-status send error:', err)
    return NextResponse.json({ ok: false, sent: false, error: err.message }, { status: 500 })
  }
}
