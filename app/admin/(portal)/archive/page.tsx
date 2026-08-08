import { createServerSupabase } from '@/lib/supabase'
import { formatNZDate, formatTime } from '@/lib/booking-utils'
import type { Lesson, Customer, Instructor } from '@/types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: { discipline?: string; from?: string; to?: string }
}) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' })
  const supabase = createServerSupabase()

  let query = supabase
    .from('lessons')
    .select('*, instructor:instructors(name)')
    .lt('date', today)
    .order('date', { ascending: false })
    .order('start_time')
    .limit(500)

  if (searchParams.discipline && ['ski', 'snowboard'].includes(searchParams.discipline)) {
    query = query.eq('discipline', searchParams.discipline)
  }
  if (searchParams.from) query = query.gte('date', searchParams.from)
  if (searchParams.to) query = query.lte('date', searchParams.to)

  const { data: lessons } = await query

  // Get all lesson IDs to fetch booking counts
  const lessonIds = (lessons ?? []).map((l) => l.id)
  let studentsByLesson: Record<string, { count: number; names: string[] }> = {}

  if (lessonIds.length > 0) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('lesson_id, quantity, customer:customers(name)')
      .in('lesson_id', lessonIds)
      .in('status', ['confirmed', 'refunded'])

    for (const b of bookings ?? []) {
      if (!studentsByLesson[b.lesson_id]) {
        studentsByLesson[b.lesson_id] = { count: 0, names: [] }
      }
      const qty = (b.quantity as number) ?? 1
      studentsByLesson[b.lesson_id].count += qty
      const name = (b.customer as unknown as Customer)?.name
      if (name) studentsByLesson[b.lesson_id].names.push(name)
    }
  }

  // Group by date
  const byDate: Record<string, typeof lessons> = {}
  for (const l of lessons ?? []) {
    if (!byDate[l.date]) byDate[l.date] = []
    byDate[l.date]!.push(l)
  }

  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  // Summary stats
  const totalLessons = lessons?.length ?? 0
  const totalStudents = Object.values(studentsByLesson).reduce((sum, s) => sum + s.count, 0)
  const totalDays = dates.length

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-alpine-900">Lesson Archive</h1>
          <p className="text-sm text-slate-500 mt-0.5">All completed lesson days</p>
        </div>
        <Link href="/admin/lessons" className="text-sm text-slate-500 hover:text-slate-700">
          ← Active Lessons
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Discipline</label>
            <select
              name="discipline"
              defaultValue={searchParams.discipline ?? ''}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alpine-600"
            >
              <option value="">All</option>
              <option value="ski">Ski</option>
              <option value="snowboard">Snowboard</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input
              type="date"
              name="from"
              defaultValue={searchParams.from ?? ''}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alpine-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input
              type="date"
              name="to"
              defaultValue={searchParams.to ?? ''}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alpine-600"
            />
          </div>
          <button
            type="submit"
            className="bg-alpine-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-alpine-700 transition-colors"
          >
            Filter
          </button>
          {(searchParams.discipline || searchParams.from || searchParams.to) && (
            <Link
              href="/admin/archive"
              className="text-sm text-slate-500 hover:text-slate-700 underline"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Summary bar */}
      {totalLessons > 0 && (
        <div className="bg-[#172554] text-white rounded-2xl px-6 py-4 mb-6 flex flex-wrap gap-8 text-sm">
          <div>
            <p className="text-blue-300 text-xs font-medium uppercase tracking-wide">Days</p>
            <p className="font-semibold mt-0.5 text-lg">{totalDays}</p>
          </div>
          <div>
            <p className="text-blue-300 text-xs font-medium uppercase tracking-wide">Lessons</p>
            <p className="font-semibold mt-0.5 text-lg">{totalLessons}</p>
          </div>
          <div>
            <p className="text-blue-300 text-xs font-medium uppercase tracking-wide">Students</p>
            <p className="font-semibold mt-0.5 text-lg">{totalStudents}</p>
          </div>
        </div>
      )}

      {dates.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg mb-1">No archived lessons yet</p>
          <p className="text-sm">Past lesson days will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dates.map((date) => {
            const dayLessons = byDate[date] ?? []
            const dayStudents = dayLessons.reduce(
              (sum, l) => sum + (studentsByLesson[l.id]?.count ?? 0),
              0
            )
            const dayLessonsGoneAhead = dayLessons.filter(
              (l) => !['cancelled', 'closed'].includes(l.status)
            ).length

            return (
              <div key={date} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Day header */}
                <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <p className="font-bold text-slate-800">{formatNZDate(date)}</p>
                    <span className="text-xs text-slate-500">
                      {dayLessonsGoneAhead}/{dayLessons.length} lessons ran · {dayStudents} student{dayStudents !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Link
                    href={`/admin/day-sheet?date=${date}`}
                    className="text-xs text-alpine-700 hover:underline font-medium"
                  >
                    View day sheet →
                  </Link>
                </div>

                {/* Lessons */}
                <table className="w-full text-sm">
                  <tbody>
                    {dayLessons.map((lesson) => {
                      const l = lesson as Lesson
                      const instructor = lesson.instructor as Instructor | null
                      const students = studentsByLesson[l.id]
                      const cancelled = ['cancelled', 'closed'].includes(l.status)
                      const disc = l.discipline === 'ski' ? '⛷' : '🏂'

                      return (
                        <tr key={l.id} className={`border-t border-slate-100 ${cancelled ? 'opacity-50' : ''}`}>
                          <td className="px-6 py-3 w-24 text-slate-500 font-mono text-xs">
                            {formatTime(l.start_time)}
                          </td>
                          <td className="px-2 py-3 w-6">{disc}</td>
                          <td className="px-2 py-3 text-slate-700">
                            <span className="font-medium capitalize">
                              {l.level} {l.lesson_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {instructor?.name ?? (cancelled ? '—' : <span className="text-amber-600">No instructor</span>)}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {students && students.names.length > 0
                              ? students.names.join(', ')
                              : cancelled ? '—' : 'No students'}
                            {students && students.count > 0 && (
                              <span className="ml-1 font-semibold text-slate-700">
                                ({students.count})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              cancelled
                                ? 'bg-slate-100 text-slate-400'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {cancelled ? l.status : 'completed'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/lessons/${l.id}`}
                              className="text-xs text-alpine-700 hover:underline"
                            >
                              Details
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
