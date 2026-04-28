import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import {
  sendLessonCancelledInsufficientBookings,
  sendInstructorAvailabilityRequest,
  sendAdminLessonCancelledNoBookings,
  sendAdminLessonCancelledOneBooking,
} from '@/lib/email'
import type { Customer, Lesson, Booking, Instructor } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export async function POST(request: NextRequest) {
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
    .select('*')
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

    const count = bookings?.length ?? 0

    if (count === 0) {
      await supabase.from('lessons').update({ status: 'cancelled' }).eq('id', lesson.id)
      await sendAdminLessonCancelledNoBookings(lesson as Lesson)
      processed[lesson.id] = 'cancelled (0 bookings)'
    } else if (count === 1) {
      const booking = bookings![0] as Booking & { customer: Customer }

      // Stripe refund
      try {
        const refund = await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent_id,
        })
        await supabase
          .from('bookings')
          .update({ status: 'refunded', stripe_refund_id: refund.id })
          .eq('id', booking.id)
      } catch (err) {
        console.error(`[cutoff] Stripe refund failed for booking ${booking.id}`, err)
      }

      await supabase.from('lessons').update({ status: 'cancelled' }).eq('id', lesson.id)

      // Find available private lessons for the student
      const { data: privateOptions } = await supabase
        .from('lessons')
        .select('*')
        .eq('date', lesson.date)
        .eq('discipline', lesson.discipline)
        .eq('lesson_type', 'private')
        .not('status', 'in', '("cancelled","closed")')

      await sendLessonCancelledInsufficientBookings(
        booking.customer,
        lesson as Lesson,
        booking as Booking,
        (privateOptions ?? []) as Lesson[]
      )
      await sendAdminLessonCancelledOneBooking(lesson as Lesson, booking.customer)
      processed[lesson.id] = 'cancelled (1 booking, refunded)'
    } else {
      // 2+ bookings — confirm lesson, notify instructors
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
      processed[lesson.id] = `confirmed (${count} bookings, ${instructors?.length ?? 0} instructors notified)`
    }
  }

  return NextResponse.json({ processed, date: targetDateStr })
}
