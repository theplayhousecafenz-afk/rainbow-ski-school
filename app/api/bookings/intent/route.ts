import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { stripe, getPrice } from '@/lib/stripe'
import { canBook } from '@/lib/booking-utils'
import type { Lesson, CustomerType } from '@/types'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { lessonId, customerType, name, email, phone } = body as {
    lessonId: string
    customerType: CustomerType
    name: string
    email: string
    phone: string
  }

  if (!lessonId || !customerType || !name || !email || !phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServerSupabase()

  // Fetch lesson and validate
  const { data: lesson, error: lessonErr } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .single()

  if (lessonErr || !lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  const availability = canBook(lesson as Lesson, new Date())
  if (!availability.available) {
    return NextResponse.json({ error: availability.reason }, { status: 409 })
  }

  const amount = getPrice(lesson.lesson_type, customerType)

  // Upsert customer
  let customer
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (existing) {
    await supabase
      .from('customers')
      .update({ name: name.trim(), phone: phone.trim() })
      .eq('id', existing.id)
    customer = existing
  } else {
    const { data: created, error: custErr } = await supabase
      .from('customers')
      .insert({ name: name.trim(), email: email.toLowerCase(), phone: phone.trim() })
      .select('id')
      .single()
    if (custErr) return NextResponse.json({ error: custErr.message }, { status: 500 })
    customer = created
  }

  // Create Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'nzd',
    metadata: {
      lessonId,
      customerId: customer.id,
      customerType,
      discipline: lesson.discipline,
    },
  })

  // Create pending booking
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .insert({
      lesson_id: lessonId,
      customer_id: customer.id,
      discipline: lesson.discipline,
      customer_type: customerType,
      amount_paid: amount,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'pending',
    })
    .select('id')
    .single()

  if (bookingErr) {
    await stripe.paymentIntents.cancel(paymentIntent.id)
    return NextResponse.json({ error: bookingErr.message }, { status: 500 })
  }

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    bookingId: booking.id,
  })
}
