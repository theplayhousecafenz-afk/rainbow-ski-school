'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { getUpcomingWeekends, formatNZDate, formatTime, getBookingCutoff } from '@/lib/booking-utils'
import type { Lesson, Discipline, CustomerType, BookingAvailability } from '@/types'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type Step = 1 | 2 | 3 | 4 | 5 | 6

type AnnotatedLesson = Lesson & { availability: BookingAvailability }

interface BookingState {
  discipline: Discipline | null
  date: string | null
  lesson: AnnotatedLesson | null
  customer: { name: string; email: string; phone: string; customerType: CustomerType; ageConfirmed: boolean }
  clientSecret: string | null
  bookingId: string | null
  lessonAfterPayment: Lesson | null
}

const INITIAL_STATE: BookingState = {
  discipline: null,
  date: null,
  lesson: null,
  customer: { name: '', email: '', phone: '', customerType: 'adult', ageConfirmed: false },
  clientSecret: null,
  bookingId: null,
  lessonAfterPayment: null,
}

function StepIndicator({ current, total = 5 }: { current: Step; total?: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              s < current
                ? 'bg-green-500 text-white'
                : s === current
                ? 'bg-alpine-900 text-white'
                : 'bg-slate-200 text-slate-400'
            }`}
          >
            {s < current ? '✓' : s}
          </div>
          {s < total && (
            <div className={`w-8 h-0.5 ${s < current ? 'bg-green-400' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function BookingForm() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>(1)
  const [state, setState] = useState<BookingState>({
    ...INITIAL_STATE,
    discipline: (searchParams.get('discipline') as Discipline) ?? null,
  })
  const [lessons, setLessons] = useState<AnnotatedLesson[]>([])
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [error, setError] = useState('')
  const [creatingIntent, setCreatingIntent] = useState(false)

  // If discipline was passed in query, skip to step 2
  useEffect(() => {
    if (state.discipline && step === 1) setStep(2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchLessons(date: string, discipline: Discipline) {
    setLoadingLessons(true)
    try {
      const res = await fetch(`/api/lessons?date=${date}&discipline=${discipline}`)
      const data = await res.json()
      setLessons(data.lessons ?? [])
    } finally {
      setLoadingLessons(false)
    }
  }

  function go(next: Step) {
    setError('')
    setStep(next)
  }

  // ── Step 1: Choose discipline ──────────────────────────────────────────────
  if (step === 1) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-alpine-900 mb-2 text-center">Choose Your Discipline</h2>
        <p className="text-slate-500 text-center text-sm mb-8">Ski and snowboard lessons run separately with dedicated instructor pools.</p>
        <div className="grid sm:grid-cols-2 gap-6 max-w-lg mx-auto">
          {([['ski', '⛷️', 'Skiing', 'from-blue-600 to-blue-800'], ['snowboard', '🏂', 'Snowboarding', 'from-purple-600 to-purple-900']] as const).map(([d, icon, label, gradient]) => (
            <button
              key={d}
              onClick={() => { setState({ ...state, discipline: d }); go(2) }}
              className={`bg-gradient-to-br ${gradient} text-white rounded-2xl p-8 text-center hover:scale-105 transition-transform shadow-lg`}
            >
              <div className="text-5xl mb-3">{icon}</div>
              <div className="text-xl font-bold">{label}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Step 2: Pick date ──────────────────────────────────────────────────────
  if (step === 2) {
    const weekends = getUpcomingWeekends(12)
    const now = new Date()

    return (
      <div>
        <StepIndicator current={2} />
        <h2 className="text-2xl font-bold text-alpine-900 mb-2 text-center">
          Pick a Date
        </h2>
        <p className="text-center text-slate-500 text-sm mb-8">
          {state.discipline?.toUpperCase()} lessons · Saturdays &amp; Sundays only
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
          {weekends.map((date) => {
            const cutoff = getBookingCutoff(new Date(date))
            const afterCutoff = now >= cutoff
            return (
              <button
                key={date}
                onClick={() => {
                  setState({ ...state, date, lesson: null })
                  fetchLessons(date, state.discipline!)
                  go(3)
                }}
                className="bg-white border border-slate-200 hover:border-alpine-600 rounded-xl p-4 text-left transition-colors shadow-sm"
              >
                <p className="text-xs font-semibold text-slate-500 uppercase">
                  {new Date(date).toLocaleDateString('en-NZ', { weekday: 'short', timeZone: 'Pacific/Auckland' })}
                </p>
                <p className="text-base font-bold text-alpine-900 mt-0.5">
                  {new Date(date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', timeZone: 'Pacific/Auckland' })}
                </p>
                {afterCutoff && (
                  <p className="text-xs text-orange-600 mt-1">Late booking</p>
                )}
              </button>
            )
          })}
        </div>
        <div className="text-center mt-6">
          <button onClick={() => go(1)} className="text-sm text-slate-400 hover:text-slate-600">← Back</button>
        </div>
      </div>
    )
  }

  // ── Step 3: Pick lesson ────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div>
        <StepIndicator current={3} />
        <h2 className="text-2xl font-bold text-alpine-900 mb-1 text-center">Choose a Lesson</h2>
        <p className="text-center text-slate-500 text-sm mb-8">
          {state.discipline?.toUpperCase()} · {state.date ? formatNZDate(state.date) : ''}
        </p>

        {loadingLessons && <p className="text-center text-slate-400">Loading lessons…</p>}

        {!loadingLessons && lessons.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500 mb-4">No {state.discipline} lessons available on this date.</p>
            <button onClick={() => go(2)} className="text-sm text-alpine-700 underline">Choose another date</button>
          </div>
        )}

        {!loadingLessons && lessons.length > 0 && (
          <div className="space-y-3 max-w-lg mx-auto">
            {lessons.map((lesson) => {
              const avail = lesson.availability
              const disabled = !avail.available
              return (
                <button
                  key={lesson.id}
                  disabled={disabled}
                  onClick={() => { setState({ ...state, lesson }); go(4) }}
                  className={`w-full text-left rounded-xl border p-5 transition-colors ${
                    disabled
                      ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200'
                      : state.lesson?.id === lesson.id
                      ? 'border-alpine-900 bg-alpine-50'
                      : 'bg-white border-slate-200 hover:border-alpine-600 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {formatTime(lesson.start_time)} ·{' '}
                        <span className="capitalize">{lesson.lesson_type}</span> ·{' '}
                        <span className="capitalize">{lesson.level}</span>
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {lesson.current_bookings}/{lesson.max_students} booked ·{' '}
                        {lesson.lesson_type === 'group' ? 'Group 1.5 hrs' : 'Private per hour'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-alpine-900">
                        ${lesson.lesson_type === 'group' ? '90' : '150'}
                        <span className="text-xs font-normal text-slate-400 ml-1">adult</span>
                      </p>
                      {!disabled && avail.reason === 'late_booking' && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Late booking</span>
                      )}
                      {disabled && avail.reason === 'full' && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Full</span>
                      )}
                      {disabled && avail.reason === 'cutoff_passed' && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Closed</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="text-center mt-6">
          <button onClick={() => go(2)} className="text-sm text-slate-400 hover:text-slate-600">← Back</button>
        </div>
      </div>
    )
  }

  // ── Step 4: Customer details ───────────────────────────────────────────────
  if (step === 4) {
    const { customer } = state
    const price = state.lesson
      ? state.lesson.lesson_type === 'group'
        ? customer.customerType === 'adult' ? 90 : 60
        : 150
      : 0

    async function handleDetailsNext(e: React.FormEvent) {
      e.preventDefault()
      if (!customer.ageConfirmed) { setError('Please confirm the student is 7 years or older.'); return }
      setCreatingIntent(true)
      setError('')
      try {
        const res = await fetch('/api/bookings/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId: state.lesson!.id,
            customerType: customer.customerType,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
          }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Failed to initialise payment'); return }
        setState({ ...state, clientSecret: data.clientSecret, bookingId: data.bookingId })
        go(5)
      } catch {
        setError('Network error — please try again')
      } finally {
        setCreatingIntent(false)
      }
    }

    return (
      <div>
        <StepIndicator current={4} />
        <h2 className="text-2xl font-bold text-alpine-900 mb-1 text-center">Your Details</h2>
        <p className="text-center text-slate-500 text-sm mb-8">
          {state.discipline?.toUpperCase()} · {formatNZDate(state.date!)} · {formatTime(state.lesson!.start_time)}
        </p>
        <form onSubmit={handleDetailsNext} className="max-w-md mx-auto space-y-4">
          <FormField label="Full Name">
            <input
              type="text"
              required
              value={customer.name}
              onChange={(e) => setState({ ...state, customer: { ...customer, name: e.target.value } })}
              className={inp}
              placeholder="Jane Smith"
            />
          </FormField>
          <FormField label="Email">
            <input
              type="email"
              required
              value={customer.email}
              onChange={(e) => setState({ ...state, customer: { ...customer, email: e.target.value } })}
              className={inp}
              placeholder="jane@example.com"
            />
          </FormField>
          <FormField label="Phone">
            <input
              type="tel"
              required
              value={customer.phone}
              onChange={(e) => setState({ ...state, customer: { ...customer, phone: e.target.value } })}
              className={inp}
              placeholder="+64 21 000 0000"
            />
          </FormField>
          <FormField label="Age Category">
            <select
              value={customer.customerType}
              onChange={(e) => setState({ ...state, customer: { ...customer, customerType: e.target.value as CustomerType } })}
              className={inp}
            >
              <option value="adult">Adult (15–65) — ${state.lesson?.lesson_type === 'group' ? '90' : '150'}</option>
              <option value="youth_child_student_senior">Youth/Child (14 &amp; under), Student, or Senior — ${state.lesson?.lesson_type === 'group' ? '60' : '150'}</option>
            </select>
          </FormField>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={customer.ageConfirmed}
              onChange={(e) => setState({ ...state, customer: { ...customer, ageConfirmed: e.target.checked } })}
              className="mt-0.5 w-4 h-4 accent-alpine-900"
            />
            <span className="text-sm text-slate-600">
              I confirm the student is <strong>7 years or older</strong>. No children under 7 are permitted.
            </span>
          </label>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">
                {state.lesson?.lesson_type === 'group' ? 'Group lesson (1.5 hrs)' : 'Private lesson (per hour)'}
              </span>
              <span className="font-bold text-alpine-900">${price} NZD</span>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={creatingIntent}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
          >
            {creatingIntent ? 'Setting up payment…' : `Continue to Payment — $${price} NZD`}
          </button>
          <div className="text-center">
            <button type="button" onClick={() => go(3)} className="text-sm text-slate-400 hover:text-slate-600">← Back</button>
          </div>
        </form>
      </div>
    )
  }

  // ── Step 5: Payment ────────────────────────────────────────────────────────
  if (step === 5 && state.clientSecret) {
    return (
      <div>
        <StepIndicator current={5} />
        <h2 className="text-2xl font-bold text-alpine-900 mb-1 text-center">Payment</h2>
        <p className="text-center text-slate-500 text-sm mb-8">Secure payment via Stripe</p>
        <div className="max-w-md mx-auto">
          <Elements stripe={stripePromise} options={{ clientSecret: state.clientSecret, appearance: { theme: 'stripe' } }}>
            <PaymentStep
              bookingId={state.bookingId!}
              onSuccess={(lesson) => {
                setState({ ...state, lessonAfterPayment: lesson })
                go(6)
              }}
              onBack={() => go(4)}
            />
          </Elements>
        </div>
      </div>
    )
  }

  // ── Step 6: Confirmation ───────────────────────────────────────────────────
  if (step === 6) {
    const lesson = state.lessonAfterPayment
    const isConfirmed = lesson && lesson.current_bookings >= 2

    return (
      <div className="max-w-lg mx-auto text-center">
        <div className={`text-6xl mb-4`}>{isConfirmed ? '🎿' : '⏳'}</div>
        <h2 className="text-2xl font-bold text-alpine-900 mb-3">
          {isConfirmed ? 'You\'re booked!' : 'Booking received!'}
        </h2>
        {isConfirmed ? (
          <p className="text-slate-600 mb-6">
            Your {state.discipline?.toUpperCase()} lesson is <strong>confirmed</strong>. We'll see you at the Mountain Clock!
          </p>
        ) : (
          <p className="text-slate-600 mb-6">
            Your payment is confirmed. Your {state.discipline?.toUpperCase()} lesson is <strong>pending minimum numbers</strong>.
            Once a second student books, you'll get a confirmation email. If the lesson doesn't fill by the cutoff, you'll receive a full refund automatically.
          </p>
        )}
        {state.bookingId && (
          <Link
            href={`/booking/${state.bookingId}`}
            className="inline-block bg-alpine-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-alpine-700 transition-colors"
          >
            View Booking Details
          </Link>
        )}
        <div className="mt-4">
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">Back to home</Link>
        </div>
      </div>
    )
  }

  return null
}

function PaymentStep({
  bookingId,
  onSuccess,
  onBack,
}: {
  bookingId: string
  onSuccess: (lesson: Lesson) => void
  onBack: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)
    setError('')

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed')
      setPaying(false)
      return
    }

    // Confirm booking server-side
    try {
      const res = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Confirmation failed'); setPaying(false); return }
      onSuccess(data.lesson)
    } catch {
      setError('Network error during confirmation')
      setPaying(false)
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <PaymentElement />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={paying || !stripe}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60"
      >
        {paying ? 'Processing…' : 'Pay Now'}
      </button>
      <div className="text-center">
        <button type="button" onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600">← Back</button>
      </div>
      <p className="text-center text-xs text-slate-400">
        Payments are processed securely by Stripe. We never see your card details.
      </p>
    </form>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alpine-600'

export default function BookPage() {
  return (
    <>
      <Nav />
      <main className="flex-1 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Suspense>
            <BookingForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  )
}
