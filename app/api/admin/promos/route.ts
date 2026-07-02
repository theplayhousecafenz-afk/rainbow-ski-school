import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ promos: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { code, discount_percent, max_uses, expires_at } = await request.json()
  if (!code || !discount_percent || !expires_at) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const supabase = createServerSupabase()
  const { error } = await supabase
    .from('promo_codes')
    .insert({ code: code.toUpperCase().trim(), discount_percent, max_uses: max_uses ?? 50, expires_at })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest) {
  const { id, active } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const supabase = createServerSupabase()
  const { error } = await supabase.from('promo_codes').update({ active }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
