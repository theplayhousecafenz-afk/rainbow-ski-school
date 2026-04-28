import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { sendMountainClosureRefund } from '@/lib/email'
import { sendMountainClosureSMS } from '@/lib/sms'
import type { Customer, Lesson, Booking } from '@/types'

export async function POST(request: NextRequest) {
  const { date } = await request.json()
  if (!date) {
    return NextResponse.json({ error: 'date required' }, { status: 400 })
  }

  const supabase = createServerSupabase()

  // Fetch all non-cancelled lessons for the date
  const { data: lessons, error: lErr } = await supabase
    .from('lessons')
    .select('*')
    .eq('date', date)
    .not('status', 'in', '("cancelled","closed")')

  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 })

  const results: { lessonId: string; refundCount: number }[] = []

  for (const lesson of lessons ?? []) {
    // Fetch confirmed bookings for this lesson
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, customer:customers(*)')
      .eq('lesson_id', lesson.id)
      .eq('status', 'confirmed')

    let refundCount = 0

    for (const booking of bookings ?? []) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent_id,
        })

        await supabase
          .from('bookings')
          .update({ status: 'refunded', stripe_refund_id: refund.id })
          .eq('id', booking.id)

        const customer = booking.customer as Customer
        await sendMountainClosureRefund(customer, lesson as Lesson, booking as Booking)
        await sendMountainClosureSMS(customer, lesson as Lesson)
        refundCount++
      } catch (err) {
        console.error(`[close-day] Refund failed for booking ${booking.id}`, err)
      }
    }

    await supabase
      .from('lessons')
      .update({ status: 'cancelled' })
      .eq('id', lesson.id)

    results.push({ lessonId: lesson.id, refundCount })
  }

  return NextResponse.json({ success: true, results })
}
