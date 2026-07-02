import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import {
  sendBookingPending,
  sendBookingConfirmed,
  sendLessonConfirmedToStudents,
  sendNewStudentAddedNotifyInstructor,
  sendInstructorLessonConfirmed,
} from '@/lib/email'
import type { Lesson, Customer, Booking, Instructor } from '@/types'

export async function POST(request: NextRequest) {
  const { bookingId } = await request.json()
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
  }

  const supabase = createServerSupabase()

  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select('*, customer:customers(*), lesson:lessons(*, instructor:instructors(*))')
    .eq('id', bookingId)
    .single()

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Verify Stripe payment succeeded
  const intent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id)
  if (intent.status !== 'succeeded') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 402 })
  }

  // Only update DB if the webhook hasn't already done so
  const alreadyConfirmed = booking.status === 'confirmed'
  const qty = parseInt(intent.metadata?.quantity ?? '1') || 1
  if (!alreadyConfirmed) {
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId)
    await supabase.rpc('increment_bookings', { lesson: booking.lesson_id, delta: qty })
  }

  const { data: updatedLesson } = await supabase
    .from('lessons')
    .select('*, instructor:instructors(*)')
    .eq('id', booking.lesson_id)
    .single()

  const lesson = updatedLesson as Lesson
  const customer = booking.customer as Customer
  const confirmedBooking = { ...booking, status: 'confirmed' } as Booking
  const newCount = lesson.current_bookings // post-increment count
  const minStudents = lesson.min_students ?? 2

  // Did this booking push the lesson over the minimum for the first time?
  const justConfirmed = !alreadyConfirmed && newCount >= minStudents

  if (!justConfirmed && newCount < minStudents) {
    // Still below minimum — lesson pending
    await sendBookingPending(customer, lesson, confirmedBooking)
  } else if (justConfirmed) {
    // Just hit minimum — confirm the lesson
    await supabase.from('lessons').update({ status: 'confirmed' }).eq('id', lesson.id)
    await sendBookingConfirmed(customer, lesson, confirmedBooking)

    // Notify any other students who booked earlier that lesson is now confirmed
    const { data: prevBookings } = await supabase
      .from('bookings')
      .select('customer:customers(*)')
      .eq('lesson_id', booking.lesson_id)
      .eq('status', 'confirmed')
      .neq('id', bookingId)

    const prevStudents = (prevBookings ?? []).map((b) => b.customer as unknown as Customer)
    if (prevStudents.length > 0) {
      await sendLessonConfirmedToStudents(prevStudents, lesson)
    }

    // Notify pre-assigned instructor that their lesson is now confirmed
    if (lesson.instructor_id && lesson.instructor) {
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('customer:customers(*)')
        .eq('lesson_id', booking.lesson_id)
        .eq('status', 'confirmed')
      const students = (allBookings ?? []).map((b) => b.customer as unknown as Customer)
      await sendInstructorLessonConfirmed(lesson.instructor as Instructor, lesson, students)
    }
  } else {
    // Additional student on already-confirmed lesson
    await sendBookingConfirmed(customer, lesson, confirmedBooking)

    // Notify rostered instructor of the new headcount
    if (lesson.instructor_id && lesson.instructor) {
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('customer:customers(*)')
        .eq('lesson_id', booking.lesson_id)
        .eq('status', 'confirmed')
      const students = (allBookings ?? []).map((b) => b.customer as unknown as Customer)
      await sendNewStudentAddedNotifyInstructor(lesson.instructor as Instructor, lesson, students)
    }
  }

  return NextResponse.json({ booking: confirmedBooking, lesson })
}
