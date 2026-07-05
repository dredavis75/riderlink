import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  const keyword = (form.get('keyword') as string | null)?.trim().toLowerCase()
  const workspaceId = (form.get('workspaceId') as string | null) ?? ''

  if (!file || !keyword) {
    return NextResponse.json({ error: 'File and keyword are required' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `community/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from('rider-photos')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: urlData } = supabase.storage.from('rider-photos').getPublicUrl(path)
  const url = urlData.publicUrl

  const { error: dbErr } = await supabase.from('community_photos').insert({
    keyword,
    url,
    workspace_id: workspaceId,
  })

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ url, keyword })
}
