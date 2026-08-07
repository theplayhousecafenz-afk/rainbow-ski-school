'use client'

import { useState, useEffect } from 'react'

const storageKey = (date: string) => `daysheet_sent_${date}`

export default function DaySheetActions({
  date,
  hasLessons,
  assignedInstructors,
}: {
  date: string
  hasLessons: boolean
  assignedInstructors: string[]
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [lastSent, setLastSent] = useState<{ at: string; instructors: string[] } | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(date))
      if (stored) setLastSent(JSON.parse(stored))
    } catch {}
    setStatus('idle')
    setLastSent(null)
    try {
      const stored = localStorage.getItem(storageKey(date))
      if (stored) setLastSent(JSON.parse(stored))
    } catch {}
  }, [date])

  async function sendAll() {
    setStatus('sending')
    setErrorMsg('')
    const res = await fetch('/api/admin/day-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    })
    const data = await res.json()
    if (!res.ok) {
      setErrorMsg(data.error ?? 'Failed to send')
      setStatus('error')
      return
    }
    setStatus('sent')
    const record = { at: new Date().toISOString(), instructors: data.instructorsSent ?? [] }
    setLastSent(record)
    try { localStorage.setItem(storageKey(date), JSON.stringify(record)) } catch {}
  }

  const lastSentLabel = lastSent
    ? `Last sent ${new Date(lastSent.at).toLocaleString('en-NZ', {
        timeZone: 'Pacific/Auckland',
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })}`
    : null

  const canSend = hasLessons && assignedInstructors.length > 0

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          🖨 Print
        </button>

        {canSend ? (
          <button
            onClick={sendAll}
            disabled={status === 'sending'}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
              status === 'sent'
                ? 'bg-green-100 text-green-700'
                : status === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-alpine-900 text-white hover:bg-alpine-700'
            }`}
          >
            {status === 'sending'
              ? 'Sending…'
              : status === 'sent'
              ? `✓ Sent to ${assignedInstructors.length} instructor${assignedInstructors.length !== 1 ? 's' : ''}`
              : status === 'error'
              ? `✗ ${errorMsg}`
              : `📧 Send to All Instructors`}
          </button>
        ) : !hasLessons ? (
          <span className="text-sm text-slate-400 italic">No lessons on this date</span>
        ) : (
          <span className="text-sm text-slate-400 italic">No instructors assigned yet</span>
        )}
      </div>

      {lastSentLabel && (
        <p className="text-xs text-amber-600 font-medium">
          ⚠️ {lastSentLabel} → {lastSent!.instructors.join(', ') || 'instructors'}
        </p>
      )}
    </div>
  )
}
