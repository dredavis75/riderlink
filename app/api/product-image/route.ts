import { NextRequest, NextResponse } from 'next/server'
import { lookupLocalLogo } from '@/lib/riderLogos'

export const maxDuration = 15

const cache = new Map<string, { url: string | null; ts: number }>()
const TTL = 1000 * 60 * 60 * 24

// ── Name parsing ──────────────────────────────────────────────────────────────
// "Fiji Water or Smart Water" → "Fiji Water"
// "2 Cases of Red Bull" → "Red Bull"
// "Fried Hot Chicken Wings (Boneless)" → "Fried Hot Chicken Wings"
function parseName(raw: string): string {
  let name = raw
    .replace(/\(.*?\)/g, '')                                         // remove parentheticals
    .replace(/^\d+[\s\-]*(cases?|bottles?|cans?|bags?|boxes?|packs?|lbs?|oz\.?|pieces?|pc)?(\s+of)?\s+/i, '') // strip leading qty
    .trim()
  // Take first option before "or" / "/"
  const orParts = name.split(/\s+(?:or|\/)\s+/i)
  return orParts[0].trim()
}

// ── Spirit/alcohol brand → cocktaildb ingredient name ────────────────────────
const SPIRIT_MAP: [RegExp, string][] = [
  [/hennessy|henny/i,                         'cognac'],
  [/don julio|1942|d\.j\./i,                  'tequila'],
  [/patron|patrón/i,                          'tequila'],
  [/casamigos|clase azul|espolon/i,           'tequila'],
  [/grey goose|gray goose/i,                  'vodka'],
  [/belvedere|tito|ciroc|cîroc|ketel/i,       'vodka'],
  [/jack daniel|jameson|johnnie walker/i,     'whiskey'],
  [/crown royal|maker.?s mark|bulleit/i,      'whiskey'],
  [/moet|veuve|dom perignon|perrier[\s-]jouet/i, 'champagne'],
  [/bacardi/i,                                'rum'],
  [/malibu/i,                                 'rum'],
  [/captain morgan/i,                         'rum'],
  [/baileys/i,                                'baileys irish cream'],
  [/amaretto/i,                               'amaretto'],
  [/kahlua/i,                                 'kahlua'],
  [/midori/i,                                 'midori melon liqueur'],
  [/grand marnier/i,                          'grand marnier'],
  [/cointreau/i,                              'cointreau'],
  [/absolut/i,                                'vodka'],
  [/smirnoff/i,                               'vodka'],
  [/jameson/i,                                'irish whiskey'],
  [/whiskey|whisky|bourbon/i,                 'bourbon'],
  [/cognac|brandy/i,                          'cognac'],
  [/rum\b/i,                                  'rum'],
  [/tequila/i,                                'tequila'],
  [/vodka/i,                                  'vodka'],
  [/gin\b/i,                                  'gin'],
  [/champagne|prosecco|sparkling wine/i,      'champagne'],
  [/\bwine\b|cabernet|merlot|chardonnay|rosé|rose wine/i, 'red wine'],
  [/beer|lager|ale|ipa|stout/i,               'beer'],
  [/corona\b/i,                               'beer'],
  [/heineken/i,                               'beer'],
  [/modelo/i,                                 'beer'],
]

// ── Generic ingredient → cocktaildb name ─────────────────────────────────────
const COCKTAILDB_GENERIC: [RegExp, string][] = [
  [/lemonade/i,        'lemonade'],
  [/orange juice/i,    'orange juice'],
  [/cranberry juice/i, 'cranberry juice'],
  [/pineapple juice/i, 'pineapple juice'],
  [/grapefruit juice/i,'grapefruit juice'],
  [/apple juice/i,     'apple juice'],
  [/lime juice/i,      'lime juice'],
  [/lemon juice/i,     'lemon juice'],
  [/coconut cream/i,   'coconut cream'],
  [/grenadine/i,       'grenadine'],
  [/ginger beer/i,     'ginger beer'],
  [/ginger ale/i,      'ginger ale'],
  [/club soda|soda water/i, 'club soda'],
  [/\bwater\b/i,       'water'],
  [/milk\b/i,          'milk'],
  [/cream\b/i,         'cream'],
  [/honey\b/i,         'honey'],
]

// ── Food items that map well to TheMealDB ────────────────────────────────────
const FOOD_MEAL_QUERIES: [RegExp, string][] = [
  [/chicken wing/i,     'chicken wings'],
  [/\bwings?\b/i,       'chicken wings'],
  [/\bpizza\b/i,        'pizza'],
  [/\bsushi\b/i,        'sushi'],
  [/\bsteak\b/i,        'beef steak'],
  [/\bburger\b/i,       'burger'],
  [/fried chicken/i,    'fried chicken'],
  [/grilled chicken/i,  'grilled chicken'],
  [/chicken tender/i,   'chicken tenders'],
  [/\bpasta\b/i,        'pasta'],
  [/\bsalmon\b/i,       'salmon'],
  [/\bshrimp|prawn/i,   'shrimp'],
  [/\blobster\b/i,      'lobster'],
  [/caesar salad/i,     'caesar salad'],
  [/garden salad/i,     'salad'],
  [/\bsalad\b/i,        'salad'],
  [/fruit tray|fruit platter|fruit bowl/i, 'fruit salad'],
  [/veggie tray|vegetable tray|crudite/i,  'vegetables'],
  [/\bsandwich|sub\b/i, 'sandwich'],
  [/\bwrap\b/i,         'wrap'],
  [/\btacos?\b/i,       'tacos'],
  [/\bsoup\b/i,         'soup'],
  [/\bwaffle\b/i,       'waffles'],
  [/\bpancake\b/i,      'pancakes'],
  [/\bomelette|omelet\b/i, 'omelette'],
  [/\bsushi\b/i,        'sushi'],
  [/cheese\s*(board|tray|platter)/i, 'cheese'],
  [/charcuterie/i,      'charcuterie'],
  [/\bcookies?\b/i,     'cookies'],
  [/\bcake\b/i,         'cake'],
  [/\bbrownie/i,        'brownies'],
  [/\bcupcake/i,        'cupcakes'],
  [/\bdessert\b/i,      'dessert'],
]

