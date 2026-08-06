import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('instructors')
    .select('id, name, discipline, active')
    .order('name')

  return NextResponse.json({ instructors: data, error: error?.message ?? null })
}
