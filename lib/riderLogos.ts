// Local rider logo lookup — checked FIRST before any external API
// Pattern matches item name (case-insensitive), returns /rider-logos/FILENAME path

export const RIDER_LOGO_MAP: [RegExp, string][] = [
  // ── Spirits & Alcohol ──────────────────────────────────────────────────────
  [/1942|don julio 1942/i,                         '/rider-logos/1942.PNG'],
  [/1738|r[eé]my martin 1738/i,                    '/rider-logos/1738.jpeg'],
  [/vsop|hennessy vsop/i,                          '/rider-logos/VSOP.jpeg'],
  [/dom p[eé]rignon|dom p\b/i,                     '/rider-logos/DOM PERIGNON.webp'],
  [/clase azul/i,                                  '/rider-logos/CLASE AZUL.webp'],
  [/casamigos|casa migos/i,                        '/rider-logos/CASA MIGOS.webp'],
  [/\bcorona\b/i,                                  '/rider-logos/CORONA.webp'],

  // ── Production / Equipment ─────────────────────────────────────────────────
  [/pioneer djm s9|djm.?s9|pioneer djm/i,          '/rider-logos/PIONEER DJM S9.jpg'],
  [/cdj.?2000|cdj\b/i,                             '/rider-logos/PIONEER CDJ2000.webp'],
  [/camera|video recorder|camcorder/i,             '/rider-logos/VIDEO CAMERA.jpg'],

  // ── Transportation ─────────────────────────────────────────────────────────
  [/airfare|round.trip air|airplane|airline/i,     '/rider-logos/AIRPLANE.jpg'],
  [/black suv|suv.*van|sprinter van|runner.*suv|clean suv|\brunner\b/i, '/rider-logos/RUNNER VEHICLE.jpg'],
  [/baggage|luggage|suitcase/i,                    '/rider-logos/BAGGAGE OR SUITCASE.png'],

  // ── Hotel ──────────────────────────────────────────────────────────────────
  [/king suite/i,                                  '/rider-logos/KING SUITE.png'],
  [/king room|non.smoking king/i,                  '/rider-logos/KING ROOM.png'],

  // ── Security ───────────────────────────────────────────────────────────────
  [/security.*dressing room|dressing room.*door/i, '/rider-logos/SECURITY DRESSING ROOM.jpg'],
  [/security.*(?:stairs|vip)|vip.*security|stairs.*stage/i, '/rider-logos/SECURITY STAGE VIP.webp'],
  [/security.*front.?of.?stage|front.?of.?stage.*security/i, '/rider-logos/SECURITY FRONT OF STAGE.jpg'],

  // ── Beverages — branded ────────────────────────────────────────────────────
  [/red bull/i,                                    '/rider-logos/RED BULL.jpeg'],
  [/body armor|bodyarmor/i,                        '/rider-logos/BODY ARMOR.jpeg'],
  [/simply lemonade/i,                             '/rider-logos/SIMPLY LEMONADE.jpeg'],
  [/smart water|smartwater/i,                      '/rider-logos/SMART WATER.jpeg'],
  [/sprite/i,                                      '/rider-logos/SPRITE.jpeg'],
  [/coke|coca.?cola/i,                             '/rider-logos/COKE.jpeg'],
  [/5.?hour energy/i,                              '/rider-logos/5 HOUR ENERGY.jpeg'],
  [/aloe\s*(?:water|juice|vera|drink|variety)/i,   '/rider-logos/ALOE JUICE.jpeg'],
  [/ginger beer|ginger ale|ginger juice/i,         '/rider-logos/GINGER.jpeg'],

  // Assorted / mixed sodas
  [/assort\w+\s+(?:of\s+)?soda|mix\w*\s+soda|variety\s+(?:of\s+)?soda|soda\s+(?:variety|assort|mix)/i, '/rider-logos/ASSORTMENT OF SODAS.webp'],
  [/cases?\s+of\s+(?:soda|pop)|soda\s+cases?/i,   '/rider-logos/ASSORTMENT OF SODAS.webp'],

  // Bottled water — specific first, generic last
  [/essentia/i,                                    '/rider-logos/ESSENTIA BOTTLED WATER.jpg'],
  [/room temp\w*\s+water|water stage left/i,       '/rider-logos/ESSENTIA BOTTLED WATER.jpg'],
  [/deer park|case.* water|water.* case/i,         '/rider-logos/CASE OF DEER PARK WATER.webp'],
  [/bottled water|fiji|evian|voss/i,               '/rider-logos/SMART WATER.jpeg'],

  // ── Juices ─────────────────────────────────────────────────────────────────
  [/apple juice/i,                                 '/rider-logos/APPLE JUICE.jpeg'],
  [/cranberry juice/i,                             '/rider-logos/CRANBERRY JUICE.jpeg'],
  [/orange juice|\boj\b/i,                         '/rider-logos/ORANGEJUICE.jpeg'],
  [/pineapple juice/i,                             '/rider-logos/PINEAPPLE JUICE.jpeg'],

  // ── Tea ────────────────────────────────────────────────────────────────────
  [/tea cup/i,                                     '/rider-logos/TEA CUP.jpeg'],
  [/\btea\b/i,                                     '/rider-logos/TEA.jpg'],

  // ── Food ───────────────────────────────────────────────────────────────────
  [/dinner buyout|buyout/i,                        '/rider-logos/BUYOUT.jpg'],
  [/\bpizzas?\b/i,                                 '/rider-logos/PIZZA.jpg'],
  [/fried hot chicken wings|wings?.*ranch|wings?/i,'/rider-logos/WINGS.jpeg'],
  [/fish (or|and|&) chicken|fried fish|catfish|tilapia|non.vegetarian.*fish|fish.*chicken/i, '/rider-logos/FISH AND CHICKEN.jpg'],
  [/\bfish\b/i,                                    '/rider-logos/FISH AND CHICKEN.jpg'],
  [/rolls? with butter|dinner rolls?|bread rolls?|\brolls?\b/i, '/rider-logos/ROLLS WITH BUTTER.jpg'],
  [/snack platter|snack tray|\bsnacks?\b/i,        '/rider-logos/SNACK PLATTER.jpg'],
  [/vegetables? and rice|vegg?ies? and rice|side dishes.*rice|rice.*vegg?\w*|\brice\b/i, '/rider-logos/VEGEATBLES AND RICE.jpg'],
  [/condiments?|ketchup|mustard|hot sauce|\bsauces?\b/i, '/rider-logos/CONDIMENTS.jpg'],
  [/fruit tray|fruit platter|fruit bowl|assorted fruit/i, '/rider-logos/FRUIT TRAY.jpeg'],
  [/veggie tray|vegetable tray|crudite|assorted veggie/i, '/rider-logos/VEGGIE TRAY.jpeg'],
  [/deli tray|cold cuts|charcuterie/i,             '/rider-logos/DELI TRAY.jpeg'],

  // Chips & salsa
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
  [/private dressing rooms?,\s*large and comfortable/i, '/rider-logos/DRRESSING ROOM.jpg'],
  [/candles?/i,                                    '/rider-logos/CANDLE.jpg'],
  [/solo cups?|red cups?|plastic cups?/i,          '/rider-logos/SOLO RED CUPS.jpeg'],
  [/\bcups?\b/i,                                   '/rider-logos/SOLO RED CUPS.jpeg'],

  // Ice — whole word only to avoid "service", "device", "advice"
  [/\bice\b|bag of ice|bucket of ice|container of ice/i, '/rider-logos/ICE IN COOLER.jpeg'],

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
