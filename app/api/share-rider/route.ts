import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { sendSms, formatPhone } from '@/lib/sms'

const resend = new Resend(process.env.RESEND_API_KEY)
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'Blue Alley Touring'
const FROM_EMAIL   = process.env.EMAIL_FROM_ADDRESS ?? 'noreply@bluealleytouring.com'

export async function POST(req: NextRequest) {
  const { emails, phones, artistName, venue, city, date, showId, senderName } = await req.json()

  if (!emails?.length || !showId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://riderlink.vercel.app'
  const buyerUrl = `${base}/buyer/${showId}`
  const showDate = new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const errors: string[] = []

  for (const email of emails) {
    try {
      await resend.emails.send({
        from: `RiderLink <${FROM_EMAIL}>`,
        to: email.trim(),
        subject: `${artistName} — Show Rider Access · ${venue}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #09090b; padding: 28px 32px; border-radius: 16px 16px 0 0;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; background: #f59e0b; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: #09090b; font-size: 16px; font-weight: 900;">⚡</span>
                </div>
                <div>
                  <div style="color: white; font-weight: 900; font-size: 18px;">RiderLink</div>
                  <div style="color: #f59e0b; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">${COMPANY_NAME}</div>
                </div>
              </div>
            </div>
            <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
              <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 900; color: #111827;">${artistName} — Show Rider</h1>
              <p style="margin: 0 0 4px; color: #6b7280; font-size: 14px;">${venue} · ${city}</p>
              <p style="margin: 0 0 24px; color: #9ca3af; font-size: 13px;">${showDate}</p>
              <p style="color: #374151; font-size: 14px; margin: 0 0 24px;">
                ${senderName ? `<strong>${senderName}</strong> has shared` : 'You have been given'} access to review the official show rider for this event.
              </p>
              <a href="${buyerUrl}" style="display: inline-block; background: #f59e0b; color: #09090b; font-weight: 900; font-size: 14px; padding: 14px 28px; border-radius: 12px; text-decoration: none;">
                View Show Rider →
              </a>
              <p style="margin: 24px 0 0; color: #9ca3af; font-size: 12px;">
                Or copy this link: <a href="${buyerUrl}" style="color: #6b7280;">${buyerUrl}</a>
              </p>
            </div>
          </div>
        `,
      })
    } catch (err: any) {
      console.error('share-rider send error:', err)
      errors.push(`${email}: ${err.message}`)
    }
  }

  if (errors.length === emails.length && !phones?.length) {
    return NextResponse.json({ error: 'All sends failed', details: errors }, { status: 500 })
  }

  // SMS to any phone numbers provided
  const smsErrors: string[] = []
  for (const phone of phones ?? []) {
    const e164 = formatPhone(phone)
    if (!e164) continue
    try {
      await sendSms(e164,
        `${senderName ?? COMPANY_NAME} shared the ${artistName} show rider with you for ${venue} (${city}).\n\nView it here: ${buyerUrl}`
      )
    } catch (err: any) {
      smsErrors.push(`${phone}: ${err.message}`)
    }
  }

  return NextResponse.json({ sent: emails.length - errors.length, errors, smsErrors })
}
