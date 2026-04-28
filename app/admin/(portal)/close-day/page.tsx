'use client'

import { useState } from 'react'
import { formatNZDate } from '@/lib/booking-utils'

type Result = { lessonId: string; refundCount: number }

export default function AdminCloseDayPage() {
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[] | null>(null)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  async function handleClose() {
    if (!confirmed) { setConfirmed(true); return }
    setLoading(true)
    setError('')
    setResults(null)

    try {
      const res = await fetch('/api/admin/close-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
      } else {
        setResults(data.results)
        setConfirmed(false)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const totalRefunds = results?.reduce((s, r) => s + r.refundCount, 0) ?? 0

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-alpine-900 mb-2">Close Day &amp; Issue Refunds</h1>
      <p className="text-slate-500 text-sm mb-8">
        Select a date to cancel all lessons for that day and issue full Stripe refunds to all confirmed bookings. This action cannot be undone.
      </p>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setConfirmed(false); setResults(null) }}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {date && !confirmed && !results && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
            <strong>Warning:</strong> This will cancel all lessons on {formatNZDate(date)} and
            issue full refunds for all confirmed bookings. Emails will be sent to affected customers.
          </div>
        )}

        {confirmed && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-sm text-red-800 font-medium">
            Are you sure? Click again to confirm. This will refund all confirmed students for {formatNZDate(date)}.
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          onClick={handleClose}
          disabled={!date || loading}
          className={`w-full font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 ${
            confirmed
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          {loading
            ? 'Processing refunds…'
            : confirmed
            ? '⚠️ Confirm — Close Day & Refund All'
            : 'Close Day & Issue Refunds'}
        </button>
      </div>

      {results && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-6">
          <h2 className="font-bold text-green-800 mb-3">
            ✓ Done — {results.length} lesson{results.length !== 1 ? 's' : ''} closed, {totalRefunds} refund{totalRefunds !== 1 ? 's' : ''} issued
          </h2>
          <ul className="text-sm text-green-700 space-y-1">
            {results.map((r) => (
              <li key={r.lessonId}>
                Lesson <span className="font-mono text-xs">{r.lessonId.slice(0, 8)}</span> — {r.refundCount} refund{r.refundCount !== 1 ? 's' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
