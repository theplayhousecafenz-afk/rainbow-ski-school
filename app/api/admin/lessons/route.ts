import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import type { Discipline } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const discipline = searchParams.get('discipline') as Discipline | null

  const supabase = createServerSupabase()
  let query = supabase
    .from('lessons')
    .select('*, instructor:instructors(name, discipline)')
    .order('date', { ascending: false })
    .order('start_time')
    .limit(200)

  if (discipline && ['ski', 'snowboard'].includes(discipline)) {
    query = query.eq('discipline', discipline)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lessons: data })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { date, discipline, lesson_type, start_time, level, max_students, min_students } = body

  if (!date || !discipline || !lesson_type || !start_time || !level) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!['ski', 'snowboard'].includes(discipline)) {
    return NextResponse.json({ error: 'Invalid discipline' }, { status: 400 })
  }

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('lessons')
    .insert({
      date,
      discipline,
      lesson_type,
      start_time,
      level,
      max_students: max_students ?? (lesson_type === 'group' ? 8 : 1),
      min_students: min_students ?? (lesson_type === 'group' ? 2 : 1),
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lesson: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const { id, instructor_id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createServerSupabase()
  const { error } = await supabase
    .from('lessons')
    .update({ instructor_id: instructor_id ?? null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
