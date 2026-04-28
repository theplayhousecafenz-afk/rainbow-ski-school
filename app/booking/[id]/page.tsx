import { notFound } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { createServerSupabase } from '@/lib/supabase'
import { formatNZDate, formatTime } from '@/lib/booking-utils'
import type { Booking, Lesson, Customer } from '@/types'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending Confirmation', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'Refunded', color: 'bg-slate-100 text-slate-600' },
}

const LESSON_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending Numbers', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Lesson Confirmed', color: 'bg-green-100 text-green-700' },
  instructor_confirmed: { label: 'Instructor Assigned', color: 'bg-blue-100 text-blue-700' },
  active: { label: 'Active', color: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-600' },
}

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase()

  const { data, error } = await supabase
    .from('bookings')
    .select('*, customer:customers(*), lesson:lessons(*, instructor:instructors(*))')
    .eq('id', params.id)
    .single()

  if (error || !data) notFound()

  const booking = data as Booking & { customer: Customer; lesson: Lesson }
  const lesson = booking.lesson
  const customer = booking.customer
  const bookingStatus = STATUS_LABELS[booking.status] ?? { label: booking.status, color: 'bg-slate-100 text-slate-600' }
  const lessonStatus = LESSON_STATUS_LABELS[lesson.status] ?? { label: lesson.status, color: 'bg-slate-100 text-slate-600' }

  return (
    <>
      <Nav />
      <main className="flex-1 bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 mb-6 inline-block">
            ← Back to home
          </Link>
          <h1 className="text-2xl font-bold text-alpine-900 mb-8">Booking Details</h1>

          {/* Booking status card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            <div className="bg-alpine-900 text-white px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-70 mb-1">Booking ID</p>
                  <p className="font-mono text-sm">{booking.id}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${bookingStatus.color}`}>
                  {bookingStatus.label}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <Row label="Discipline" value={lesson.discipline.toUpperCase()} />
              <Row label="Date" value={formatNZDate(lesson.date)} />
              <Row label="Time" value={formatTime(lesson.start_time)} />
              <Row label="Type" value={`${lesson.lesson_type.charAt(0).toUpperCase() + lesson.lesson_type.slice(1)} lesson`} />
              <Row label="Level" value={lesson.level.charAt(0).toUpperCase() + lesson.level.slice(1)} />
              <Row label="Meeting Point" value="Mountain Clock" />
              <Row
                label="Lesson Status"
                value={
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lessonStatus.color}`}>
                    {lessonStatus.label}
                  </span>
                }
              />
              {lesson.instructor && (
                <Row label="Instructor" value={lesson.instructor.name} />
              )}
            </div>
          </div>

          {/* Customer & payment */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 mb-6">
            <h2 className="font-semibold text-slate-700">Your Details</h2>
            <Row label="Name" value={customer.name} />
            <Row label="Email" value={customer.email} />
            <Row label="Phone" value={customer.phone} />
            <Row
              label="Amount Paid"
              value={`$${(booking.amount_paid / 100).toFixed(2)} NZD`}
            />
          </div>

          {/* Status notes */}
          {booking.status === 'pending' && lesson.status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
              <strong>Pending minimum numbers.</strong> Your lesson will be confirmed once a second student books. If the lesson doesn't reach the minimum by the booking cutoff, you'll receive a full refund.
            </div>
          )}
          {booking.status === 'refunded' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
              This booking has been refunded. Please allow 5–10 business days for the funds to appear.
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  )
}
