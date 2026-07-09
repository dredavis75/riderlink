'use client'

import { useState, useEffect } from 'react'

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍽️',
  Beverages: '🥤',
  Dinner: '🍴',
  Production: '🎛️',
  Security: '🔒',
  Transportation: '🚐',
  Hotel: '🏨',
  Venue: '🏟️',
  'Dressing Room': '🪞',
  'Production Office': '📋',
  Essentials: '✅',
  Other: '📦',
}

// Items that should NEVER get a local or AI image — just show the emoji
const SKIP_IMAGE = [
  'colored flames',
  'colour flames',
  'english speaking',
  'knobs',
  'a1 english',
]

function shouldSkipImage(name: string): boolean {
  const lower = name.toLowerCase()
  return SKIP_IMAGE.some(kw => lower.includes(kw))
}

// Most-specific keywords FIRST — first match wins
const LOCAL_IMAGE_MAP: [string[], string][] = [

  // ── Transportation ────────────────────────────────────────────────────────
  [['runner vehicle', 'runner van', 'runner car', 'runner'], '/rider-logos/RUNNER VEHICLE.jpg'],
  // Black SUV — also catches escalade, mercedes gl, suburban, etc.
  [['black suv', 'black escalade', 'escalade', 'mercedes gl', 'gl line', 'gl450', 'gl550',
     'black suburban', 'suburban', 'black navigator', 'navigator', 'black sprinter', 'sprinter'],
   '/rider-logos/BLACK SUV.jpg'],
  [['airplane', 'flight', 'plane', 'aircraft'], '/rider-logos/AIRPLANE.jpg'],
  [['baggage', 'suitcase', 'luggage'], '/rider-logos/BAGGAGE OR SUITCASE.png'],

  // ── Water ─────────────────────────────────────────────────────────────────
  [['essentia water', 'essentia bottled', 'essentia'], '/rider-logos/ESSENTIA BOTTLED WATER.jpg'],
  [['smart water', 'smartwater'], '/rider-logos/SMART WATER.jpeg'],
  [['penta water', 'penta'], '/rider-logos/penta water.jpeg'],
  [['deer park', 'case of water', 'water bottles', 'spring water', 'room temperature spring water',
     'dozen bottles of water', 'stage water', 'bottled water', 'still water'],
   '/rider-logos/CASE OF DEER PARK WATER.webp'],

  // ── Juices — pineapple BEFORE apple to avoid substring collision ───────────
  [['pineapple juice', 'gallon pineapple', 'pineapple'], '/rider-logos/PINEAPPLE JUICE.jpeg'],
  [['100% fruit juice', '100% fruit juices', '100 percent fruit juice', 'fruit juices', 'assorted juices'],
   '/rider-logos/fruit-juices.jpeg'],
  [['cranberry juice', 'cranberry'], '/rider-logos/CRANBERRY JUICE.jpeg'],
  [['aloe juice', 'aloe vera juice'], '/rider-logos/ALOE JUICE.jpeg'],
  [['orange juice', 'fresh squeezed orange', ' oj'], '/rider-logos/ORANGEJUICE.jpeg'],
  [['simply lemonade', 'lemonade'], '/rider-logos/SIMPLY LEMONADE.jpeg'],
  [['apple juice'], '/rider-logos/APPLE JUICE.jpeg'],
  [['naked juice'], '/rider-logos/case of naked juice.jpeg'],
  [['ginger ale', 'ginger beer'], '/rider-logos/case of ginger ale.jpeg'],

  // ── Energy / Functional ───────────────────────────────────────────────────
  [['body armor', 'bodyarmor'], '/rider-logos/BODY ARMOR.jpeg'],
  [['red bull', 'redbull'], '/rider-logos/RED BULL.jpeg'],
  [['celsius'], '/rider-logos/celsius.jpeg'],
  [['5 hour energy', 'five hour energy'], '/rider-logos/5 HOUR ENERGY.jpeg'],
  [['vitamin water', 'vitaminwater'], '/rider-logos/vitamin water.jpeg'],

  // ── Milk ──────────────────────────────────────────────────────────────────
  [['almond milk'], '/rider-logos/almond milk.jpeg'],
  [['fairlife milk', 'fairlife', 'whole milk', 'milk'], '/rider-logos/fairlife milk.jpeg'],

  // ── Sodas ─────────────────────────────────────────────────────────────────
  [['coca cola', 'coke', 'diet coke'], '/rider-logos/COKE.jpeg'],
  [['sprite'], '/rider-logos/SPRITE.jpeg'],
  [['corona beer', 'corona'], '/rider-logos/CORONA.webp'],
  [['assortment of sodas', 'assorted sodas', 'variety of sodas', 'sodas', 'soda'],
   '/rider-logos/ASSORTMENT OF SODAS.webp'],

  // ── Spirits — 1942 vs anejo are different bottles ─────────────────────────
  [['don julio 1942', '1942 tequila'], '/rider-logos/1942.PNG'],
  [['don julio anejo', 'don julio añejo'], '/rider-logos/don julio anejo.jpeg'],
  [['don julio reposado', 'don julio blanco', 'don julio'], '/rider-logos/1942.PNG'],
  [['clase azul', 'clase'], '/rider-logos/CLASE AZUL.webp'],
  [['casamigos', 'casa migos'], '/rider-logos/CASA MIGOS.webp'],
  [['hennessey vsop', 'hennessy vsop', 'vsop'], '/rider-logos/VSOP.jpeg'],
  [['hennessey', 'hennessy cognac', 'hennessy'], '/rider-logos/hennessey.jpeg'],
  [['belvedere vodka', 'belvedere', 'vodka'], '/rider-logos/belvedere vodka.jpeg'],
  [['ciroc'], '/rider-logos/ciroc.jpeg'],
  [['dom perignon', 'champagne', 'bubbly'], '/rider-logos/DOM PERIGNON.webp'],
  [['1738', 'remy martin', 'remy'], '/rider-logos/1738.jpeg'],

  // ── Snacks — tortilla BEFORE chips to avoid substring collision ────────────
  [['vego gummy', 'vego'], '/rider-logos/vego gummy bears.jpeg'],
  [['haribo gummy', 'haribo'], '/rider-logos/haribo gummy bears.jpeg'],
  [['gummy bears', 'gummies', 'gummy candy'], '/rider-logos/haribo gummy bears.jpeg'],
  [['uncrustables'], '/rider-logos/UNCRUSTABLES.jpeg'],
  [['tortilla chips and salsa', 'tortilla chips', 'chips and salsa', 'chips with salsa'],
   '/rider-logos/tortilla chips and salsa.jpeg'],
  [['honey roasted nuts', 'honey roasted cashews', 'honey roasted'],
   '/rider-logos/HONEY ROASTED NUTS.jpeg'],
  [['bag of cashews', 'cashews'], '/rider-logos/bag of cashews.jpeg'],
  [['assorted chips', 'variety of chips', 'bag of chips'], '/rider-logos/ASSORTED CHIPS.jpeg'],
  [['assorted nuts', 'mixed nuts', 'variety of nuts'], '/rider-logos/ASSORTED NUTS.jpeg'],

  // ── Fruit ─────────────────────────────────────────────────────────────────
  [['aftershow fruit', 'after show fruit', 'after-show fruit', 'post show fruit', 'post-show fruit',
     'fruit tray', 'fruit platter', 'assorted fruit', 'bowl of cold cut fruit',
     'fresh cut fruit', 'cut fruit', 'fresh fruit'],
   '/rider-logos/FRUIT TRAY.jpeg'],
  [['large bowl of uncut fruit', 'uncut fruit', 'whole fruit'],
   '/rider-logos/large bowl of uncut fruit.jpeg'],

  // ── Food ──────────────────────────────────────────────────────────────────
  [['veggie tray', 'vegetable tray', 'vegetable platter'], '/rider-logos/VEGGIE TRAY.jpeg'],
  [['deli tray', 'cold cuts', 'charcuterie'], '/rider-logos/DELI TRAY.jpeg'],
  [['snack platter', 'snack tray'], '/rider-logos/SNACK PLATTER.jpg'],
  [['pizza', 'cheese and pepperoni', 'pepperoni pizza'], '/rider-logos/PIZZA.jpg'],
  [['wings', 'chicken wings', 'buffalo wings'], '/rider-logos/WINGS.jpeg'],
  [['fish and chicken', 'fish dinner'], '/rider-logos/FISH AND CHICKEN.jpg'],
  [['grilled chicken', 'chicken breast'], '/rider-logos/grilled chicken breast.jpeg'],
  [['jasmine rice', 'white rice', 'steamed rice', 'rice'], '/rider-logos/jasmine rice.jpeg'],
  [['vegetables and rice', 'veggies and rice'], '/rider-logos/VEGEATBLES AND RICE.jpg'],
  [['mixed green salad', 'garden salad', 'salad'], '/rider-logos/mixed green salad.jpeg'],
  [['plain hummus', 'hummus'], '/rider-logos/plain hummus.jpeg'],
  [['pita bread', 'pita'], '/rider-logos/pita bread.jpeg'],
  [['loaf of bread', 'wheat bread', 'white bread', 'bread'], '/rider-logos/WHEAT BREAD.jpeg'],
  [['rolls with butter', 'dinner rolls', 'rolls'], '/rider-logos/ROLLS WITH BUTTER.jpg'],
  [['dinner service', 'full dinner', 'plated dinner'], '/rider-logos/DINNER SERVICE.jpeg'],
  [['egg station', 'made to order eggs', 'eggs made to order'], '/rider-logos/EGG STATION MADE TO ORDER.jpeg'],
  [['breakfast'], '/rider-logos/breakfast.jpeg'],
  [['lunch'], '/rider-logos/lunch.jpeg'],
  [['buyout', 'buy out', 'meal buyout', 'food buyout'], '/rider-logos/BUYOUT.jpg'],
  [['condiments', 'ketchup', 'mustard'], '/rider-logos/CONDIMENTS.jpg'],
  [['honey'], '/rider-logos/HONEY.jpeg'],
  [['lemons', 'lemon'], '/rider-logos/LEMONS.jpeg'],
  [['ginger root', 'fresh ginger'], '/rider-logos/GINGER.jpeg'],
  [['paper plates', 'paper bowls', 'disposable plates', 'cutlery'], '/rider-logos/PAPER PLATES BOWLS CUTLERY.jpeg'],
  [['solo cups', 'red cups', 'plastic cups'], '/rider-logos/SOLO RED CUPS.jpeg'],
  [['spoon', 'serving utensils', 'silverware'], '/rider-logos/SPOON.jpeg'],

  // ── Hot Drinks ────────────────────────────────────────────────────────────
  [['green tea', 'herbal tea', 'hot tea', 'tea'], '/rider-logos/TEA.jpg'],
  [['tea cup', 'coffee cup', 'mug'], '/rider-logos/TEA CUP.jpeg'],
  [['electric kettle', 'kettle', 'hot water kettle'], '/rider-logos/ELECTRIC KETT;E.jpeg'],

  // ── Hotel — "room" removed (too broad) ───────────────────────────────────
  [['king suite', 'hotel suite', 'penthouse suite'], '/rider-logos/KING SUITE.png'],
  [['king room', 'hotel room', 'standard hotel room'], '/rider-logos/KING ROOM.png'],

  // ── Dressing Room ─────────────────────────────────────────────────────────
  [['lockable dressing room', 'dressing room with key', 'dressing room lock',
     'secure dressing room', 'private dressing room'],
   '/rider-logos/SECURITY DRESSING ROOM.jpg'],
  [['dressing room', 'green room', 'artist room'], '/rider-logos/DRRESSING ROOM.jpg'],
  [['black leather furniture', 'leather couch', 'leather sofa', 'leather furniture'],
   '/rider-logos/black leather furniture.jpeg'],
  [['full length mirror', 'floor mirror', 'standing mirror'], '/rider-logos/full length mirror.jpeg'],
  [['six ft table', '6 ft table', '6ft table', 'table with tablecloth'], '/rider-logos/Six ft tables with table cloths (no skirt).jpeg'],
  [['office chair', 'desk chair'], '/rider-logos/office chair.jpeg'],
  [['menu', 'dinner menu', 'food menu'], '/rider-logos/menu.jpeg'],

  // ── Towels — most specific first ──────────────────────────────────────────
  [['brand new white bath towels', 'brand new white towels', 'brand new towels white',
     'white bath towels', 'white towels'],
   '/rider-logos/brand new white bath towels.jpeg'],
  [['brand new hand towels black', 'black hand towels', 'new black hand towels'],
   '/rider-logos/BLACK FACE TOWELS.jpeg'],
  [['brand new hand towels', 'set of brand new towels', 'new hand towels'],
   '/rider-logos/set of brand new towels.jpeg'],
  [['black bath towels', 'dark bath towels'], '/rider-logos/BLACK BATH TOWELS.jpeg'],
  [['black face towels', 'black wash cloth', 'face towels', 'wash cloths'],
   '/rider-logos/BLACK FACE TOWELS.jpeg'],
  [['paper towels'], '/rider-logos/PAPER TOWELS.jpeg'],
  [['towels'], '/rider-logos/set of brand new towels.jpeg'],

  // ── Toiletries ────────────────────────────────────────────────────────────
  [['dove soap', 'bar soap', 'body wash', 'soap'], '/rider-logos/dove soap.jpeg'],
  [['lotion', 'body lotion', 'moisturizer'], '/rider-logos/lotion.jpeg'],
  [['mouthwash', 'listerine'], '/rider-logos/mouthwash.jpeg'],
  [['toothbrush', 'toothpaste', 'oral hygiene'], '/rider-logos/TOOTHBRUSH & TOOTHPASTE.jpeg'],
  [['hand sanitizer', 'sanitizer'], '/rider-logos/HAND SANITIZER.jpeg'],
  [['kleenex', 'facial tissues', 'tissues'], '/rider-logos/KLEENEX.jpeg'],
  [['q-tips', 'qtips', 'cotton swabs'], '/rider-logos/qtips.jpeg'],
  [['dayquil', 'day quil', 'day-quil', 'nyquil', 'ny quil', 'cold medicine', 'cold and flu'],
   '/rider-logos/dayquil.jpeg'],
  [['advil', 'ibuprofen', 'tylenol', 'pain reliever', 'aspirin', 'medicine'],
   '/rider-logos/advil.jpeg'],
  [['secret deodorant', 'deodorant', 'antiperspirant'], '/rider-logos/secret.jpeg'],

  // ── Tech ──────────────────────────────────────────────────────────────────
  [['iphone charger', 'phone charger', 'lightning cable', 'usb-c charger', 'charger'],
   '/rider-logos/IPHONE CHARGER.jpeg'],
  [['110 volt service', '110v service', '110 volt outlet', '110v outlet', '110 volt', '110v'],
   '/rider-logos/110 volt.jpeg'],
  [['ethernet cable', 'ethernet connection', 'ethernet'], '/rider-logos/ethernet.jpeg'],
  [['extension cord', 'power extension'], '/rider-logos/extension cords.jpeg'],
  [['power strip', 'surge protector'], '/rider-logos/power strips.jpeg'],
  [['high speed wifi', 'wi-fi access', 'wifi access', 'wi-fi', 'wifi', 'wireless internet',
     'internet access', 'high speed internet'],
   '/rider-logos/hi speed wifi.png'],
  [['thermostat', 'temperature control', 'hvac control'], '/rider-logos/thermostat.jpeg'],
  [['laptop stand', 'monitor stand'], '/rider-logos/LAPTOP STAND.jpeg'],

  // ── Speakers — specific models & bluetooth only, not generic "speaker" ─────
  [['portable bluetooth speaker', 'bluetooth speaker', 'bluetooth audio', 'portable speaker'],
   '/rider-logos/speaker.jpeg'],
  [['pioneer cdj 2000', 'cdj 2000', 'cdj2000'], '/rider-logos/PIONEER CDJ2000.webp'],
  [['pioneer djm s9', 'djm s9', 'djm mixer', 'dj mixer'], '/rider-logos/PIONEER DJM S9.jpg'],
  [['pioneer dj controller', 'ddj 1000', 'dj controller'], '/rider-logos/Pioneer DJ DDJ 1000 DJ controller.jpeg'],
  [['video camera', 'camera crew', 'filming'], '/rider-logos/VIDEO CAMERA.jpg'],

  // ── Candles ───────────────────────────────────────────────────────────────
  [['pomegranate candle', 'scented candle', 'aromatherapy candle', 'henri bendel'],
   '/rider-logos/henri bendel candle.jpeg'],
  [['candle'], '/rider-logos/CANDLE.jpg'],

  // ── Misc ──────────────────────────────────────────────────────────────────
  [['gum', 'chewing gum'], '/rider-logos/GUM.jpeg'],
  [['sugar free mints', 'breath mints', 'mints', 'altoids'], '/rider-logos/sugar free mints.jpeg'],
  [['sharpies', 'sharpie', 'markers'], '/rider-logos/SHARPIES.jpeg'],
  [['ice in cooler', 'cooler with ice', 'ice bucket', 'bag of ice', 'ice'],
   '/rider-logos/ICE IN COOLER.jpeg'],
  [['5 pack white tee', 'white t-shirt pack', 'white tees'], '/rider-logos/5 PACK WHITE TEE MEDIUM.jpeg'],

  // ── Security ──────────────────────────────────────────────────────────────
  [['security outside dressing room', 'security at dressing room', 'security dressing room'],
   '/rider-logos/SECURITY DRESSING ROOM.jpg'],
  [['security front of stage', 'front of stage security', 'stage barricade security'],
   '/rider-logos/SECURITY FRONT OF STAGE.jpg'],
  [['security stage vip', 'vip area security', 'security at vip', 'security guard'],
   '/rider-logos/SECURITY STAGE VIP.webp'],

  // ── Venue ─────────────────────────────────────────────────────────────────
  [['crowd control banner', 'barricade banner', 'crowd banner', 'stage banner'],
   '/rider-logos/CROWD BANNER 1.jpeg'],
]

