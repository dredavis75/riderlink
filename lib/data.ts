export type ItemStatus = 'pending' | 'confirmed' | 'unavailable' | 'substituted'

export interface RiderItem {
  id: string
  category: string
  name: string
  quantity: string
  notes: string
  status: ItemStatus
  buyerNote: string
}

export interface Message {
  id: string
  from: 'manager' | 'buyer'
  sender: string
  text: string
  timestamp: string
}

export interface Show {
  id: string
  artist: string
  venue: string
  city: string
  date: string
  buyerName: string
  buyerEmail: string
  status: 'draft' | 'sent' | 'active' | 'confirmed'
  items: RiderItem[]
  messages: Message[]
  buyerApprovedAt?: string
  buyerApprovedName?: string
  riderVersion?: string
}

export interface MasterRiderItem {
  id: string
  masterId: string
  category: string
  name: string
  quantity: string
  notes: string
  sortOrder: number
}

export interface MasterRider {
  id: string
  artist: string
  version: string
  updatedAt: string
  items: MasterRiderItem[]
}

export const MOCK_SHOWS: Show[] = [
  {
    id: 'show-atl-001',
    artist: 'SKRILLA',
    venue: 'State Farm Arena',
    city: 'Atlanta, GA',
    date: '2026-08-15',
    buyerName: 'Marcus Thompson',
    buyerEmail: 'marcus@statefarm-arena.com',
    status: 'active',
    messages: [
      {
        id: 'm1',
        from: 'buyer',
        sender: 'Marcus Thompson',
        text: "We have access to Magic City for the wings — no problem. Confirming now.",
        timestamp: '2026-08-10T14:23:00Z',
      },
      {
        id: 'm2',
        from: 'manager',
        sender: 'Dré Davis',
        text: "Perfect. Make sure they're lemon pepper dry. Also confirm the CDJ 2000s.",
        timestamp: '2026-08-10T15:01:00Z',
      },
    ],
    items: [
      { id: 'i1', category: 'Food', name: 'Wings (Magic City)', quantity: '50 pcs', notes: 'Lemon pepper dry', status: 'confirmed', buyerNote: '' },
      { id: 'i2', category: 'Food', name: 'Deli Tray', quantity: '1', notes: '', status: 'confirmed', buyerNote: '' },
      { id: 'i3', category: 'Food', name: 'Fruit Tray', quantity: '1', notes: '', status: 'confirmed', buyerNote: '' },
      { id: 'i4', category: 'Beverages', name: 'Hennessy VSOP', quantity: '2 bottles', notes: '', status: 'confirmed', buyerNote: '' },
      { id: 'i5', category: 'Beverages', name: 'Don Julio 1942', quantity: '1 bottle', notes: '', status: 'confirmed', buyerNote: '' },
      { id: 'i6', category: 'Beverages', name: 'Red Bull', quantity: '24', notes: '', status: 'pending', buyerNote: '' },
      { id: 'i7', category: 'Beverages', name: 'Smart Water', quantity: '24 bottles', notes: '', status: 'confirmed', buyerNote: '' },
      { id: 'i8', category: 'Production', name: 'Pioneer DJM S9', quantity: '1', notes: '', status: 'unavailable', buyerNote: 'We have a DJM 900NXS2 — will that work?' },
      { id: 'i9', category: 'Production', name: 'CDJ 2000s', quantity: '2', notes: '', status: 'pending', buyerNote: '' },
      { id: 'i10', category: 'Production', name: "6' Table with Skirting", quantity: '1', notes: '', status: 'confirmed', buyerNote: '' },
      { id: 'i11', category: 'Essentials', name: 'Black Face Towels', quantity: '3 dozen', notes: '', status: 'confirmed', buyerNote: '' },
      { id: 'i12', category: 'Essentials', name: 'Candle (Santal 26)', quantity: '1', notes: '', status: 'substituted', buyerNote: 'Have Santal 33 — closest we could find' },
      { id: 'i13', category: 'Essentials', name: 'iPhone Charger', quantity: '2', notes: '', status: 'confirmed', buyerNote: '' },
      { id: 'i14', category: 'Essentials', name: 'Sharpies', quantity: '6', notes: '', status: 'confirmed', buyerNote: '' },
    ],
  },
  {
    id: 'show-chi-002',
    artist: 'G Herbo',
    venue: 'United Center',
    city: 'Chicago, IL',
    date: '2026-09-02',
    buyerName: 'Jennifer Walsh',
    buyerEmail: 'j.walsh@unitedcenter.com',
    status: 'sent',
    messages: [],
    items: [
      { id: 'i1', category: 'Food', name: 'Wings', quantity: '50 pcs', notes: '', status: 'pending', buyerNote: '' },
      { id: 'i2', category: 'Food', name: 'Veggie Tray', quantity: '1', notes: '', status: 'pending', buyerNote: '' },
      { id: 'i3', category: 'Beverages', name: 'Hennessy VSOP', quantity: '2 bottles', notes: '', status: 'pending', buyerNote: '' },
      { id: 'i4', category: 'Beverages', name: 'Smart Water', quantity: '24 bottles', notes: '', status: 'pending', buyerNote: '' },
      { id: 'i5', category: 'Production', name: 'CDJ 2000s', quantity: '2', notes: '', status: 'pending', buyerNote: '' },
      { id: 'i6', category: 'Production', name: 'Pioneer DJM S9', quantity: '1', notes: '', status: 'pending', buyerNote: '' },
      { id: 'i7', category: 'Essentials', name: 'Black Bath Towels', quantity: '4', notes: '', status: 'pending', buyerNote: '' },
    ],
  },
  {
    id: 'show-nyc-003',
    artist: 'Keyshia Cole',
    venue: 'Barclays Center',
    city: 'New York, NY',
    date: '2026-09-20',
    buyerName: 'David Chen',
    buyerEmail: 'd.chen@barclayscenter.com',
    status: 'confirmed',
    messages: [
      {
        id: 'm1',
        from: 'buyer',
        sender: 'David Chen',
        text: 'All items confirmed. Load-in at 2PM.',
        timestamp: '2026-09-15T10:00:00Z',
      },
    ],
    items: [
      { id: 'i1', category: 'Food', name: 'Fruit Tray', quantity: '2', notes: '', status: 'confirmed', buyerNote: '' },
      { id: 'i2', category: 'Food', name: 'Deli Tray', quantity: '1', notes: '', status: 'confirmed', buyerNote: '' },
      { id: 'i3', category: 'Beverages', name: 'Simply Lemonade', quantity: '6', notes: '', status: 'confirmed', buyerNote: '' },
      { id: 'i4', category: 'Beverages', name: 'Smart Water', quantity: '24 bottles', notes: '', status: 'confirmed', buyerNote: '' },
      { id: 'i5', category: 'Essentials', name: 'Candle (Santal 26)', quantity: '1', notes: '', status: 'confirmed', buyerNote: '' },
    ],
  },
  {
    id: 'show-la-004',
    artist: 'Flo Milli',
    venue: 'Kia Forum',
    city: 'Los Angeles, CA',
    date: '2026-10-05',
    buyerName: 'Rachel Kim',
    buyerEmail: 'r.kim@kiaforum.com',
    status: 'draft',
    messages: [],
    items: [
      { id: 'i1', category: 'Food', name: 'Deli Tray', quantity: '1', notes: '', status: 'pending', buyerNote: '' },
      { id: 'i2', category: 'Beverages', name: 'Red Bull', quantity: '24', notes: '', status: 'pending', buyerNote: '' },
      { id: 'i3', category: 'Essentials', name: 'Sharpies', quantity: '6', notes: '', status: 'pending', buyerNote: '' },
    ],
  },
]

