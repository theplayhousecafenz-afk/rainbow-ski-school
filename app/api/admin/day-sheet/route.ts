import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { sendDaySheetToInstructor, sendMasterDaySheetToAdmin, sendDaySheetToSelf } from '@/lib/email'
import type { Customer, Instructor, Lesson } from '@/types'

export async function POST(request: NextRequest) {
  const { date, sendMasterToAll = false, selfOnly = false, notes = '' } = await request.json()
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  const supabase = createServerSupabase()

  // Fetch all lessons for the day with instructor
  const { data: lessons, error: lessonsErr } = await supabase
    .from('lessons')
    .select('*, instructor:instructors(*)')
    .eq('date', date)
    .neq('status', 'cancelled')
    .order('start_time')

  if (lessonsErr) return NextResponse.json({ error: lessonsErr.message }, { status: 500 })
  if (!lessons || lessons.length === 0) {
    return NextResponse.json({ error: 'No lessons found for this date' }, { status: 404 })
  }

  // Fetch confirmed bookings for all lessons
  const lessonIds = lessons.map((l) => l.id)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('lesson_id, quantity, customer:customers(*)')
    .in('lesson_id', lessonIds)
    .eq('status', 'confirmed')

  // Group students by lesson
  const studentsByLesson: Record<string, Array<{ customer: Customer; quantity: number }>> = {}
  for (const b of bookings ?? []) {
    if (!studentsByLesson[b.lesson_id]) studentsByLesson[b.lesson_id] = []
    studentsByLesson[b.lesson_id].push({
      customer: b.customer as unknown as Customer,
      quantity: (b.quantity as number) ?? 1,
    })
  }

  // Build lesson groups
  const lessonGroups = lessons.map((l) => ({
    lesson: l as Lesson,
    instructor: l.instructor ? (l.instructor as Instructor) : null,
    students: studentsByLesson[l.id] ?? [],
  }))

  // Group by instructor — each instructor gets one email covering all their lessons
  const byInstructor: Record<string, { instructor: Instructor; lessons: typeof lessonGroups }> = {}
  for (const group of lessonGroups) {
    if (group.instructor) {
      const id = group.instructor.id
      if (!byInstructor[id]) byInstructor[id] = { instructor: group.instructor, lessons: [] }
      byInstructor[id].lessons.push(group)
    }
  }

  const instructorsSent: string[] = []

  if (selfOnly) {
    try {
      await sendDaySheetToSelf(date, lessonGroups, notes)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Email send failed'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
    return NextResponse.json({ success: true, instructorsSent: [], lessonCount: lessons.length })
  }

  if (sendMasterToAll) {
    // Send the full master sheet to every assigned instructor + admin
    for (const { instructor } of Object.values(byInstructor)) {
      await sendMasterDaySheetToAdmin(date, lessonGroups, instructor)
      instructorsSent.push(instructor.name)
    }
    // Admin copy
    await sendMasterDaySheetToAdmin(date, lessonGroups, null)
  } else {
    // Send each instructor only their own lesson(s)
    for (const { instructor, lessons: instrLessons } of Object.values(byInstructor)) {
      await sendDaySheetToInstructor(instructor, instrLessons)
      instructorsSent.push(instructor.name)
    }
    // Admin master copy
    await sendMasterDaySheetToAdmin(date, lessonGroups, null)
  }

  return NextResponse.json({
    success: true,
    instructorsSent,
    lessonCount: lessons.length,
  })
}
