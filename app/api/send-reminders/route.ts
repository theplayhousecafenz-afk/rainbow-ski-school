import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { sendStudentReminder, sendInstructorReminder, sendAdminNoInstructorAlert } from '@/lib/email'
import type { Customer, Instructor, Lesson } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabase()

  // Tomorrow's date in NZ timezone (cron fires at 06:00 UTC = 18:00 NZST)
  const now = new Date()
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  // Only process Saturday and Sunday lessons (ski season weekends)
  const tomorrowDay = tomorrow.getUTCDay() // 0 = Sunday, 6 = Saturday
  if (tomorrowDay !== 0 && tomorrowDay !== 6) {
    return NextResponse.json({ message: 'No weekend lessons tomorrow, nothing to do' })
  }

  // Find all confirmed lessons for tomorrow
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('*, instructor:instructors(*)')
    .eq('date', tomorrowStr)
    .in('status', ['confirmed', 'instructor_confirmed'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Alert admin about any lessons with no instructor assigned
  const noInstructor = (lessons ?? []).filter((l) => !l.instructor_id)
  if (noInstructor.length > 0) {
    await sendAdminNoInstructorAlert(noInstructor as Lesson[])
  }

  const results: Record<string, string> = {}

  for (const lesson of (lessons ?? [])) {
    const instructor = lesson.instructor as Instructor | null

    const { data: bookings } = await supabase
      .from('bookings')
      .select('quantity, customer:customers(*)')
      .eq('lesson_id', lesson.id)
      .eq('status', 'confirmed')

    const studentEntries = (bookings ?? []).map((b) => ({
      customer: b.customer as unknown as Customer,
      quantity: (b.quantity as number) ?? 1,
    }))

    if (studentEntries.length === 0) continue

    // Email the instructor (if assigned)
    if (instructor) {
      await sendInstructorReminder(instructor, lesson as Lesson, studentEntries)
    }

    // Email each student
    for (const entry of studentEntries) {
      await sendStudentReminder(entry.customer, lesson as Lesson, instructor)
    }

    const totalStudents = studentEntries.reduce((sum, e) => sum + e.quantity, 0)
    results[lesson.id] = `${instructor?.name ?? 'no instructor'} + ${totalStudents} student(s) notified`
  }

  return NextResponse.json({ date: tomorrowStr, processed: results })
}
