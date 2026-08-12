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

    const qty = parseInt(intent.metadata.quantity ?? '1', 10) || 1

    // Atomic claim: flip pending -> confirmed and only count the seats if THIS
    // request is the one that actually made the change. The confirm route runs
    // the same claim, so whichever arrives second gets zero rows back and skips
    // the increment. Without this both can read "pending" and each add the
    // seats, double-counting the booking.
    const { data: claimed } = await supabase
      .from('bookings')
      .update({ status: 'confirmed', quantity: qty })
      .eq('stripe_payment_intent_id', intent.id)
      .eq('status', 'pending')
      .select('id, lesson_id')

    if (claimed && claimed.length === 1) {
      await supabase.rpc('increment_bookings', {
        lesson: claimed[0].lesson_id,
        delta: qty,
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