function getLocalImage(name: string): string | null {
  const lower = name.toLowerCase()
  for (const [keywords, path] of LOCAL_IMAGE_MAP) {
    if (keywords.some(kw => lower.includes(kw))) return path
  }
  return null
}

const CACHE_VERSION = 'v18'
const imageCache = new Map<string, string | null>()
const pending = new Map<string, Promise<string | null>>()

// Community photos — fetched once per session, shared across all ProductImage instances
let communityPhotos: { keyword: string; url: string }[] | null = null
let communityFetch: Promise<void> | null = null

async function loadCommunityPhotos() {
  if (communityPhotos !== null) return
  if (communityFetch) { await communityFetch; return }
  communityFetch = fetch('/api/community-photos')
    .then(r => r.json())
    .then(d => { communityPhotos = Array.isArray(d) ? d : [] })
    .catch(() => { communityPhotos = [] })
  await communityFetch
}

function getCommunityImage(name: string): string | null {
  if (!communityPhotos) return null
  const lower = name.toLowerCase()
  const match = communityPhotos.find(p => lower.includes(p.keyword))
  return match?.url ?? null
}

function resolveImage(name: string, category: string): Promise<string | null> {
  if (shouldSkipImage(name)) return Promise.resolve(null)
  const local = getLocalImage(name)
  if (local) return Promise.resolve(local)

  const key = `${CACHE_VERSION}:${name.toLowerCase()}`
  if (imageCache.has(key)) return Promise.resolve(imageCache.get(key)!)
  if (pending.has(key)) return pending.get(key)!

  const p = loadCommunityPhotos().then(() => {
    const community = getCommunityImage(name)
    if (community) { imageCache.set(key, community); return community }
    return fetch(`/api/product-image?v=10&q=${encodeURIComponent(name)}&category=${encodeURIComponent(category)}`)
      .then(r => r.json())
      .then(d => { imageCache.set(key, d.imageUrl ?? null); return d.imageUrl ?? null })
      .catch(() => { imageCache.set(key, null); return null })
  }).finally(() => pending.delete(key))

  pending.set(key, p)
  return p
}