// ── Items that are clearly non-food — show category icon, skip fetch ──────────
const SKIP_PATTERNS = [
  /\bcups?\b/i, /\bice\b/i, /\bnapkin/i, /\bplate/i, /\bfork/i, /\bknife/i,
  /\bspoon/i, /\btowel/i, /\bsharpie/i, /\bmarker/i, /\blighter/i,
  /\bcharger/i, /\bextension cord/i, /\bhanger/i, /\bmirror/i,
  /\bcouch/i, /\bchair/i, /\btable/i, /\brug/i, /\bcandle/i,
  /\bincense/i, /\bhumidifier/i, /\bair freshener/i,
]

async function fetchCocktailDb(ingredient: string): Promise<string | null> {
  const slug = encodeURIComponent(ingredient.toLowerCase().replace(/\s+/g, '+'))
  const url = `https://www.thecocktaildb.com/images/ingredients/${slug}-Medium.png`
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.ok ? url : null
  } catch {
    return null
  }
}

async function fetchMealDb(query: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`)
    if (!res.ok) return null
    const data = await res.json()
    const meal = data?.meals?.[0]
    return meal?.strMealThumb ? `${meal.strMealThumb}/preview` : null
  } catch {
    return null
  }
}

async function fetchOpenFoodFacts(query: string): Promise<string | null> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&json=1&page_size=5&fields=product_name,image_front_small_url&sort_by=unique_scans_n`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const queryLower = query.toLowerCase()
    for (const p of data?.products ?? []) {
      const img = p.image_front_small_url
      if (!img || !img.startsWith('http')) continue
      // Require product name to actually contain key words from our query
      const nameLower = (p.product_name ?? '').toLowerCase()
      const queryWords = queryLower.split(' ').filter((w: string) => w.length > 3)
      const matches = queryWords.some((w: string) => nameLower.includes(w))
      if (matches) return img
    }
    return null
  } catch {
    return null
  }
}

async function fetchUnsplash(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=squarish&client_id=${key}`
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.results?.[0]?.urls?.small ?? null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rawName = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''

  if (!rawName) return NextResponse.json({ imageUrl: null })

  const name = parseName(rawName)
  const cacheKey = name.toLowerCase()

  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json({ imageUrl: cached.url }, { headers: { 'Cache-Control': 'public, max-age=86400' } })
  }

  let imageUrl: string | null = null

  // 0. Local rider logos folder — always first, instant, no API call
  const local = lookupLocalLogo(name)
  if (local) {
    cache.set(cacheKey, { url: local, ts: Date.now() })
    return NextResponse.json({ imageUrl: local }, { headers: { 'Cache-Control': 'public, max-age=86400' } })
  }

  // 1. Skip non-visual items immediately
  if (SKIP_PATTERNS.some(p => p.test(name))) {
    cache.set(cacheKey, { url: null, ts: Date.now() })
    return NextResponse.json({ imageUrl: null })
  }

  // 2. Spirit/alcohol brand → CocktailDB
  for (const [pattern, ingredient] of SPIRIT_MAP) {
    if (pattern.test(name)) {
      imageUrl = await fetchCocktailDb(ingredient)
      break
    }
  }

  // 3. Generic cocktail ingredients → CocktailDB
  if (!imageUrl) {
    for (const [pattern, ingredient] of COCKTAILDB_GENERIC) {
      if (pattern.test(name)) {
        imageUrl = await fetchCocktailDb(ingredient)
        break
      }
    }
  }

  // 4. Cooked food → TheMealDB
  if (!imageUrl) {
    for (const [pattern, query] of FOOD_MEAL_QUERIES) {
      if (pattern.test(name)) {
        imageUrl = await fetchMealDb(query)
        break
      }
    }
  }

  // 5. Packaged food/beverages → Open Food Facts (with strict matching)
  if (!imageUrl && ['Food', 'Beverages', 'Dinner', 'Dressing Room', 'Essentials'].includes(category)) {
    imageUrl = await fetchOpenFoodFacts(name)
  }

  // 6. Unsplash fallback (if key is configured)
  if (!imageUrl) {
    const foodQuery = category === 'Food' || category === 'Dinner'
      ? `${name} food platter professional`
      : category === 'Beverages'
      ? `${name} drink bottle beverage`
      : name
    imageUrl = await fetchUnsplash(foodQuery)
  }

  cache.set(cacheKey, { url: imageUrl, ts: Date.now() })
  return NextResponse.json({ imageUrl }, { headers: { 'Cache-Control': 'public, max-age=86400' } })
}
