import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase'

// Move a booking to a different lesson — a student who cannot make their day
// and wants to reschedule rather than be refunded.
//
// Pass `quantity` to move only part of a booking: a family of four where two
// switch days. That splits the booking in two, both halves keeping the original
// payment intent with the amount divided between them. Refunds are per-booking
// amounts everywhere, so one half being cancelled never refunds the other.
//
// The money never moves in or out, so the destination has to cost the same —
// same lesson type, since group and private are priced differently. Anything
// else needs a refund and a fresh booking.
export async function POST(request: NextRequest) {
  const { bookingId, targetLessonId, quantity: rawQty } = await request.json()
  if (!bookingId || !targetLessonId) {
    return NextResponse.json({ error: 'bookingId and targetLessonId are required' }, { status: 400 })
  }

  const supabase = createServerSupabase()

  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select('*, customer:customers(name)')
    .eq('id', bookingId)
    .single()

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }
  if (booking.status !== 'confirmed') {
    return NextResponse.json(
      { error: `Only confirmed bookings can be moved — this one is ${booking.status}.` },
      { status: 400 }
    )
  }
  if (booking.lesson_id === targetLessonId) {
    return NextResponse.json({ error: 'That is the lesson it is already on.' }, { status: 400 })
  }

  const [{ data: from }, { data: to }] = await Promise.all([
    supabase.from('lessons').select('*').eq('id', booking.lesson_id).single(),
    supabase.from('lessons').select('*').eq('id', targetLessonId).single(),
  ])

  if (!from || !to) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }
  if (['cancelled', 'closed'].includes(to.status)) {
    return NextResponse.json({ error: `That lesson is ${to.status}.` }, { status: 400 })
  }

  const bookingQty = booking.quantity ?? 1
  const qty = rawQty === undefined || rawQty === null ? bookingQty : Number(rawQty)

  if (!Number.isInteger(qty) || qty < 1 || qty > bookingQty) {
    return NextResponse.json(
      { error: `Number of students to move must be between 1 and ${bookingQty}.` },
      { status: 400 }
    )
  }
  const isSplit = qty < bookingQty

  if (to.lesson_type !== from.lesson_type) {
    return NextResponse.json(
      {
        error: `Cannot move a ${from.lesson_type} booking to a ${to.lesson_type} lesson — they are priced differently. Cancel and refund, then rebook.`,
      },
      { status: 400 }
    )
  }
  if (to.current_bookings + qty > to.max_students) {
    const room = to.max_students - to.current_bookings
    return NextResponse.json(
      {
        error: `Not enough room — this booking is ${qty} student${qty !== 1 ? 's' : ''} and that lesson has ${room === 0 ? 'no spots' : `only ${room} spot${room !== 1 ? 's' : ''}`} left.`,
      },
      { status: 409 }
    )
  }

  if (isSplit) {
    // Divide the money by head so the two halves still add up to what was paid.
    // Rounding goes to the students staying put, never creating or losing a cent.
    const movingAmount = Math.round((booking.amount_paid * qty) / bookingQty)
    const stayingAmount = booking.amount_paid - movingAmount

    const { error: insErr } = await supabase.from('bookings').insert({
      lesson_id: targetLessonId,
      customer_id: booking.customer_id,
      discipline: to.discipline,
      customer_type: booking.customer_type,
      quantity: qty,
      amount_paid: movingAmount,
      // Deliberately the same payment intent — this is a share of one payment,
      // not a new one. Refunds are per-booking amounts, so this stays correct.
      stripe_payment_intent_id: booking.stripe_payment_intent_id,
      status: 'confirmed',
    })
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    const { error: updErr } = await supabase
      .from('bookings')
      .update({ quantity: bookingQty - qty, amount_paid: stayingAmount })
      .eq('id', bookingId)
      .eq('status', 'confirmed')
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
  } else {
    // Whole booking moves — just repoint it. discipline lives on the booking
    // too, so it has to follow or reports count it under the old lesson.
    const { error: mErr } = await supabase
      .from('bookings')
      .update({ lesson_id: targetLessonId, discipline: to.discipline })
      .eq('id', bookingId)
      .eq('status', 'confirmed')

    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })
  }

  await supabase.rpc('increment_bookings', { lesson: from.id, delta: -qty })
  await supabase.rpc('increment_bookings', { lesson: to.id, delta: qty })

  // Promote the destination if this move takes it over its minimum.
  const { data: after } = await supabase
    .from('lessons')
    .select('status, current_bookings, min_students')
    .eq('id', to.id)
    .single()

  if (after && after.status === 'pending' && after.current_bookings >= (after.min_students ?? 2)) {
    await supabase.from('lessons').update({ status: 'confirmed' }).eq('id', to.id)
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/lessons/${from.id}`)
  revalidatePath(`/admin/lessons/${targetLessonId}`)

  return NextResponse.json({
    success: true,
    split: isSplit,
    moved: {
      customer: (booking.customer as { name: string } | null)?.name ?? 'Booking',
      quantity: qty,
      remaining: isSplit ? bookingQty - qty : 0,
      from: `${from.date} ${from.start_time.slice(0, 5)} ${from.discipline}`,
      to: `${to.date} ${to.start_time.slice(0, 5)} ${to.discipline}`,
    },
  })
}
