import { NextRequest, NextResponse } from 'next/server'

const KEY = process.env.FLIGHTAWARE_API_KEY ?? ''

// Common carrier names -> IATA code, so users can type either. AeroAPI idents
// need a code + flight number (e.g. "UA523"), not a full airline name.
const AIRLINE_CODES: Record<string, string> = {
  'american': 'AA', 'american airlines': 'AA',
  'united': 'UA', 'united airlines': 'UA',
  'delta': 'DL', 'delta air lines': 'DL', 'delta airlines': 'DL',
  'southwest': 'WN', 'southwest airlines': 'WN',
  'jetblue': 'B6', 'jetblue airways': 'B6',
  'alaska': 'AS', 'alaska airlines': 'AS',
  'spirit': 'NK', 'spirit airlines': 'NK',
  'frontier': 'F9', 'frontier airlines': 'F9',
  'allegiant': 'G4', 'allegiant air': 'G4',
  'hawaiian': 'HA', 'hawaiian airlines': 'HA',
  'air canada': 'AC',
  'british airways': 'BA',
  'lufthansa': 'LH',
  'air france': 'AF',
  'klm': 'KL',
  'emirates': 'EK',
  'qatar airways': 'QR',
  'virgin atlantic': 'VS',
}

function toIdent(airline: string, flightNumber: string): string {
  const key = airline.trim().toLowerCase()
  const code = AIRLINE_CODES[key] ?? airline
  return `${code}${flightNumber}`.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

export async function GET(req: NextRequest) {
  const airline = req.nextUrl.searchParams.get('airline') ?? ''
  const flightNumber = req.nextUrl.searchParams.get('flightNumber') ?? ''
  const date = req.nextUrl.searchParams.get('date') ?? ''

  if (!KEY) return NextResponse.json({ error: 'Flight lookup is not configured yet' }, { status: 500 })
  if (!airline.trim() || !flightNumber.trim()) return NextResponse.json({ error: 'Airline and flight number are required' }, { status: 400 })

  const ident = toIdent(airline, flightNumber)

  const res = await fetch(`https://aeroapi.flightaware.com/aeroapi/flights/${encodeURIComponent(ident)}`, {
    headers: { 'x-apikey': KEY, Accept: 'application/json; charset=UTF-8' },
  })

  if (res.status === 404) return NextResponse.json({ error: `No flight found for ${ident}` }, { status: 404 })
  if (!res.ok) return NextResponse.json({ error: 'Flight lookup failed' }, { status: 502 })

  const data = await res.json()
  const flights: any[] = data.flights ?? []
  if (!flights.length) return NextResponse.json({ error: `No flight found for ${ident}` }, { status: 404 })

  // If a tour date was given, prefer the instance scheduled on that date;
  // otherwise take the soonest one (AeroAPI returns them in a sensible order).
  const match = date
    ? flights.find(f => (f.scheduled_out ?? '').slice(0, 10) === date) ?? flights[0]
    : flights[0]

  return NextResponse.json({
    airline: match.operator_iata ?? match.operator ?? airline,
    origin: match.origin?.city ?? match.origin?.name ?? '',
    originCode: match.origin?.code_iata ?? match.origin?.code ?? '',
    destination: match.destination?.city ?? match.destination?.name ?? '',
    destinationCode: match.destination?.code_iata ?? match.destination?.code ?? '',
    date: (match.scheduled_out ?? '').slice(0, 10),
    status: match.status ?? '',
  })
}
