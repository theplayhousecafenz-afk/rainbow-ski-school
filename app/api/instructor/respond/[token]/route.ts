import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { sendInstructorConfirmedAck } from '@/lib/email'
import type { Instructor, Lesson } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params
  const url = new URL(request.url)
  const action = url.searchParams.get('action') // 'confirm' | 'decline'

  if (!action || !['confirm', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const supabase = createServerSupabase()

  const { data: availability, error } = await supabase
    .from('availability')
    .select('*, instructor:instructors(*), lesson:lessons(*)')
    .eq('response_token', token)
    .single()

  if (error || !availability) {
    return NextResponse.redirect(new URL('/instructor/invalid', request.url))
  }

  if (availability.response !== 'pending') {
    const dest = action === 'confirm'
      ? '/instructor/already-responded'
      : '/instructor/already-responded'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  await supabase
    .from('availability')
    .update({ response: action === 'confirm' ? 'confirmed' : 'declined', responded_at: new Date().toISOString() })
    .eq('id', availability.id)

  if (action === 'confirm') {
    const lesson = availability.lesson as Lesson

    // Assign instructor to lesson if not yet assigned
    if (!lesson.instructor_id) {
      await supabase
        .from('lessons')
        .update({
          instructor_id: availability.instructor_id,
          status: 'instructor_confirmed',
          instructor_confirmed: true,
        })
        .eq('id', lesson.id)
    }

    await sendInstructorConfirmedAck(
      availability.instructor as Instructor,
      lesson
    )

    return NextResponse.redirect(new URL('/instructor/confirmed', request.url))
  }

  return NextResponse.redirect(new URL('/instructor/declined', request.url))
}
