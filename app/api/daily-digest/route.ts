import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getShows } from '@/lib/db'
import type { Show } from '@/lib/data'

const MANAGER_EMAIL = process.env.MANAGER_EMAIL ?? 'dre.davis@bluealleytouring.com'
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riderlink.vercel.app'

const ACTIVE_STATUSES: Show['status'][] = ['sent', 'active', 'confirmed']

interface ShowSummary {
  show: Show
  daysOut: number
  confirmed: number
  total: number
  flagged: { name: string; status: string }[]
  approved: boolean
}

function summarize(show: Show): ShowSummary {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const showDate = new Date(show.date + 'T12:00:00')
  const daysOut = Math.round((showDate.getTime() - today.getTime()) / 86400000)
  const flagged = show.items
    .filter(i => i.status === 'unavailable' || i.status === 'substituted')
    .map(i => ({ name: i.name, status: i.status }))
  return {
    show,
    daysOut,
    confirmed: show.items.filter(i => i.status === 'confirmed').length,
    total: show.items.length,
    flagged,
    approved: !!show.buyerApprovedAt,
  }
}

function buildDigestEmail(summaries: ShowSummary[]): { subject: string; html: string } {
  const needsAttention = summaries.filter(s => !s.approved || s.flagged.length > 0)
  const allClear = summaries.filter(s => s.approved && s.flagged.length === 0)

  const rowFor = (s: ShowSummary) => {
    const dateStr = new Date(s.show.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const daysLabel = s.daysOut === 0 ? 'Today' : s.daysOut === 1 ? 'Tomorrow' : s.daysOut < 0 ? `${Math.abs(s.daysOut)}d ago` : `${s.daysOut}d out`
    const statusChip = s.approved
      ? `<span style="color:#15803d;font-weight:700">Confirmed by buyer</span>`
      : `<span style="color:#b45309;font-weight:700">Awaiting buyer confirmation</span>`
    const flaggedLine = s.flagged.length > 0
      ? `<div style="margin-top:6px">${s.flagged.map(f => `<span style="display:inline-block;background:${f.status === 'unavailable' ? '#fef2f2' : '#eff6ff'};color:${f.status === 'unavailable' ? '#b91c1c' : '#1d4ed8'};font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;margin:2px 4px 0 0">${f.status === 'unavailable' ? '❌' : '🔄'} ${f.name}</span>`).join('')}</div>`
      : ''
    return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #f3f4f6">
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <div>
              <div style="font-size:15px;font-weight:900;color:#111827">${s.show.artist} · ${s.show.venue}</div>
              <div style="font-size:12px;color:#6b7280;margin-top:2px">${s.show.city} · ${dateStr} · <strong>${daysLabel}</strong></div>
            </div>
            <div style="font-size:12px;text-align:right;white-space:nowrap">${s.confirmed}/${s.total} items<br>${statusChip}</div>
          </div>
          ${flaggedLine}
          <a href="${appUrl}/show/${s.show.id}" style="display:inline-block;margin-top:8px;font-size:12px;font-weight:700;color:#111827;text-decoration:underline">View show →</a>
        </td>
      </tr>
    `
  }

  const subject = needsAttention.length > 0
    ? `🗓️ Daily Rider Digest — ${needsAttention.length} show${needsAttention.length > 1 ? 's' : ''} need${needsAttention.length === 1 ? 's' : ''} attention`
    : `🗓️ Daily Rider Digest — all clear ✅`

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
      <div style="background:#111827;padding:24px 28px">
        <div style="color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">RiderLink · Daily Digest</div>
        <div style="color:#fff;font-size:20px;font-weight:900">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      </div>
      <div style="padding:28px">
        ${needsAttention.length > 0 ? `
          <p style="margin:0 0 4px;font-size:14px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Needs Attention</p>
          <table style="width:100%;border-collapse:collapse">${needsAttention.sort((a, b) => a.daysOut - b.daysOut).map(rowFor).join('')}</table>
        ` : `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;font-size:15px;color:#15803d;font-weight:600;text-align:center">
            🎉 Every upcoming rider is confirmed with nothing flagged.
          </div>
        `}
        ${allClear.length > 0 ? `
          <p style="margin:24px 0 4px;font-size:12px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px">Confirmed &amp; Clear (${allClear.length})</p>
          <div style="font-size:12px;color:#6b7280;line-height:1.8">${allClear.sort((a, b) => a.daysOut - b.daysOut).map(s => `${s.show.artist} · ${s.show.venue} (${s.daysOut}d out)`).join('<br>')}</div>
        ` : ''}
      </div>
      <div style="background:#f9fafb;padding:14px 28px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb">
        RiderLink · Blue Alley Touring
      </div>
    </div>
  `

  return { subject, html }
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  const shows = await getShows('default')
  const upcoming = shows.filter(s => ACTIVE_STATUSES.includes(s.status))
  const summaries = upcoming.map(summarize).filter(s => s.daysOut >= -1)

  const { subject, html } = buildDigestEmail(summaries)

  if (!resend) {
    return NextResponse.json({ ok: false, error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  try {
    await resend.emails.send({
      from: 'RiderLink <notifications@bluealleytouring.com>',
      to: MANAGER_EMAIL,
      subject,
      html,
    })
    return NextResponse.json({ ok: true, showCount: summaries.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
