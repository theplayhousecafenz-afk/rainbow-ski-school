'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CancelLessonButton({
  lessonId,
  lessonStatus,
  confirmedCount,
}: {
  lessonId: string
  lessonStatus: string
  confirmedCount: number
}) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'loading' | 'done'>('idle')
  const [result, setResult] = useState<{ refunds: number; errors: number } | null>(null)
  const router = useRouter()

  if (lessonStatus === 'cancelled') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
        <p className="text-red-700 font-semibold">✗ This lesson has been cancelled.</p>
      </div>
    )
  }

  async function handleCancel() {
    setStep('loading')
    const res = await fetch('/api/admin/lessons/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId }),
    })
    const data = await res.json()
    if (!res.ok) {
      alert('Failed to cancel lesson: ' + (data.error ?? 'Unknown error'))
      setStep('confirm')
      return
    }
    const refunds = (data.refunds ?? []) as Array<{ ok: boolean }>
    setResult({
      refunds: refunds.filter((r) => r.ok).length,
      errors: refunds.filter((r) => !r.ok).length,
    })
    setStep('done')
    router.refresh()
  }

  return (
    <div className={`rounded-2xl border shadow-sm p-6 mb-6 ${step === 'confirm' || step === 'loading' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-700 mb-1">Cancel Lesson</h2>
          {step === 'idle' && (
            <p className="text-sm text-slate-500">
              Permanently cancel this lesson.
              {confirmedCount > 0 && ` ${confirmedCount} confirmed student${confirmedCount !== 1 ? 's' : ''} will be refunded automatically.`}
            </p>
          )}
          {step === 'confirm' && (
            <p className="text-sm text-red-700 font-medium">
              Are you sure? This will cancel the lesson
              {confirmedCount > 0 ? `, refund ${confirmedCount} student${confirmedCount !== 1 ? 's' : ''}, and send cancellation emails.` : '.'}
              {' '}This cannot be undone.
            </p>
          )}
          {step === 'done' && result && (
            <p className="text-sm text-slate-600">
              Lesson cancelled.
              {result.refunds > 0 && ` ${result.refunds} refund${result.refunds !== 1 ? 's' : ''} issued.`}
              {result.errors > 0 && ` ⚠️ ${result.errors} refund${result.errors !== 1 ? 's' : ''} failed — check Stripe.`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {step === 'idle' && (
            <button
              onClick={() => setStep('confirm')}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
            >
              Cancel Lesson
            </button>
          )}
          {step === 'confirm' && (
            <>
              <button
                onClick={() => setStep('idle')}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Go Back
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Yes, Cancel Lesson
              </button>
            </>
          )}
          {step === 'loading' && (
            <span className="text-sm text-red-600 font-medium animate-pulse">Cancelling…</span>
          )}
        </div>
      </div>
    </div>
  )
}
