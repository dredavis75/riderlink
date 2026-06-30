import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300

const CATEGORIES = [
  'Food', 'Beverages', 'Dressing Room', 'Production Office', 'Dinner',
  'Production', 'Security', 'Venue', 'Transportation', 'Hotel', 'Essentials', 'Other',
]

const EXTRACT_PROMPT = `You are reading a professional touring artist rider document.
Extract EVERY requirement, item, and specification listed in this document.

Return a JSON object with two keys:
1. "items": array of rider items, each with:
   - "category": one of exactly these values: ${CATEGORIES.join(', ')}
   - "name": the item or requirement (concise but complete)
   - "quantity": quantity/amount if specified, e.g. "2 bottles", "4 cases", "1" — or "" if not stated
   - "notes": brand, spec, or special instruction — or "" if none

2. "links": array of any URLs found in the document (product pages, spec sheets, hospitality forms, brand sites, etc.) — empty array if none

Rules for items:
- Include ALL items — food, drinks, equipment, hotel, security, transport, everything
- Use "Beverages" for any drinks (water, alcohol, juice, energy drinks)
- Use "Production" for AV/DJ/lighting/sound equipment
- Use "Dressing Room" for backstage hospitality items in the dressing room
- Use "Dinner" for hot meals and catering
- Do not skip items or summarize — list each one individually

Return ONLY valid JSON, no markdown, no explanation`

const ENRICH_PROMPT = (existing: string) => `You previously extracted rider items from a PDF. Some URLs were found in that document and their page content is provided below.

Review the fetched content and:
1. Add any NEW items or requirements found in the linked pages that weren't in the original extraction
2. Update existing items with more specific brand names, model numbers, or specs if the linked pages provide them
3. Do NOT remove any existing items

Return the complete updated items array as valid JSON (array only, no wrapper object).

Existing items:
${existing}

Fetched link content:
`

async function fetchLinkText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RiderLink/1.0)' },
    })
    if (!res.ok) return null
    const html = await res.text()
    // Strip HTML tags and collapse whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000) // cap per link
    return text || null
  } catch {
    return null
  }
}

function parseItems(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const lastBracket = cleaned.lastIndexOf('},')
    if (lastBracket === -1) throw new Error('Could not parse extraction response')
    return JSON.parse(cleaned.slice(0, lastBracket + 1) + ']')
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: masterId } = await params

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: master } = await sb
      .from('rider_masters')
      .select('id, artist, version, pdf_url')
      .eq('id', masterId)
      .single()

    if (!master?.pdf_url) {
      return NextResponse.json({ error: 'No PDF uploaded for this master rider.' }, { status: 404 })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const pdfRes = await fetch(master.pdf_url)
    if (!pdfRes.ok) {
      return NextResponse.json({ error: `Could not fetch PDF: ${pdfRes.status}` }, { status: 422 })
    }
    const base64 = Buffer.from(await pdfRes.arrayBuffer()).toString('base64')

    // ── Pass 1: extract items + discover links ────────────────────────────────
    let items: { category: string; name: string; quantity: string; notes: string }[]
    let links: string[] = []

    try {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as any,
            { type: 'text', text: EXTRACT_PROMPT },
          ],
        }],
      })

      const raw = msg.content.find(b => b.type === 'text')?.text ?? ''
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

      let parsed: any
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        const lastBracket = cleaned.lastIndexOf('},')
        if (lastBracket === -1) throw new Error('Could not parse extraction response')
        parsed = JSON.parse(cleaned.slice(0, lastBracket + 1) + ']')
      }

      // Handle both { items, links } and bare array responses
      if (Array.isArray(parsed)) {
        items = parsed
      } else {
        items = parsed.items ?? []
        links = (parsed.links ?? []).filter((l: any) => typeof l === 'string' && l.startsWith('http'))
      }
    } catch (err: any) {
      return NextResponse.json({ error: `Extraction failed: ${err.message}` }, { status: 422 })
    }

    // ── Pass 2: fetch links and enrich if any found ───────────────────────────
    let linksFollowed = 0
    if (links.length > 0) {
      const fetched = await Promise.all(links.slice(0, 10).map(fetchLinkText))
      const linkContent = fetched
        .map((text, i) => text ? `[${links[i]}]\n${text}` : null)
        .filter(Boolean)
        .join('\n\n---\n\n')

      if (linkContent) {
        linksFollowed = fetched.filter(Boolean).length
        try {
          const enrichMsg = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 16000,
            messages: [{
              role: 'user',
              content: ENRICH_PROMPT(JSON.stringify(items, null, 2)) + linkContent,
            }],
          })
          const enrichRaw = enrichMsg.content.find(b => b.type === 'text')?.text ?? ''
          const enriched = parseItems(enrichRaw)
          if (Array.isArray(enriched) && enriched.length >= items.length) {
            items = enriched
          }
        } catch {
          // enrichment failed — keep original items, don't error out
        }
      }
    }

    // Normalize categories
    items = items.map(item => ({
      ...item,
      category: CATEGORIES.includes(item.category) ? item.category : 'Other',
      quantity: item.quantity ?? '',
      notes: item.notes ?? '',
    }))

    // ── Save to DB ────────────────────────────────────────────────────────────
    await sb.from('rider_master_items').delete().eq('master_id', masterId)

    const { error: insertErr } = await sb.from('rider_master_items').insert(
      items.map((item, idx) => ({
        master_id: masterId,
        category: item.category,
        name: item.name,
        quantity: item.quantity,
        notes: item.notes,
        sort_order: idx,
      }))
    )

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    const [major, minor] = (master.version ?? '1.0').split('.').map(Number)
    const newVersion = `${major}.${(minor ?? 0) + 1}`
    await sb.from('rider_masters')
      .update({ version: newVersion, updated_at: new Date().toISOString() })
      .eq('id', masterId)

    return NextResponse.json({
      extracted: items.length,
      version: newVersion,
      linksFollowed,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Unexpected server error' }, { status: 500 })
  }
}
