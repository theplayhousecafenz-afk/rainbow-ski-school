import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get('id')
  if (!bookingId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createServerSupabase()

  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // For confirmed bookings — decrement the lesson counter
  if (booking.status === 'confirmed') {
    const qty = booking.quantity ?? 1
    await supabase.rpc('increment_bookings', { lesson: booking.lesson_id, delta: -qty })
  }

  // Cancel the Stripe PaymentIntent if it's still open (pending bookings)
  if (booking.stripe_payment_intent_id && booking.status === 'pending') {
    try {
      const intent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id)
      if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(intent.status)) {
        await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id)
      }
    } catch {
      // Non-fatal — intent may already be cancelled or expired
    }
  }

  // Mark booking as cancelled in DB
  const { error: updateErr } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
