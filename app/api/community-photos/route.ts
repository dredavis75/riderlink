import { NextRequest, NextResponse } from 'next/server'
import { getCommunityPhotos } from '@/lib/db'

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? 'default'
  try {
    const photos = await getCommunityPhotos(workspaceId)
    return NextResponse.json(photos.map(p => ({ id: p.id, keyword: p.keyword, url: p.url })))
  } catch {
    return NextResponse.json([])
  }
}