export const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pending',     color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  confirmed:   { label: 'Confirmed',   color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
  unavailable: { label: 'Unavailable', color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
  substituted: { label: 'Substituted', color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
}

export const SHOW_STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: 'text-gray-500',  bg: 'bg-gray-100' },
  sent:      { label: 'Sent',      color: 'text-amber-600', bg: 'bg-amber-100' },
  active:    { label: 'Active',    color: 'text-blue-600',  bg: 'bg-blue-100' },
  confirmed: { label: 'Confirmed', color: 'text-green-600', bg: 'bg-green-100' },
}

export type RiderTemplate = { category: string; name: string; quantity: string; notes: string }

export const ARTIST_ROSTER = ['SKRILLA', 'G Herbo', 'Keyshia Cole', 'Flo Milli', 'K. Michelle', 'RL', 'NEXT'] as const

// Official rider PDFs served from /public/riders/ — keyed by artist name
export const OFFICIAL_RIDER_PDFS: Record<string, string> = {
  'G Herbo': '/riders/g-herbo-2026.pdf',
}

export const RIDER_TEMPLATES: Record<string, RiderTemplate[]> = {
  'SKRILLA': [
    { category: 'Food',       name: 'Wings',                  quantity: '50 pcs',    notes: 'Lemon pepper dry' },
    { category: 'Food',       name: 'Deli Tray',              quantity: '1',         notes: '' },
    { category: 'Food',       name: 'Fruit Tray',             quantity: '1',         notes: '' },
    { category: 'Beverages',  name: 'Hennessy VSOP',          quantity: '2 bottles', notes: '' },
    { category: 'Beverages',  name: 'Don Julio 1942',         quantity: '1 bottle',  notes: '' },
    { category: 'Beverages',  name: 'Red Bull',               quantity: '24',        notes: '' },
    { category: 'Beverages',  name: 'Smart Water',            quantity: '24 bottles',notes: '' },
    { category: 'Production', name: 'Pioneer DJM S9',         quantity: '1',         notes: '' },
    { category: 'Production', name: 'CDJ 2000s',              quantity: '2',         notes: '' },
    { category: 'Production', name: "6' Table with Skirting", quantity: '1',         notes: '' },
    { category: 'Essentials', name: 'Black Face Towels',      quantity: '3 dozen',   notes: '' },
    { category: 'Essentials', name: 'Candle (Santal 26)',     quantity: '1',         notes: '' },
    { category: 'Essentials', name: 'iPhone Charger',         quantity: '2',         notes: '' },
    { category: 'Essentials', name: 'Sharpies',               quantity: '6',         notes: '' },
  ],
  'G Herbo': [
    // Dressing Room — Food
    { category: 'Dressing Room', name: 'Fried Hot Chicken Wings',        quantity: '48 pieces',  notes: 'Ranch dressing & hot sauce' },
    { category: 'Dressing Room', name: 'Cheese & Pepperoni Pizza',        quantity: '2 large',    notes: '' },
    // Dressing Room — Beverages
    { category: 'Dressing Room', name: 'Clase Azul Reposado Tequila',    quantity: '1 bottle',   notes: '' },
    { category: 'Dressing Room', name: 'Don Pérignon Rosé',              quantity: '2 bottles',  notes: '' },
    { category: 'Dressing Room', name: 'Don Julio 1942',                 quantity: '3 bottles',  notes: '' },
    { category: 'Dressing Room', name: 'Fiji Water & Smart Water',       quantity: '12',         notes: 'Mixed' },
    { category: 'Dressing Room', name: 'Red Bull',                       quantity: '6',          notes: '' },
    { category: 'Dressing Room', name: 'Sprite',                         quantity: '6 cans',     notes: '' },
    { category: 'Dressing Room', name: 'Coca-Cola',                      quantity: '6 cans',     notes: '' },
    { category: 'Dressing Room', name: 'Apple Juice',                    quantity: '6',          notes: '' },
    { category: 'Dressing Room', name: 'Simply Lemonade',                quantity: '2',          notes: '' },
    { category: 'Dressing Room', name: 'Ice',                            quantity: '1 large bag',notes: '' },
    // Dressing Room — Essentials
    { category: 'Dressing Room', name: 'Cups',                           quantity: '2 dozen',    notes: '' },
    { category: 'Dressing Room', name: 'Paper Towels',                   quantity: '3 rolls',    notes: '' },
    { category: 'Dressing Room', name: 'Hand Sanitizer',                 quantity: '1 bottle',   notes: 'Purell' },
    { category: 'Dressing Room', name: 'iPhone Lightning Chargers',      quantity: '2',          notes: '' },
    { category: 'Dressing Room', name: 'Bic Lighters',                   quantity: '1 pack',     notes: '' },
    { category: 'Dressing Room', name: 'Black Hand Towels',              quantity: '8',          notes: 'Stage left prior to performance' },
    // Production Office
    { category: 'Production Office', name: 'Simply Lemonade',            quantity: '1',          notes: '' },
    { category: 'Production Office', name: 'Apple Juice',                quantity: '1',          notes: '' },
    { category: 'Production Office', name: 'Cranberry Juice',            quantity: '1',          notes: '' },
    { category: 'Production Office', name: 'Assorted Fruit Tray',        quantity: '1',          notes: '' },
    { category: 'Production Office', name: 'Assorted Veggie Tray',       quantity: '1',          notes: '' },
    { category: 'Production Office', name: 'Aloe Water Variety',         quantity: '6',          notes: '' },
    { category: 'Production Office', name: 'Peanut Butter & Jelly',      quantity: '1 jar',      notes: '' },
    { category: 'Production Office', name: 'Wheat Bread',                quantity: '1 loaf',     notes: '' },
    { category: 'Production Office', name: 'Chips & Mild Mango Salsa',   quantity: '1',          notes: '' },
    { category: 'Production Office', name: 'Sharpies',                   quantity: '1 pack',     notes: '' },
    { category: 'Production Office', name: 'Corona',                     quantity: '1 x 12-pack',notes: '' },
    // Dinner (8 persons)
    { category: 'Dinner',        name: 'Fish or Chicken Entrée',         quantity: '2 options',  notes: 'NO PORK OR BEEF — Soul Food or Seafood' },
    { category: 'Dinner',        name: 'Side Dishes',                    quantity: '2',          notes: 'Vegetables & rice' },
    { category: 'Dinner',        name: 'Rolls with Butter',              quantity: '1',          notes: '' },
    { category: 'Dinner',        name: 'Condiments',                     quantity: '1 set',      notes: 'Ketchup, mustard, mayo, steak sauce' },
    { category: 'Dinner',        name: 'Bottled Water',                  quantity: '8',          notes: '' },
    { category: 'Dinner',        name: 'Orange Juice',                   quantity: '1',          notes: '' },
    { category: 'Dinner',        name: 'Assortment of Sodas',            quantity: '1',          notes: '' },
    { category: 'Dinner',        name: 'Snack Platter',                  quantity: '1',          notes: 'Cookies, chips, etc.' },
    // Production / DJ
    { category: 'Production',   name: 'Pioneer DJM S9',                  quantity: '1',          notes: '' },
    { category: 'Production',   name: 'CDJ 2000s',                       quantity: '2',          notes: '' },
    { category: 'Production',   name: "6' Table with Skirting",          quantity: '1',          notes: '' },
    { category: 'Production',   name: 'Clear Coms (FOH to Monitors)',    quantity: '1 set',      notes: 'With beacons and phones' },
    { category: 'Production',   name: 'Talk Back Mic',                   quantity: '1',          notes: 'FOH console to monitor console' },
    // Security
    { category: 'Security',     name: 'Security — Front of Stage',       quantity: '6',          notes: '' },
    { category: 'Security',     name: 'Security — Stairs / VIP Area',    quantity: '2',          notes: 'One at each set of stairs' },
    { category: 'Security',     name: 'Security — Dressing Room Door',   quantity: '1',          notes: '' },
    // Venue
    { category: 'Venue',        name: 'Dressing Rooms',                  quantity: '1-2',        notes: 'Large, private, lockable — quantity depends on show type' },
    { category: 'Venue',        name: 'Production Office',               quantity: '1',          notes: 'Lockable, unrestricted phone line, tables & chairs' },
    { category: 'Venue',        name: 'Runner (SUV/Van)',                quantity: '1',          notes: '8-passenger capacity, available load-in through release' },
    // Transportation
    { category: 'Transportation', name: 'Black SUV (7-passenger) or Sprinter Van', quantity: '1', notes: '2018+ model, captain chairs, tinted windows — driver in professional attire' },
    // Hotel
    { category: 'Hotel',        name: 'King Suite',                      quantity: '1',          notes: 'Must include microwave & mini fridge' },
    { category: 'Hotel',        name: 'Non-Smoking King Rooms',          quantity: '7',          notes: '4-star minimum, 24-hr room service & WiFi, late checkout 4PM' },
  ],
  'Keyshia Cole': [
    { category: 'Food',       name: 'Fruit Tray',        quantity: '2',         notes: '' },
    { category: 'Food',       name: 'Deli Tray',          quantity: '1',         notes: '' },
    { category: 'Beverages',  name: 'Simply Lemonade',   quantity: '6',         notes: '' },
    { category: 'Beverages',  name: 'Smart Water',        quantity: '24 bottles',notes: '' },
    { category: 'Essentials', name: 'Candle (Santal 26)','quantity': '1',         notes: '' },
  ],
  'Flo Milli': [
    { category: 'Food',       name: 'Deli Tray', quantity: '1',  notes: '' },
    { category: 'Beverages',  name: 'Red Bull',  quantity: '24', notes: '' },
    { category: 'Essentials', name: 'Sharpies',  quantity: '6',  notes: '' },
  ],
}
