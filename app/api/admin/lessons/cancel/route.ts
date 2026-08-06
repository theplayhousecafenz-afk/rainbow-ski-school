import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { sendLessonCancelledByAdmin, sendInstructorLessonCancelled } from '@/lib/email'
import type { Booking, Customer, Instructor, Lesson } from '@/types'

export async function POST(request: NextRequest) {
  const { lessonId } = await request.json()
  if (!lessonId) return NextResponse.json({ error: 'lessonId required' }, { status: 400 })

  const supabase = createServerSupabase()

  // Fetch the lesson (with instructor)
  const { data: lesson, error: lessonErr } = await supabase
    .from('lessons')
    .select('*, instructor:instructors(*)')
    .eq('id', lessonId)
    .single()

  if (lessonErr || !lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  if (lesson.status === 'cancelled') {
    return NextResponse.json({ error: 'Lesson is already cancelled' }, { status: 409 })
  }

  // Fetch all confirmed bookings with customers
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, customer:customers(*)')
    .eq('lesson_id', lessonId)
    .eq('status', 'confirmed')

  const confirmed = (bookings ?? []) as Array<Booking & { customer: Customer }>

  // Refund each confirmed booking via Stripe
  const refundResults: { bookingId: string; ok: boolean; error?: string }[] = []
  for (const b of confirmed) {
    try {
      await stripe.refunds.create({ payment_intent: b.stripe_payment_intent_id })
      await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', b.id)
      refundResults.push({ bookingId: b.id, ok: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      refundResults.push({ bookingId: b.id, ok: false, error: msg })
    }
  }

  // Also cancel any pending bookings (no refund needed — payment wasn't taken)
  await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('lesson_id', lessonId)
    .eq('status', 'pending')

  // Mark lesson as cancelled and reset bookings counter
  await supabase
    .from('lessons')
    .update({ status: 'cancelled', current_bookings: 0 })
    .eq('id', lessonId)

  // Email confirmed students (best-effort — don't fail the whole request if one bounces)
  for (const b of confirmed) {
    try {
      await sendLessonCancelledByAdmin(b.customer, lesson as Lesson, b)
    } catch {
      console.error('[cancel-lesson] Failed to email student', b.customer.email)
    }
  }

  // Email instructor if assigned
  if (lesson.instructor_id && lesson.instructor) {
    try {
      await sendInstructorLessonCancelled(lesson.instructor as Instructor, lesson as Lesson)
    } catch {
      console.error('[cancel-lesson] Failed to email instructor')
    }
  }

  return NextResponse.json({
    success: true,
    refunds: refundResults,
    studentsNotified: confirmed.length,
  })
}
