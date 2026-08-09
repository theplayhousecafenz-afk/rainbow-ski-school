import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase'
import { formatNZDate, formatTime } from '@/lib/booking-utils'
import type { Lesson, Booking, Customer, Instructor } from '@/types'
import RosterActions from './roster-actions'

export const dynamic = 'force-dynamic'

export default async function RosterPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase()

  const [{ data: lesson, error }, { data: bookings }] = await Promise.all([
    supabase
      .from('lessons')
      .select('*, instructor:instructors(*)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('bookings')
      .select('quantity, customer:customers(*)')
      .eq('lesson_id', params.id)
      .eq('status', 'confirmed')
      .order('created_at'),
  ])

  if (error || !lesson) notFound()

  const l = lesson as Lesson
  const students = (bookings ?? []).map((b) => ({
    customer: b.customer as unknown as Customer,
    quantity: (b.quantity as number) ?? 1,
  }))
  const totalStudents = students.reduce((sum, s) => sum + s.quantity, 0)
  const instructor = l.instructor as Instructor | null

  return (
    <>
      {/* Print-hide controls */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      {/* Action bar — hidden on print */}
      <div className="no-print max-w-3xl mx-auto mb-4 flex items-center gap-3 print:hidden">
        <a
          href={`/admin/lessons/${params.id}`}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to lesson
        </a>
        <div className="ml-auto flex gap-2">
          <RosterActions
            lessonId={params.id}
            hasInstructor={!!instructor}
            instructorName={instructor?.name ?? null}
            hasStudents={students.length > 0}
          />
        </div>
      </div>

      {/* Roster card */}
      <div id="roster-content" className="print-page max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-[#172554] text-white px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold">Rainbow Ski School</h1>
              <p className="text-blue-200 text-sm mt-0.5">Student Roster</p>
            </div>
            <div className="text-right text-sm text-blue-200">
              <p>St Arnaud, NZ</p>
              <p>snowsports@skirainbow.co.nz</p>
            </div>
          </div>
        </div>

        {/* Lesson details */}
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-sm">
            <Detail label="Discipline" value={l.discipline.toUpperCase()} />
            <Detail label="Date" value={formatNZDate(l.date)} />
            <Detail label="Time" value={formatTime(l.start_time)} />
            <Detail label="Type" value={l.lesson_type.charAt(0).toUpperCase() + l.lesson_type.slice(1)} />
            <Detail label="Level" value={l.level === 'first_timer' ? 'First Timer' : l.level.charAt(0).toUpperCase() + l.level.slice(1)} />
            <Detail label="Students" value={`${totalStudents} confirmed`} />
          </div>

          {instructor && (
            <div className="mt-3 pt-3 border-t border-slate-200 text-sm">
              <span className="text-slate-500 font-medium">Instructor: </span>
              <span className="text-slate-800 font-semibold">{instructor.name}</span>
              {instructor.phone && (
                <span className="text-slate-500"> · {instructor.phone}</span>
              )}
            </div>
          )}
        </div>

        {/* Student table */}
        <div className="px-8 py-5">
          {students.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No confirmed students yet.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2 pr-4 text-xs font-bold uppercase tracking-wide text-slate-500">Name</th>
                  <th className="text-left py-2 pr-4 text-xs font-bold uppercase tracking-wide text-slate-500">Phone</th>
                  <th className="text-left py-2 pr-4 text-xs font-bold uppercase tracking-wide text-slate-500">Email</th>
                  <th className="text-center py-2 text-xs font-bold uppercase tracking-wide text-slate-500">Qty</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-semibold text-slate-800">{s.customer.name}</td>
                    <td className="py-3 pr-4 text-slate-600">{s.customer.phone}</td>
                    <td className="py-3 pr-4 text-slate-500 text-xs">{s.customer.email}</td>
                    <td className="py-3 text-center text-slate-600">{s.quantity}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-3 text-sm font-semibold text-slate-600 text-right pr-4">Total students:</td>
                  <td className="pt-3 text-center font-bold text-slate-800">{totalStudents}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
          Printed {new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })} · Rainbow Ski School · Meet at Mountain Clock
        </div>
      </div>
    </>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">{label}: </span>
      <span className="text-slate-800 font-semibold">{value}</span>
    </div>
  )
}
