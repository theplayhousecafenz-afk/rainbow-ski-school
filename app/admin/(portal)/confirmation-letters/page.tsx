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
  customerName,
  date,
  startTime,
  discipline,
  level,
  lessonType,
  instructorName,
  instructorPhone,
  quantity,
}: {
  customerName: string
  date: string
  startTime: string
  discipline: string
  level: string
  lessonType: string
  instructorName: string | null
  instructorPhone: string | null
  quantity: number
}) {
  const formattedDate = formatNZDate(date)
  const formattedTime = formatTime(startTime)
  const disc = discipline === 'ski' ? 'Skiing' : 'Snowboarding'
  const lvl = level.charAt(0).toUpperCase() + level.slice(1)
  const type = lessonType === 'private' ? 'Private' : 'Group'
  const groupNote = quantity > 1 ? ` for ${quantity} people` : ''
  const instrLine = instructorName
    ? `👨‍🏫 Instructor: ${instructorName}${instructorPhone ? ` (${instructorPhone})` : ''}`
    : `👨‍🏫 Instructor: To be confirmed`

  return `Hi ${customerName},

Thank you for booking with Rainbow Ski School! We're looking forward to welcoming you${groupNote} to the mountain.

Here are your lesson details:

📅 Date: ${formattedDate}
⏰ Time: ${formattedTime} (please arrive 10–15 minutes early)
🎿 Lesson: ${lvl} ${type} ${disc}
${instrLine}
📍 Meeting Point: ${MEETING_POINT}

If you have any questions before your lesson or need to make any changes, please don't hesitate to get in touch:

📧 ${SCHOOL_EMAIL}
📞 ${SCHOOL_PHONE}

We're looking forward to seeing you on the mountain — have a great lesson!

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

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*, instructor:instructors(*)')
    .eq('date', selectedDate)
    .neq('status', 'cancelled')
    .order('start_time')

  const lessonIds = (lessons ?? []).map((l) => l.id)

  let letters: Array<{
    lessonLabel: string
    customerName: string
    email: string
    letter: string
    lessonId: string
  }> = []

  if (lessonIds.length > 0) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('lesson_id, quantity, customer:customers(name, email, phone)')
      .in('lesson_id', lessonIds)
      .eq('status', 'confirmed')
      .order('created_at')

    for (const b of bookings ?? []) {
      const lesson = (lessons ?? []).find((l) => l.id === b.lesson_id) as Lesson | undefined
      if (!lesson) continue

      const customer = b.customer as unknown as Customer
      const instructor = lesson.instructor as Instructor | null
      const qty = (b.quantity as number) ?? 1

      const disc = lesson.discipline === 'ski' ? 'Ski' : 'Snowboard'
      const lvl = lesson.level.charAt(0).toUpperCase() + lesson.level.slice(1)
      const type = lesson.lesson_type === 'private' ? 'Private' : 'Group'

      letters.push({
        lessonLabel: `${formatTime(lesson.start_time)} — ${lvl} ${type} ${disc}`,
        customerName: customer.name,
        email: customer.email,
        letter: buildLetter({
          customerName: customer.name,
          date: selectedDate,
          startTime: lesson.start_time,
          discipline: lesson.discipline,
          level: lesson.level,
          lessonType: lesson.lesson_type,
          instructorName: instructor?.name ?? null,
          instructorPhone: instructor?.phone ?? null,
          quantity: qty,
        }),
        lessonId: lesson.id,
      })
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-alpine-900">Confirmation Letters</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Copy each letter and paste it into an email to the student.
          </p>
        </div>
        <Link
          href="/admin/day-sheet"
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
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

      {letters.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg mb-1">No confirmed students on {formatNZDate(selectedDate)}</p>
          <p className="text-sm">Choose a different date above.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-alpine-900">{letters.length}</span> letter{letters.length !== 1 ? 's' : ''} for {formatNZDate(selectedDate)}
          </p>

          {letters.map((item, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{item.customerName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.email} · {item.lessonLabel}</p>
                </div>
                <CopyButton text={item.letter} email={item.email} />
              </div>

              {/* Letter preview */}
              <div className="px-6 py-5">
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {item.letter}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
