import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase'

// Move a booking to a different lesson — a student who cannot make their day
// and wants to reschedule rather than be refunded.
//
// The money does not move: the booking keeps its payment intent and amount, it
// just points at a different lesson. So the target has to cost the same, which
// means the same lesson type (group and private are priced differently). Any
// other combination needs a refund and a fresh booking.
export async function POST(request: NextRequest) {
  const { bookingId, targetLessonId } = await request.json()
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

  const qty = booking.quantity ?? 1

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

  // Point the booking at the new lesson. discipline lives on the booking too,
  // so it has to follow, otherwise reports would count it under the old one.
  const { error: mErr } = await supabase
    .from('bookings')
    .update({ lesson_id: targetLessonId, discipline: to.discipline })
    .eq('id', bookingId)
    .eq('status', 'confirmed')

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })

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
    moved: {
      customer: (booking.customer as { name: string } | null)?.name ?? 'Booking',
      quantity: qty,
      from: `${from.date} ${from.start_time.slice(0, 5)} ${from.discipline}`,
      to: `${to.date} ${to.start_time.slice(0, 5)} ${to.discipline}`,
    },
  })
}
