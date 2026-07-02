import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServerSupabase()

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*, lesson:lessons(*), customer:customers(*)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ bookings: bookings ?? [] })
}
