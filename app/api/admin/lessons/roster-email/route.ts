import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { sendRosterToInstructor } from '@/lib/email'
import type { Booking, Customer, Instructor, Lesson } from '@/types'

export async function POST(request: NextRequest) {
  const { lessonId } = await request.json()
  if (!lessonId) return NextResponse.json({ error: 'lessonId required' }, { status: 400 })

  const supabase = createServerSupabase()

  const { data: lesson, error: lessonErr } = await supabase
    .from('lessons')
    .select('*, instructor:instructors(*)')
    .eq('id', lessonId)
    .single()

  if (lessonErr || !lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  if (!lesson.instructor_id || !lesson.instructor) {
    return NextResponse.json({ error: 'No instructor assigned to this lesson' }, { status: 400 })
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('quantity, customer_type, customer:customers(*)')
    .eq('lesson_id', lessonId)
    .eq('status', 'confirmed')
    .order('created_at')

  const students = (bookings ?? []).map((b) => ({
    customer: b.customer as unknown as Customer,
    quantity: (b.quantity as number) ?? 1,
    customerType: b.customer_type as string,
  }))

  if (students.length === 0) {
    return NextResponse.json({ error: 'No confirmed students to send' }, { status: 400 })
  }

  await sendRosterToInstructor(
    lesson.instructor as Instructor,
    lesson as Lesson,
    students
  )

  return NextResponse.json({ success: true, sentTo: (lesson.instructor as Instructor).email })
}
