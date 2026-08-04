import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

interface BulkLesson {
  date: string
  discipline: 'ski' | 'snowboard'
  lesson_type: 'group' | 'private'
  level: string
  start_time: string
}

export async function POST(request: NextRequest) {
  const { lessons } = await request.json() as { lessons: BulkLesson[] }

  if (!Array.isArray(lessons) || lessons.length === 0) {
    return NextResponse.json({ error: 'No lessons provided' }, { status: 400 })
  }

  const supabase = createServerSupabase()

  const rows = lessons.map((l) => ({
    date: l.date,
    discipline: l.discipline,
    lesson_type: l.lesson_type,
    level: l.level,
    start_time: l.start_time,
    max_students: l.lesson_type === 'group' ? 8 : 1,
    min_students: l.lesson_type === 'group' ? 2 : 1,
    status: 'pending',
  }))

  const { data, error } = await supabase
    .from('lessons')
    .insert(rows)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ created: data?.length ?? 0 })
}
