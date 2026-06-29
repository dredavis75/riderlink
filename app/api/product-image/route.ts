import { NextRequest, NextResponse } from 'next/server'

const cache = new Map<string, { url: string | null; ts: number }>()
const TTL = 1000 * 60 * 60 * 24 // 24 hours

const FOOD_CATEGORIES = new Set(['Food', 'Beverages', 'Dinner', 'Dressing Room', 'Essentials'])

async function searchOpenFoodFacts(query: string): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=5&fields=product_name,image_small_url,image_front_small_url`
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const data = await res.json()
    const products = data?.products ?? []
    for (const p of products) {
      const img = p.image_front_small_url || p.image_small_url
      if (img && img.startsWith('http')) return img
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function searchGoogle(query: string): Promise<string | null> {
  const key = process.env.GOOGLE_SEARCH_API_KEY
  const cx  = process.env.GOOGLE_SEARCH_CX
  if (!key || !cx) return null
  try {
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query + ' product')}&searchType=image&num=1&imgSize=medium&key=${key}&cx=${cx}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    return data?.items?.[0]?.link ?? null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q        = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''

  if (!q) return NextResponse.json({ imageUrl: null })

  const key = `${category}:${q.toLowerCase()}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json({ imageUrl: cached.url }, {
      headers: { 'Cache-Control': 'public, max-age=86400' }
    })
  }

  let imageUrl: string | null = null

  if (FOOD_CATEGORIES.has(category)) {
    imageUrl = await searchOpenFoodFacts(q)
    if (!imageUrl) imageUrl = await searchGoogle(q)
  } else {
    imageUrl = await searchGoogle(q)
  }

  cache.set(key, { url: imageUrl, ts: Date.now() })

  return NextResponse.json({ imageUrl }, {
    headers: { 'Cache-Control': 'public, max-age=86400' }
  })
}
