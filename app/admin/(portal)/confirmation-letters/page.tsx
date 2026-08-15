import { createServerSupabase } from '@/lib/supabase'
import { formatNZDate, formatTime } from '@/lib/booking-utils'
import type { Lesson, Customer, Instructor } from '@/types'
import CopyButton from './copy-button'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const SCHOOL_EMAIL = 'snowsports@skirainbow.co.nz'
const SCHOOL_PHONE = '027 540 2985'
const MEETING_POINT = 'Mountain Clock, Rainbow Ski Area, St Arnaud'

function buildLetter({
  date,
  startTime,
  discipline,
  level,
  lessonType,
  instructorName,
  instructorPhone,
}: {
  date: string
  startTime: string
  discipline: string
  level: string
  lessonType: string
  instructorName: string | null
  instructorPhone: string | null
}) {
  const formattedDate = formatNZDate(date)
  const formattedTime = formatTime(startTime)
  const disc = discipline === 'ski' ? 'Skiing' : 'Snowboarding'
  const type = lessonType === 'private' ? 'Private' : 'Group'
  // A private lesson carries the level "private" too, which read as
  // "Private Private Skiing". Drop the level when it just repeats the type.
  const lvl =
    level === 'first_timer'
      ? 'First Timer'
      : level.charAt(0).toUpperCase() + level.slice(1)
  const lessonLine =
    level === 'private' ? `${type} ${disc}` : `${lvl} ${type} ${disc}`
  const instrLine = instructorName
    ? `👨‍🏫 Instructor: ${instructorName}${instructorPhone ? ` (${instructorPhone})` : ''}`
    : `👨‍🏫 Instructor: To be confirmed`

  return `Hi all,

Thank you for booking with Rainbow Ski School! We're looking forward to welcoming you to the mountain.

Here are your lesson details:

📅 Date: ${formattedDate}
⏰ Time: ${formattedTime} (please arrive 10–15 minutes early)
🎿 Lesson: ${lessonLine}
${instrLine}
📍 Meeting Point: ${MEETING_POINT}

🚗 GETTING HERE

Please allow plenty of travel time — the mountain road takes longer than people expect:

• From Nelson — approximately 2 hours
• From Blenheim — approximately 2 hours
• From St Arnaud (Lake Rotoiti village) — approximately 1 hour

🧤 WHAT TO BRING

• Warm clothing — layers work best. It gets cold up here, even on a clear day.
• YOUR OWN GLOVES. We cannot rent gloves on the mountain, so please bring a pair.
• Sunglasses or goggles, sunscreen, and a warm hat.

🎿 RENTAL GEAR

If you need to hire gear, please arrive nice and early and go straight to rental. The queue takes time and we can't hold up the lesson waiting for gear — being fitted and ready before your start time makes all the difference.

Clothing rental is available on the mountain (jackets and pants), but gloves are not — those you'll need to bring yourself.

If you have any questions before your lesson or need to make any changes, please don't hesitate to get in touch:

📧 ${SCHOOL_EMAIL}
📞 ${SCHOOL_PHONE}

We're looking forward to seeing you on the mountain!

Warm regards,
Nic
Rainbow Ski School
${SCHOOL_EMAIL} | ${SCHOOL_PHONE}`
}

