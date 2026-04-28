import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase'
import { formatNZDate, formatTime, getBookingCutoff } from '@/lib/booking-utils'
import type { Lesson } from '@/types'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  instructor_confirmed: 'bg-blue-100 text-blue-800',
  active: 'bg-blue-200 text-blue-900',
  cancelled: 'bg-red-100 text-red-700',
  closed: 'bg-slate-100 text-slate-500',
}

export default async function AdminOverviewPage() {
  const supabase = createServerSupabase()
  const today = new Date().toISOString().slice(0, 10)

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*, instructor:instructors(name)')
    .gte('date', today)
    .not('status', 'in', '("cancelled","closed")')
    .order('date')
    .order('start_time')
    .limit(60)

  // Group by date then discipline
  const byDate: Record<string, { ski: Lesson[]; snowboard: Lesson[] }> = {}
  for (const lesson of lessons ?? []) {
    if (!byDate[lesson.date]) byDate[lesson.date] = { ski: [], snowboard: [] }
    byDate[lesson.date][lesson.discipline as 'ski' | 'snowboard'].push(lesson as Lesson)
  }

  const now = new Date()
  const atRisk = (lessons ?? []).filter((l) => {
    const cutoff = getBookingCutoff(new Date(l.date))
    const hoursToGo = (cutoff.getTime() - now.getTime()) / 3_600_000
    return l.current_bookings === 1 && hoursToGo > 0 && hoursToGo < 48
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-alpine-900">Overview</h1>
        <Link
          href="/admin/lessons"
          className="text-sm bg-alpine-900 text-white px-4 py-2 rounded-lg hover:bg-alpine-700 transition-colors"
        >
          All Lessons
        </Link>
      </div>

      {/* At-risk alert */}
      {atRisk.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <p className="font-semibold text-orange-800 mb-2">
            ⚠️ {atRisk.length} lesson{atRisk.length !== 1 ? 's' : ''} at risk (1 booking, near cutoff)
          </p>
          <ul className="text-sm text-orange-700 space-y-1">
            {atRisk.map((l) => (
              <li key={l.id}>
                <Link href={`/admin/lessons/${l.id}`} className="underline">
                  {l.discipline.toUpperCase()} · {formatNZDate(l.date)} · {formatTime(l.start_time)} · {l.lesson_type}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lessons by date */}
      {Object.entries(byDate).map(([date, { ski, snowboard }]) => (
        <div key={date} className="mb-8">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
            {formatNZDate(date)}
          </h2>
          <div className="grid lg:grid-cols-2 gap-4">
            {[
              { disc: 'ski', lessons: ski },
              { disc: 'snowboard', lessons: snowboard },
            ].map(({ disc, lessons: discLessons }) => (
              <div key={disc}>
                <h3 className={`text-xs font-semibold uppercase tracking-widest mb-2 ${disc === 'ski' ? 'text-blue-600' : 'text-purple-600'}`}>
                  {disc}
                </h3>
                {discLessons.length === 0 ? (
                  <p className="text-slate-400 text-sm italic">No {disc} lessons</p>
                ) : (
                  <div className="space-y-2">
                    {discLessons.map((lesson) => (
                      <Link
                        key={lesson.id}
                        href={`/admin/lessons/${lesson.id}`}
                        className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 hover:border-alpine-600 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {formatTime(lesson.start_time)} · {lesson.lesson_type} · {lesson.level}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {lesson.current_bookings}/{lesson.max_students} students
                            {lesson.instructor ? ` · ${lesson.instructor.name}` : ' · No instructor'}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[lesson.status]}`}>
                          {lesson.status.replace('_', ' ')}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {Object.keys(byDate).length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg mb-2">No upcoming lessons</p>
          <Link href="/admin/lessons" className="text-sm text-alpine-600 underline">
            Create lessons
          </Link>
        </div>
      )}
    </div>
  )
}
