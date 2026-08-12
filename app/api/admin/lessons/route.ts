import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase'
import { defaultMaxStudents } from '@/lib/booking-utils'
import { sendInstructorAssigned } from '@/lib/email'
import type { Discipline, Instructor, Lesson } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const discipline = searchParams.get('discipline') as Discipline | null

  const upcoming = searchParams.get('upcoming') === 'true'
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' })

  const supabase = createServerSupabase()
  let query = supabase
    .from('lessons')
    .select('*, instructor:instructors(name, discipline)')
    .order('date', { ascending: upcoming })
    .order('start_time')
    .limit(200)

  if (upcoming) {
    query = query.gte('date', today)
  }

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
      max_students: max_students ?? defaultMaxStudents(lesson_type),
      min_students: min_students ?? (lesson_type === 'group' ? 2 : 1),
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath('/admin')
  return NextResponse.json({ lesson: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const { id, instructor_id, on_hold, max_students, closed_to_bookings } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createServerSupabase()
  const updates: Record<string, unknown> = {}
  if (instructor_id !== undefined) updates.instructor_id = instructor_id ?? null
  if (on_hold !== undefined) updates.on_hold = on_hold
  if (closed_to_bookings !== undefined) updates.closed_to_bookings = closed_to_bookings

  if (max_students !== undefined) {
    const cap = Number(max_students)
    if (!Number.isInteger(cap) || cap < 1 || cap > 30) {
      return NextResponse.json({ error: 'Capacity must be a whole number between 1 and 30' }, { status: 400 })
    }
    // Refuse to drop capacity below the students already booked in — they would
    // silently no longer fit. Closing the lesson is the right tool for that.
    const { data: current } = await supabase
      .from('lessons')
      .select('current_bookings')
      .eq('id', id)
      .single()
    if (current && cap < current.current_bookings) {
      return NextResponse.json(
        { error: `Cannot set capacity to ${cap} — ${current.current_bookings} students are already booked in.` },
        { status: 400 }
      )
    }
    updates.max_students = cap
  }

  const { error } = await supabase
    .from('lessons')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Email the newly assigned instructor (if one was set, not cleared)
  if (instructor_id !== undefined && instructor_id) {
    const [{ data: instructor }, { data: lesson }] = await Promise.all([
      supabase.from('instructors').select('*').eq('id', instructor_id).single(),
      supabase.from('lessons').select('*').eq('id', id).single(),
    ])
    if (instructor && lesson) {
      await sendInstructorAssigned(instructor as Instructor, lesson as Lesson)
    }
  }

  return NextResponse.json({ success: true })
}
