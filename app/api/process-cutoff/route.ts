import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import {
  sendInstructorAvailabilityRequest,
  sendInstructorLessonCancelled,
  sendAdminLessonCancelledNoBookings,
} from '@/lib/email'
import type { Customer, Lesson, Booking, Instructor, BookingStatus } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabase()
  const now = new Date()
  const dayOfWeek = now.getUTCDay() // 4 = Thursday, 5 = Friday

  // Thursday runs → check Saturday (day 6), Friday runs → check Sunday (day 0)
  const targetDay = dayOfWeek === 4 ? 6 : dayOfWeek === 5 ? 0 : null

  if (targetDay === null) {
    return NextResponse.json({ message: 'Not a cutoff day, nothing to do' })
  }

  // Find the upcoming target date
  const daysAhead = targetDay === 6 ? 2 : 2
  const targetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead))
  const targetDateStr = targetDate.toISOString().slice(0, 10)

  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('*, instructor:instructors(*)')
    .eq('date', targetDateStr)
    .eq('status', 'pending')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const processed: Record<string, string> = {}

  for (const lesson of lessons ?? []) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, customer:customers(*)')
      .eq('lesson_id', lesson.id)
      .eq('status', 'confirmed')

    const confirmed = (bookings ?? []) as Array<Booking & { customer: Customer }>

    // Count STUDENTS, not booking rows. One booking can carry a whole family —
    // counting rows read a full lesson of 7 as "one booking" and refunded it.
    const students = confirmed.reduce((sum, b) => sum + (b.quantity ?? 1), 0)

    // Respect the lesson's own minimum. Private lessons need 1, so counting them
    // as short-staffed would cancel every private lesson at its cutoff.
    const minStudents = lesson.min_students ?? 2

    const instructor = lesson.instructor as Instructor | null

    if (students === 0) {
      await supabase.from('lessons').update({ status: 'cancelled' }).eq('id', lesson.id)
      await sendAdminLessonCancelledNoBookings(lesson as Lesson)
      if (instructor) await sendInstructorLessonCancelled(instructor, lesson as Lesson)
      processed[lesson.id] = 'cancelled (no students)'
    } else if (students < minStudents) {
      // Short of the minimum, but people have paid — leave it alone and let Nic
      // decide. This used to refund everyone and cancel automatically, which
      // moved real money with nobody looking; a lesson one student short is
      // often worth running, or worth a phone call before it is called off.
      //
      // Nothing is written here on purpose. The lesson stays 'pending', which
      // is what the admin overview reads to flag it as needing a decision, so
      // there is no flag to set and none to clear once he acts.
      processed[lesson.id] =
        `flagged for review — ${students} student${students !== 1 ? 's' : ''}, below the minimum of ${minStudents}. Left pending, nothing refunded.`
    } else {
      // Enough students — confirm lesson, notify instructors
      await supabase.from('lessons').update({ status: 'confirmed' }).eq('id', lesson.id)

      // Find active instructors matching this lesson's discipline
      const { data: instructors } = await supabase
        .from('instructors')
        .select('*')
        .eq('discipline', lesson.discipline)
        .eq('active', true)

      for (const instructor of instructors ?? []) {
        // Create availability record
        const { data: avail } = await supabase
          .from('availability')
          .insert({
            instructor_id: instructor.id,
            lesson_id: lesson.id,
            response: 'pending',
          })
          .select('response_token')
          .single()

        if (avail) {
          const confirmUrl = `${BASE_URL}/instructor/confirm/${avail.response_token}`
          const declineUrl = `${BASE_URL}/instructor/decline/${avail.response_token}`
          await sendInstructorAvailabilityRequest(
            instructor as Instructor,
            lesson as Lesson,
            confirmUrl,
            declineUrl
          )
        }
      }
      processed[lesson.id] = `confirmed (${students} students across ${confirmed.length} booking${confirmed.length !== 1 ? 's' : ''}, ${instructors?.length ?? 0} instructors notified)`
    }
  }

  return NextResponse.json({ processed, date: targetDateStr })
}
