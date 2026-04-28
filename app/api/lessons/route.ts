import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { canBook } from '@/lib/booking-utils'
import type { Lesson, Discipline } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const discipline = searchParams.get('discipline') as Discipline | null

  if (!date || !discipline) {
    return NextResponse.json({ error: 'date and discipline are required' }, { status: 400 })
  }

  if (!['ski', 'snowboard'].includes(discipline)) {
    return NextResponse.json({ error: 'invalid discipline' }, { status: 400 })
  }

  const supabase = createServerSupabase()
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('*, instructor:instructors(*)')
    .eq('date', date)
    .eq('discipline', discipline)
    .not('status', 'in', '("cancelled","closed")')
    .order('start_time')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const now = new Date()
  const annotated = (lessons as Lesson[]).map((lesson) => ({
    ...lesson,
    availability: canBook(lesson, now),
  }))

  return NextResponse.json({ lessons: annotated })
}