export default async function ConfirmationLettersPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' })
  const selectedDate = searchParams.date ?? today

  const supabase = createServerSupabase()

  // Cancelled lessons stay listed. After a weather closure this page is still
  // where the addresses come from to tell people the day is off.
  const { data: lessons } = await supabase
    .from('lessons')
    .select('*, instructor:instructors(*)')
    .eq('date', selectedDate)
    .order('start_time')

  const lessonIds = (lessons ?? []).map((l) => l.id)

  type LessonGroup = {
    lesson: Lesson
    instructor: Instructor | null
    emails: string[]
    totalStudents: number
    letter: string
  }

  const groups: LessonGroup[] = []

  if (lessonIds.length > 0) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('lesson_id, quantity, customer:customers(name, email)')
      .in('lesson_id', lessonIds)
      .in('status', ['confirmed', 'refunded'])
      .order('created_at')

    for (const lesson of lessons ?? []) {
      const l = lesson as Lesson
      const instructor = lesson.instructor as Instructor | null
      const lessonBookings = (bookings ?? []).filter((b) => b.lesson_id === l.id)
      if (lessonBookings.length === 0) continue

      const emails = lessonBookings.map((b) => (b.customer as unknown as Customer).email)
      const totalStudents = lessonBookings.reduce((sum, b) => sum + ((b.quantity as number) ?? 1), 0)

      groups.push({
        lesson: l,
        instructor,
        emails,
        totalStudents,
        letter: buildLetter({
          date: selectedDate,
          startTime: l.start_time,
          discipline: l.discipline,
          level: l.level,
          lessonType: l.lesson_type,
          instructorName: instructor?.name ?? null,
          instructorPhone: instructor?.phone ?? null,
        }),
      })
    }
  }

  const totalEmails = groups.reduce((sum, g) => sum + g.emails.length, 0)
  const allEmails = groups.flatMap((g) => g.emails)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-alpine-900">Confirmation Letters</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Copy the email addresses, paste into To:, then copy the letter and paste into the body.
          </p>
        </div>
        <Link href="/admin/day-sheet" className="text-sm text-slate-500 hover:text-slate-700">
          ← Day Sheet
        </Link>
      </div>

      {/* Date picker */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <form method="GET" className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600">Date:</label>
          <input
            type="date"
            name="date"
            defaultValue={selectedDate}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alpine-600"
          />
          <button
            type="submit"
            className="bg-alpine-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-alpine-700 transition-colors"
          >
            Load
          </button>
        </form>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg mb-1">No confirmed students on {formatNZDate(selectedDate)}</p>
          <p className="text-sm">Choose a different date above.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Copy ALL emails across all lessons */}
          {totalEmails > 1 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-amber-900 text-sm">All students — {formatNZDate(selectedDate)}</p>
                <p className="text-xs text-amber-700 mt-0.5">{totalEmails} email addresses across all lessons</p>
              </div>
              <CopyButton text={allEmails.join(', ')} label="Copy All Emails" successLabel="✓ Copied!" style="amber" />
            </div>
          )}

          {/* One card per lesson */}
          {groups.map((g, i) => {
            const disc = g.lesson.discipline === 'ski' ? '⛷' : '🏂'
            const lvl = g.lesson.level.charAt(0).toUpperCase() + g.lesson.level.slice(1)
            const type = g.lesson.lesson_type === 'private' ? 'Private' : 'Group'
            const discName = g.lesson.discipline === 'ski' ? 'Ski' : 'Snowboard'

            return (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Lesson header */}
                <div className="bg-slate-50 border-b border-slate-100 px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-800 text-base">
                        {disc} {formatTime(g.lesson.start_time)} — {lvl} {type} {discName}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {g.instructor ? `Instructor: ${g.instructor.name}` : '⚠️ No instructor assigned'} · {g.totalStudents} student{g.totalStudents !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-5 space-y-5">
                  {/* Email addresses */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Step 1 — Copy email addresses
                      </p>
                      <CopyButton
                        text={g.emails.join(', ')}
                        label="📋 Copy Addresses"
                        successLabel="✓ Copied!"
                        style="default"
                      />
                    </div>
                    <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-700 font-mono break-all">
                      {g.emails.join(', ')}
                    </div>
                  </div>

                  {/* Letter */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Step 2 — Copy letter
                      </p>
                      <CopyButton
                        text={g.letter}
                        label="📋 Copy Letter"
                        successLabel="✓ Copied!"
                        style="green"
                      />
                    </div>
                    <div className="bg-slate-50 rounded-lg px-4 py-4">
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                        {g.letter}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
