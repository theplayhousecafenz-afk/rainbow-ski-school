import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { code } = await request.json()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const supabase = createServerSupabase()

  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Invalid promo code' }, { status: 404 })
  }

  if (!data.active) {
    return NextResponse.json({ error: 'This promo code is no longer active' }, { status: 400 })
  }

  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 })
  }

  if (data.current_uses >= data.max_uses) {
    return NextResponse.json({ error: 'This promo code has reached its usage limit' }, { status: 400 })
  }

  return NextResponse.json({ discount_percent: data.discount_percent, code: data.code })
}
