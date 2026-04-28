import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase'
import { formatNZDate, formatTime } from '@/lib/booking-utils'
import type { Lesson, Booking, Customer, Availability, Instructor } from '@/types'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-slate-100 text-slate-600',
}

const AVAIL_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
}

export default async function AdminLessonDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase()

  const [{ data: lesson, error }, { data: bookings }, { data: availabilities }] =
    await Promise.all([
      supabase
        .from('lessons')
        .select('*, instructor:instructors(*)')
        .eq('id', params.id)
        .single(),
      supabase
        .from('bookings')
        .select('*, customer:customers(*)')
        .eq('lesson_id', params.id)
        .order('created_at'),
      supabase
        .from('availability')
        .select('*, instructor:instructors(*)')
        .eq('lesson_id', params.id),
    ])

  if (error || !lesson) notFound()

  const l = lesson as Lesson
  const bkgs = (bookings ?? []) as Array<Booking & { customer: Customer }>
  const avails = (availabilities ?? []) as Array<Availability & { instructor: Instructor }>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/lessons" className="text-sm text-slate-500 hover:text-slate-700">
          ← Lessons
        </Link>
        <h1 className="text-2xl font-bold text-alpine-900">Lesson Detail</h1>
      </div>

      {/* Lesson info */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <Info label="Discipline" value={l.discipline.toUpperCase()} />
          <Info label="Date" value={formatNZDate(l.date)} />
          <Info label="Time" value={formatTime(l.start_time)} />
          <Info label="Type" value={l.lesson_type} />
          <Info label="Level" value={l.level} />
          <Info label="Bookings" value={`${l.current_bookings} / ${l.max_students}`} />
          <Info
            label="Status"
            value={
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[l.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {l.status.replace('_', ' ')}
              </span>
            }
          />
          {l.instructor && <Info label="Instructor" value={`${l.instructor.name} (${l.instructor.phone})`} />}
        </div>
      </div>

      {/* Bookings */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <h2 className="font-semibold text-slate-700 px-6 py-4 border-b border-slate-100">
          Bookings ({bkgs.length})
        </h2>
        {bkgs.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No bookings yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase text-slate-500 tracking-wide text-left">
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Paid</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {bkgs.map((b) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium">{b.customer.name}</td>
                  <td className="px-5 py-3 text-slate-500">{b.customer.email}</td>
                  <td className="px-5 py-3 text-slate-500">{b.customer.phone}</td>
                  <td className="px-5 py-3 capitalize">{b.customer_type.replace('_', ' / ')}</td>
                  <td className="px-5 py-3">${(b.amount_paid / 100).toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status]}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Instructor availability */}
      {avails.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <h2 className="font-semibold text-slate-700 px-6 py-4 border-b border-slate-100">
            Instructor Availability
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase text-slate-500 tracking-wide text-left">
                <th className="px-5 py-3 font-semibold">Instructor</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Response</th>
                <th className="px-5 py-3 font-semibold">Responded At</th>
              </tr>
            </thead>
            <tbody>
              {avails.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium">{a.instructor?.name}</td>
                  <td className="px-5 py-3 text-slate-500">{a.instructor?.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${AVAIL_COLORS[a.response]}`}>
                      {a.response}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">
                    {a.responded_at ? new Date(a.responded_at).toLocaleString('en-NZ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">{label}</p>
      <p className="text-slate-800 font-medium">{value}</p>
    </div>
  )
}
