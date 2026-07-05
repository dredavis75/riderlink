import { NextResponse } from 'next/server'
import { getCommunityPhotos } from '@/lib/db'

export async function GET() {
  try {
    const photos = await getCommunityPhotos()
    return NextResponse.json(photos.map(p => ({ keyword: p.keyword, url: p.url })))
  } catch {
    return NextResponse.json([])
  }
}
