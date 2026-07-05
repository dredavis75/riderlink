import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { companyName, ownerName, ownerEmail } = await req.json()
  if (!companyName?.trim()) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
  }

  const id = crypto.randomUUID()
  const { error } = await supabase.from('workspaces').insert({
    id,
    company_name: companyName.trim(),
    owner_name: (ownerName ?? '').trim(),
    owner_email: (ownerEmail ?? '').trim(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id, companyName: companyName.trim() })
}
