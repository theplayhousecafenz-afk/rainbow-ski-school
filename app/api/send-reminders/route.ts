import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { sendStudentReminder, sendInstructorReminder, sendAdminNoInstructorAlert } from '@/lib/email'
import { sendStudentReminderSMS, sendInstructorReminderSMS } from '@/lib/sms'
import type { Customer, Instructor, Lesson } from '@/types'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabase()

  // Tomorrow's date in UTC (cron fires at 06:00 UTC = 18:00 NZST)
  const now = new Date()
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  // Only process Saturday and Sunday lessons (ski season)
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

  for (const lesson of (lessons ?? []).filter((l) => l.instructor_id)) {
    const instructor = lesson.instructor as Instructor
    if (!instructor) continue

    const { data: bookings } = await supabase
      .from('bookings')
      .select('customer:customers(*)')
      .eq('lesson_id', lesson.id)
      .eq('status', 'confirmed')

    const students = (bookings ?? []).map((b) => b.customer as Customer)
    if (students.length === 0) continue

    // Email the instructor
    await sendInstructorReminder(instructor, lesson as Lesson, students)
    await sendInstructorReminderSMS(instructor, lesson as Lesson, students)

    // Email each student
    for (const student of students) {
      await sendStudentReminder(student, lesson as Lesson, instructor)
      await sendStudentReminderSMS(student, lesson as Lesson, instructor)
    }

    results[lesson.id] = `${instructor.name} + ${students.length} student(s) notified`
  }

  return NextResponse.json({ date: tomorrowStr, processed: results })
}
