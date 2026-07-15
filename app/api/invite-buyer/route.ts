import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { sendSms, formatPhone } from '@/lib/sms'

const resend = new Resend(process.env.RESEND_API_KEY)

const COMPANY_NAME  = process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'Blue Alley Touring'
const FROM_NAME     = process.env.EMAIL_FROM_NAME ?? 'RiderLink'
const FROM_EMAIL    = process.env.EMAIL_FROM_ADDRESS ?? 'noreply@bluealleytouring.com'
const SENDER_NAME   = process.env.EMAIL_SENDER_NAME ?? 'Tour Director'
const SENDER_TITLE  = process.env.EMAIL_SENDER_TITLE ?? `Tour Director · ${COMPANY_NAME} LLC`
const SENDER_EMAIL  = process.env.EMAIL_SENDER_ADDRESS ?? 'dre.davis@bluealleytouring.com'

export async function POST(req: NextRequest) {
  const { buyerName, buyerEmail, buyerPhone, artistName, venue, city, date, showId, contactId } = await req.json()

  if ((!buyerEmail && !buyerPhone) || !showId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://riderlink.vercel.app'
  const buyerUrl = contactId ? `${base}/buyer/${showId}?c=${contactId}` : `${base}/buyer/${showId}`
  const showDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const greeting = buyerName ? `Hi ${buyerName.split(' ')[0]},` : 'Hello,'

  try {
    await resend.emails.send({
      from: `${FROM_NAME} · ${COMPANY_NAME} <${FROM_EMAIL}>`,
      to: buyerEmail.trim(),
      subject: `${artistName} Show Rider — ${venue}, ${city}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">

          <!-- Header -->
          <div style="background: #09090b; padding: 28px 32px; border-radius: 16px 16px 0 0;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="https://riderlink.vercel.app/logo.png" width="36" height="36"
                style="border-radius: 8px; object-fit: cover;" alt="RiderLink" />
              <div>
                <div style="color: #ffffff; font-weight: 900; font-size: 17px; letter-spacing: -0.3px;">RiderLink</div>
                <div style="color: #f59e0b; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;">${COMPANY_NAME}</div>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div style="background: #ffffff; padding: 36px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">

            <p style="margin: 0 0 20px; font-size: 15px; color: #111827;">${greeting}</p>

            <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
              Thank you for having <strong>${artistName}</strong> at <strong>${venue}</strong>.
              We're looking forward to a great show and want to make sure everything runs smoothly on your end.
            </p>

            <!-- Show details -->
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 20px; margin: 0 0 24px;">
              <div style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;">Show Details</div>
              <div style="font-size: 15px; font-weight: 900; color: #111827; margin-bottom: 4px;">${artistName}</div>
              <div style="font-size: 13px; color: #6b7280; margin-bottom: 2px;">${venue} · ${city}</div>
              <div style="font-size: 13px; color: #9ca3af;">${showDate}</div>
            </div>

            <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
              Please use the link below to review the official rider for this engagement.
              You'll be able to mark each item as <strong>Confirmed</strong>, <strong>Unavailable</strong>,
              or <strong>Substituted</strong>, and submit your day-of-show information closer to the date.
            </p>

            <p style="margin: 0 0 28px; font-size: 15px; color: #374151; line-height: 1.6;">
              If you have any questions or need to discuss anything on the rider,
              you can reach us directly through the message thread inside the link, or reply to this email.
            </p>

            <!-- CTA -->
            <div style="text-align: center; margin-bottom: 28px;">
              <a href="${buyerUrl}"
                style="display: inline-block; background: #f59e0b; color: #09090b; font-weight: 900;
                       font-size: 15px; padding: 16px 36px; border-radius: 14px; text-decoration: none;
                       letter-spacing: -0.2px;">
                Review Official Rider →
              </a>
            </div>

            <p style="margin: 0 0 4px; font-size: 12px; color: #9ca3af; text-align: center;">
              Or copy this link:
            </p>
            <p style="margin: 0 0 28px; font-size: 12px; color: #6b7280; text-align: center; word-break: break-all;">
              <a href="${buyerUrl}" style="color: #6b7280;">${buyerUrl}</a>
            </p>

            <div style="border-top: 1px solid #f3f4f6; padding-top: 20px;">
              <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
                ${SENDER_NAME}<br/>
                <span style="color: #9ca3af;">${SENDER_TITLE}</span><br/>
                <a href="mailto:${SENDER_EMAIL}" style="color: #f59e0b; text-decoration: none;">${SENDER_EMAIL}</a>
              </p>
            </div>
          </div>
        </div>
      `,
    })

    // SMS — runs independently so a failure doesn't break the email response
    let smsError: string | null = null
    if (buyerPhone) {
      const e164 = formatPhone(buyerPhone)
      if (e164) {
        try {
          const firstName = buyerName ? buyerName.split(' ')[0] : 'Hi'
          await sendSms(e164,
            `${firstName}, you've received the official ${artistName} show rider for ${venue} (${city}).\n\nReview it here: ${buyerUrl}`
          )
        } catch (smsErr: any) {
          console.error('SMS send error:', smsErr)
          smsError = smsErr.message ?? 'SMS failed'
        }
      }
    }

    return NextResponse.json({ sent: true, smsError })
  } catch (err: any) {
    console.error('invite-buyer error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