interface Props {
  name: string
  category: string
  size?: number
  imageUrl?: string
}

export default function ProductImage({ name, category, size = 64, imageUrl }: Props) {
  const [url, setUrl] = useState<string | null | undefined>(imageUrl ?? undefined)
  const [loadKey, setLoadKey] = useState(0)
  const emoji = CATEGORY_EMOJI[category] ?? '📦'

  useEffect(() => {
    // A manually-assigned photo always wins — skip all keyword guessing.
    if (imageUrl) { setUrl(imageUrl); return }
    if (shouldSkipImage(name)) { setUrl(null); return }
    const local = getLocalImage(name)
    if (local) { setUrl(local); return }
    const key = `${CACHE_VERSION}:${name.toLowerCase()}`
    if (imageCache.has(key)) { setUrl(imageCache.get(key)!); return }
    // Check community photos then AI fallback
    resolveImage(name, category).then(setUrl)
  }, [name, category, imageUrl])

  const style = { width: size, height: size, minWidth: size, minHeight: size }

  if (url === undefined) {
    return <div className="rounded-xl shrink-0 bg-amber-50 animate-pulse" style={style} />
  }

  if (!url) {
    return (
      <div className="rounded-xl shrink-0 bg-amber-50 border border-amber-200 flex items-center justify-center" style={style}>
        <span style={{ fontSize: size * 0.42 }}>{emoji}</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl shrink-0 bg-amber-50 border border-amber-200 overflow-hidden flex items-center justify-center" style={style}>
      <img
        key={loadKey}
        src={loadKey > 0 ? `${url}?r=${loadKey}` : url}
        alt={name}
        width={size}
        height={size}
        className="object-contain w-full h-full"
        onError={() => {
          if (loadKey < 2) {
            setLoadKey(k => k + 1)
          } else {
            // Only pollute the shared name-based cache for keyword-guessed
            // images — a manually-assigned photo failing shouldn't affect
            // other items that happen to share this item's name.
            if (!imageUrl) imageCache.set(`${CACHE_VERSION}:${name.toLowerCase()}`, null)
            setUrl(null)
          }
        }}
      />
    </div>
  )
}
