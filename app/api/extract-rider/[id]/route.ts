import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300

const CATEGORIES = [
  'Food', 'Beverages', 'Dressing Room', 'Production Office', 'Dinner',
  'Production', 'Security', 'Venue', 'Transportation', 'Hotel', 'Essentials', 'Other',
]

const PROMPT = `You are reading a professional touring artist rider document.
Extract EVERY requirement, item, and specification listed in this document.

Return a JSON object with two keys:
1. "items": array of rider items, each with:
   - "category": one of exactly these values: ${CATEGORIES.join(', ')}
   - "name": the item or requirement (concise but complete)
   - "quantity": quantity/amount if specified, e.g. "2 bottles", "4 cases", "1" — or "" if not stated
   - "notes": brand, spec, or special instruction — or "" if none
2. "links": array of any URLs found in the document — empty array if none

Rules:
- Include ALL items — food, drinks, equipment, hotel, security, transport, everything
- Use "Beverages" for any drinks (water, alcohol, juice, energy drinks)
- Use "Production" for AV/DJ/lighting/sound equipment
- Use "Dressing Room" for backstage hospitality items in the dressing room
- Use "Dinner" for hot meals and catering
- Do not skip items or summarize — list each one individually
- Return ONLY valid JSON, no markdown, no explanation`

async function fetchLinkText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RiderLink/1.0)' },
    })
    if (!res.ok) return null
    const html = await res.text()
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000) || null
  } catch {
    return null
  }
}

interface ExtractedItem {
  category: string
  name: string
  quantity: string
  notes: string
}

async function extractFromPdf(pdfUrl: string, client: Anthropic): Promise<ExtractedItem[]> {
  const res = await fetch(pdfUrl)
  if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`)
  const buffer = await res.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        } as any,
        { type: 'text', text: PROMPT },
      ],
    }],
  })

  const text = msg.content.find(b => b.type === 'text')?.text ?? ''
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  let parsed: any
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const lastBracket = cleaned.lastIndexOf('},')
    if (lastBracket === -1) throw new Error('Could not parse extraction response')
    parsed = JSON.parse(cleaned.slice(0, lastBracket + 1) + ']')
  }

  let items: ExtractedItem[] = Array.isArray(parsed) ? parsed : (parsed.items ?? [])
  const links: string[] = Array.isArray(parsed) ? [] : (parsed.links ?? []).filter((l: any) => typeof l === 'string' && l.startsWith('http'))

  // Follow links and enrich if any found
  if (links.length > 0) {
    const fetched = await Promise.all(links.slice(0, 10).map(fetchLinkText))
    const linkContent = fetched.map((t, i) => t ? `[${links[i]}]\n${t}` : null).filter(Boolean).join('\n\n---\n\n')
    if (linkContent) {
      try {
        const enrichMsg = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 16000,
          messages: [{
            role: 'user',
            content: `You extracted rider items from a PDF. Links were found and fetched. Add new items or enrich existing ones with info from the links. Return complete updated items array as JSON array only.\n\nExisting items:\n${JSON.stringify(items)}\n\nFetched content:\n${linkContent}`,
          }],
        })
        const enrichRaw = enrichMsg.content.find(b => b.type === 'text')?.text ?? ''
        const enrichCleaned = enrichRaw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
        const enriched = JSON.parse(enrichCleaned)
        if (Array.isArray(enriched) && enriched.length >= items.length) items = enriched
      } catch { /* keep original items */ }
    }
  }

  return items.map(item => ({
    ...item,
    category: CATEGORIES.includes(item.category) ? item.category : 'Other',
    quantity: item.quantity ?? '',
    notes: item.notes ?? '',
  }))
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: showId } = await params

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get all PDF sections for this show
  const { data: sections } = await sb
    .from('rider_pdf_sections')
    .select('*')
    .eq('show_id', showId)
    .order('sort_order')

  // Also check legacy single PDF
  const { data: show } = await sb
    .from('shows')
    .select('rider_pdf_url, artist')
    .eq('id', showId)
    .single()

  const pdfs: { url: string; label: string }[] = []
  if (sections?.length) {
    pdfs.push(...sections.map((s: any) => ({ url: s.public_url, label: s.label })))
  } else if (show?.rider_pdf_url) {
    pdfs.push({ url: show.rider_pdf_url, label: 'Rider' })
  }

  if (!pdfs.length) {
    return NextResponse.json({ error: 'No PDFs found. Upload rider PDFs first.' }, { status: 404 })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Extract items from each PDF section
  const allItems: ExtractedItem[] = []
  const errors: string[] = []

  for (const { url, label } of pdfs) {
    try {
      const items = await extractFromPdf(url, client)
      allItems.push(...items)
    } catch (err: any) {
      errors.push(`${label}: ${err.message}`)
    }
  }

  if (!allItems.length) {
    return NextResponse.json({ error: 'Could not extract items', details: errors }, { status: 422 })
  }

  // Replace existing rider items for this show
  await sb.from('rider_items').delete().eq('show_id', showId)

  const { error: insertErr } = await sb.from('rider_items').insert(
    allItems.map((item, idx) => ({
      show_id: showId,
      category: item.category,
      name: item.name,
      quantity: item.quantity,
      notes: item.notes,
      status: 'pending',
      buyer_note: '',
      sort_order: idx,
    }))
  )

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Save to master rider so future shows auto-populate
  const artist = show?.artist
  if (artist) {
    let masterId: string | null = null
    const { data: existing } = await sb
      .from('rider_masters')
      .select('id')
      .eq('artist', artist)
      .single()

    if (existing) {
      masterId = existing.id
      await sb.from('rider_master_items').delete().eq('master_id', masterId)
    } else {
      const { data: newMaster } = await sb
        .from('rider_masters')
        .insert({ artist, version: '1.0' })
        .select('id')
        .single()
      masterId = newMaster?.id ?? null
    }

    if (masterId) {
      await sb.from('rider_master_items').insert(
        allItems.map((item, idx) => ({
          master_id: masterId,
          category: item.category,
          name: item.name,
          quantity: item.quantity,
          notes: item.notes,
          sort_order: idx,
        }))
      )
      // Bump version timestamp
      await sb.from('rider_masters')
        .update({ version: '1.0', updated_at: new Date().toISOString() })
        .eq('id', masterId)
    }
  }

  return NextResponse.json({
    extracted: allItems.length,
    sections: pdfs.length,
    errors: errors.length ? errors : undefined,
  })
}
