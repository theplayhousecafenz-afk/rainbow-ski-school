import { createServerSupabase } from '@/lib/supabase'
import { formatNZDate, formatTime, customerTypeLabel, studentMix } from '@/lib/booking-utils'
import type { Lesson, Customer, Instructor } from '@/types'
import DaySheetActions from './day-sheet-actions'
import CopyButton from '../confirmation-letters/copy-button'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DaySheetPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  // Default to today (or nearest upcoming weekend day)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' })
  const selectedDate = searchParams.date ?? today

  const supabase = createServerSupabase()

  // Cancelled lessons are kept, not filtered out. Closing the day for weather
  // cancels every lesson and refunds every booking, and this page is where the
  // contact list to tell people comes from — losing it at that exact moment is
  // the opposite of useful. Empty cancelled lessons are dropped below.
  const { data: lessons } = await supabase
    .from('lessons')
    .select('*, instructor:instructors(*)')
    .eq('date', selectedDate)
    .order('start_time')

  type Entry = {
    customer: Customer
    quantity: number
    customerType: string
    status: string
  }

  let allBookings: Array<{ lesson_id: string; quantity: number; customer_type: string; status: string; customer: Customer }> = []
  if (lessons && lessons.length > 0) {
    const { data: bkgs } = await supabase
      .from('bookings')
      .select('lesson_id, quantity, customer_type, status, customer:customers(*)')
      .in('lesson_id', lessons.map((l) => l.id))
      .in('status', ['confirmed', 'refunded'])
    allBookings = (bkgs ?? []) as unknown as typeof allBookings
  }

  const studentsByLesson: Record<string, Entry[]> = {}
  for (const b of allBookings) {
    if (!studentsByLesson[b.lesson_id]) studentsByLesson[b.lesson_id] = []
    studentsByLesson[b.lesson_id].push({
      customer: b.customer as unknown as Customer,
      quantity: (b.quantity as number) ?? 1,
      customerType: b.customer_type,
      status: b.status,
    })
  }

  const lessonGroups = (lessons ?? [])
    .map((l) => ({
      lesson: l as Lesson,
      instructor: l.instructor ? (l.instructor as Instructor) : null,
      students: studentsByLesson[l.id] ?? [],
    }))
    // A cancelled lesson nobody booked is noise; one with people in it is
    // exactly who needs telling.
    .filter((g) => !['cancelled', 'closed'].includes(g.lesson.status) || g.students.length > 0)

  const assignedInstructors = Array.from(new Set(
    lessonGroups.filter((g) => g.instructor).map((g) => g.instructor!.name)
  ))

  // Headline numbers count students actually turning up, so a closed day
  // correctly reads zero while still listing everyone to contact.
  const attending = lessonGroups.flatMap((g) => g.students.filter((s) => s.status === 'confirmed'))
  const totalStudents = attending.reduce((sum, s) => sum + s.quantity, 0)

  const everyEmail = Array.from(
    new Set(lessonGroups.flatMap((g) => g.students.map((s) => s.customer.email)).filter(Boolean))
  )

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div id="day-sheet-content" className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="no-print flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-alpine-900">Day Sheet</h1>
            <Link
              href={`/admin/confirmation-letters?date=${selectedDate}`}
              className="text-sm font-medium text-alpine-700 hover:text-alpine-900 border border-alpine-300 rounded-lg px-3 py-1.5 hover:bg-alpine-50 transition-colors"
            >
              ✉️ Confirmation Letters
            </Link>
          </div>
          <DaySheetActions
            date={selectedDate}
            hasLessons={lessonGroups.length > 0}
            assignedInstructors={assignedInstructors}
          />
        </div>

        {/* Date picker */}
        <div className="no-print bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
          <form method="GET" className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-600">Select date:</label>
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

        {lessonGroups.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg mb-1">No lessons on {formatNZDate(selectedDate)}</p>
            <p className="text-sm">Choose a different date above.</p>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="bg-[#172554] text-white rounded-2xl px-6 py-4 mb-6 flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-blue-300 text-xs font-medium uppercase tracking-wide">Date</p>
                <p className="font-semibold mt-0.5">{formatNZDate(selectedDate)}</p>
              </div>
              <div>
                <p className="text-blue-300 text-xs font-medium uppercase tracking-wide">Lessons</p>
                <p className="font-semibold mt-0.5">{lessonGroups.length}</p>
              </div>
              <div>
                <p className="text-blue-300 text-xs font-medium uppercase tracking-wide">Total Students</p>
                <p className="font-semibold mt-0.5">
                  {totalStudents}
                  <span className="text-blue-300 font-normal text-xs ml-2">
                    ({studentMix(attending)})
                  </span>
                </p>
              </div>
              {everyEmail.length > 0 && (
                <div className="no-print ml-auto self-center">
                  <CopyButton
                    text={everyEmail.join(', ')}
                    label={`Copy all ${everyEmail.length} email${everyEmail.length !== 1 ? 's' : ''}`}
                    successLabel="✓ Copied — paste into BCC"
                    style="green"
                  />
                </div>
              )}
              <div>
                <p className="text-blue-300 text-xs font-medium uppercase tracking-wide">Instructors</p>
                <p className="font-semibold mt-0.5">
                  {assignedInstructors.length > 0 ? assignedInstructors.join(', ') : '—'}
                </p>
              </div>
            </div>

            {/* Lesson cards */}
            <div className="space-y-6">
              {lessonGroups.map(({ lesson, instructor, students }) => {
                const going = students.filter((s) => s.status === 'confirmed')
                const totalQty = going.reduce((s, b) => s + b.quantity, 0)
                const lessonOff = ['cancelled', 'closed'].includes(lesson.status)
                return (
                  <div key={lesson.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${lessonOff ? 'border-red-200' : 'border-slate-200'}`}>
                    {lessonOff && (
                      <p className="bg-red-600 text-white text-xs font-bold uppercase tracking-widest px-6 py-2">
                        Lesson {lesson.status} — everyone below has been refunded and needs telling
                      </p>
                    )}
                    {/* Lesson header */}
                    <div className={`px-6 py-4 flex items-center justify-between border-b border-slate-100 ${lessonOff ? 'bg-slate-50' : lesson.discipline === 'ski' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${lessonOff ? 'text-slate-500' : lesson.discipline === 'ski' ? 'text-blue-600' : 'text-purple-600'}`}>
                          {lesson.discipline} · {lesson.lesson_type}{lesson.level !== 'private' ? ` · ${lesson.level === 'first_timer' ? 'first timer' : lesson.level}` : ''}
                        </p>
                        <p className="text-lg font-bold text-slate-800">{formatTime(lesson.start_time)}</p>
                        {going.length > 0 && (
                          <p className="text-xs text-slate-500 mt-0.5">{totalQty} students · {studentMix(going)}</p>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        {instructor ? (
                          <div>
                            <p className="font-semibold text-slate-800">{instructor.name}</p>
                            <p className="text-slate-500 text-xs">{instructor.phone}</p>
                          </div>
                        ) : (
                          <p className="text-red-500 font-semibold text-sm">⚠️ No instructor</p>
                        )}
                      </div>
                    </div>

                    {/* Students */}
                    {students.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-6">No students booked.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-xs uppercase text-slate-500 tracking-wide text-left">
                            <th className="px-5 py-2 font-semibold">Name</th>
                            <th className="px-5 py-2 font-semibold">Phone</th>
                            <th className="px-5 py-2 font-semibold">Email</th>
                            <th className="px-5 py-2 font-semibold text-center">Age Group</th>
                            <th className="px-5 py-2 font-semibold text-center">Students</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((s, i) => (
                            <tr key={i} className={`border-t border-slate-100 ${s.status === 'refunded' ? 'bg-red-50/50' : ''}`}>
                              <td className="px-5 py-2.5 font-medium text-slate-800">
                                {s.customer.name}
                                {s.status === 'refunded' && (
                                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-red-700">refunded</span>
                                )}
                              </td>
                              <td className="px-5 py-2.5 text-slate-600">{s.customer.phone}</td>
                              <td className="px-5 py-2.5 text-slate-500 text-xs">{s.customer.email}</td>
                              <td className="px-5 py-2.5 text-center">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  s.customerType === 'adult'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {customerTypeLabel(s.customerType)}
                                </span>
                              </td>
                              <td className="px-5 py-2.5 text-center text-slate-600">{s.quantity}</td>
                            </tr>
                          ))}
                          <tr className="border-t border-slate-200 bg-slate-50">
                            <td colSpan={3} className="px-5 py-2 text-xs font-semibold text-slate-500 text-right">Total attending:</td>
                            <td className="px-5 py-2 text-center text-xs font-semibold text-slate-600">{studentMix(going)}</td>
                            <td className="px-5 py-2 text-center font-bold text-slate-700">{totalQty}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}

                    {/* Link to full roster */}
                    <div className="no-print px-5 py-3 border-t border-slate-100 bg-slate-50">
                      <Link href={`/admin/lessons/${lesson.id}/roster`} className="text-xs text-alpine-700 hover:underline">
                        View / email roster for this lesson →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}
