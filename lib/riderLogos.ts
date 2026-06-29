// Local rider logo lookup — checked FIRST before any external API
// Pattern matches item name (case-insensitive), returns /rider-logos/FILENAME path

export const RIDER_LOGO_MAP: [RegExp, string][] = [
  // ── Spirits & Alcohol ──────────────────────────────────────────────────────
  [/1942|don julio 1942/i,                         '/rider-logos/1942.PNG'],
  [/1738|r[eé]my martin 1738/i,                    '/rider-logos/1738.jpeg'],
  [/vsop|hennessy vsop/i,                          '/rider-logos/VSOP.jpeg'],
  // User will drop these in the RIDER LOGOS folder — filenames expected:
  [/dom p[eé]rignon|dom p/i,                       '/rider-logos/DOM PERIGNON.jpeg'],
  [/clase azul/i,                                  '/rider-logos/CLASE AZUL.jpeg'],
  [/casamigos|casa migos/i,                        '/rider-logos/CASAMIGOS.jpeg'],

  // ── Beverages — branded ────────────────────────────────────────────────────
  [/red bull/i,                                    '/rider-logos/RED BULL.jpeg'],
  [/body armor|bodyarmor/i,                        '/rider-logos/BODY ARMOR.jpeg'],
  [/simply lemonade/i,                             '/rider-logos/SIMPLY LEMONADE.jpeg'],
  [/smart water|smartwater/i,                      '/rider-logos/SMART WATER.jpeg'],
  [/sprite/i,                                      '/rider-logos/SPRITE.jpeg'],
  [/coke|coca.?cola/i,                             '/rider-logos/COKE.jpeg'],
  [/5.?hour energy/i,                              '/rider-logos/5 HOUR ENERGY.jpeg'],
  [/aloe.?(water|juice|vera|drink)/i,              '/rider-logos/ALOE JUICE.jpeg'],
  [/ginger beer|ginger ale|ginger juice/i,         '/rider-logos/GINGER.jpeg'],

  // Assorted / mixed sodas
  [/assort\w* soda|mix\w* soda|variety.* soda|soda.*(variety|assort|mix)/i, '/rider-logos/COKE.jpeg'],
  [/cases? of (soda|pop)|soda cases?/i,            '/rider-logos/COKE.jpeg'],

  // Generic bottled water
  [/bottled water|case.* water|water.* case|essentia|deer park|fiji|evian|voss/i, '/rider-logos/SMART WATER.jpeg'],

  // ── Juices ─────────────────────────────────────────────────────────────────
  [/apple juice/i,                                 '/rider-logos/APPLE JUICE.jpeg'],
  [/cranberry juice/i,                             '/rider-logos/CRANBERRY JUICE.jpeg'],
  [/orange juice|\boj\b/i,                         '/rider-logos/ORANGEJUICE.jpeg'],
  [/pineapple juice/i,                             '/rider-logos/PINEAPPLE JUICE.jpeg'],

  // ── Tea ────────────────────────────────────────────────────────────────────
  [/tea cup/i,                                     '/rider-logos/TEA CUP.jpeg'],
  [/\btea\b/i,                                     '/rider-logos/TEA.jpg'],

  // ── Food ───────────────────────────────────────────────────────────────────
  [/wings?|chicken wings?/i,                       '/rider-logos/WINGS.jpeg'],
  [/fruit tray|fruit platter|fruit bowl/i,         '/rider-logos/FRUIT TRAY.jpeg'],
  [/veggie tray|vegetable tray|crudite/i,          '/rider-logos/VEGGIE TRAY.jpeg'],
  [/deli tray|cold cuts|charcuterie/i,             '/rider-logos/DELI TRAY.jpeg'],

  // Chips & salsa / tortilla chips — use ASSORTED CHIPS
  [/tortilla chips?|chips?.*(salsa|dip)|chips? and (mango|salsa)/i, '/rider-logos/ASSORTED CHIPS.jpeg'],
  [/mango salsa|chips? & salsa/i,                  '/rider-logos/ASSORTED CHIPS.jpeg'],
  [/assorted chips?|chips? tray|\bchips?\b/i,      '/rider-logos/ASSORTED CHIPS.jpeg'],

  [/assorted nuts?/i,                              '/rider-logos/ASSORTED NUTS.jpeg'],
  [/honey roasted nuts?/i,                         '/rider-logos/HONEY ROASTED NUTS.jpeg.webp'],

  // PB&J / peanut butter → Uncrustables
  [/uncrustables?/i,                               '/rider-logos/UNCRUSTABLES.jpg.webp'],
  [/peanut butter|pb\s*(&|and)\s*j|pb&j/i,        '/rider-logos/UNCRUSTABLES.jpg.webp'],

  [/wheat bread|sandwich bread/i,                  '/rider-logos/WHEAT BREAD.jpeg'],
  [/lemons?/i,                                     '/rider-logos/LEMONS.jpeg'],
  [/honey\b/i,                                     '/rider-logos/HONEY.jpeg'],
  [/\bgum\b|chewing gum/i,                         '/rider-logos/GUM.jpeg'],

  // ── Dressing room / essentials ─────────────────────────────────────────────
  [/candles?/i,                                    '/rider-logos/CANDLE.jpg'],
  [/solo cups?|red cups?|plastic cups?/i,          '/rider-logos/SOLO RED CUPS.jpeg'],
  [/\bcups?\b/i,                                   '/rider-logos/SOLO RED CUPS.jpeg'],

  // Ice — \bice\b only (whole word), prevents false matches on "service", "device", "advice"
  [/\bice\b|bag of ice|bucket of ice/i,            '/rider-logos/ICE IN COOLER.jpeg'],

  [/hand sanitizer/i,                              '/rider-logos/HAND SANITIZER.jpeg'],
  [/kleenex|tissues?/i,                            '/rider-logos/KLEENEX.jpeg'],
  [/sharpie|markers?/i,                            '/rider-logos/SHARPIES.jpeg'],
  [/lighter|bic/i,                                 '/rider-logos/BIC LIGHTER.jpeg'],
  [/iphone charger|phone charger|charger/i,        '/rider-logos/IPHONE CHARGER.jpeg'],
  [/black (bath|hand) towel|bath towel/i,          '/rider-logos/BLACK BATH TOWELS.jpeg'],
  [/black (face|hand) towel|hand towel|face towel/i, '/rider-logos/BLACK FACE TOWELS.jpeg'],
  [/paper towel/i,                                 '/rider-logos/PAPER TOWELS.jpeg'],
  [/paper plate|plates?.*(bowl|cutlery)|cutlery/i, '/rider-logos/PAPER PLATES BOWLS CUTLERY.jpeg'],
  [/spoons?/i,                                     '/rider-logos/SPOON.jpeg'],
  [/toothbrush|toothpaste|dental/i,                '/rider-logos/TOOTHBRUSH & TOOTHPASTE.jpeg'],
  [/electric kettle|kettle/i,                      '/rider-logos/ELECTRIC KETT;E.jpeg'],
  [/white tee|t[\s-]?shirt|tshirt/i,               '/rider-logos/5 PACK WHITE TEE MEDIUM.jpeg'],
]

export function lookupLocalLogo(name: string): string | null {
  for (const [pattern, path] of RIDER_LOGO_MAP) {
    if (pattern.test(name)) return path
  }
  return null
}
