import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerSupabase } from '@/lib/supabase'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent
    const supabase = createServerSupabase()

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('stripe_payment_intent_id', intent.id)
      .maybeSingle()

    // Only update if still pending (idempotency — confirm route may have already handled it)
    if (booking && booking.status === 'pending') {
      await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id)

      await supabase.rpc('increment_bookings', {
        lesson: intent.metadata.lessonId,
        delta: 1,
      })
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent
    const supabase = createServerSupabase()
    await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('stripe_payment_intent_id', intent.id)
      .eq('status', 'pending')
  }

  return NextResponse.json({ received: true })
}
