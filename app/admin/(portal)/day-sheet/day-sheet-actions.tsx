'use client'

import { useState, useEffect } from 'react'

type SendType = 'personal' | 'master' | 'self'
const storageKey = (date: string, type: SendType) => `daysheet_${type}_sent_${date}`

export default function DaySheetActions({
  date,
  hasLessons,
  assignedInstructors,
}: {
  date: string
  hasLessons: boolean
  assignedInstructors: string[]
}) {
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState<SendType | null>(null)
  const [errors, setErrors] = useState<Record<SendType, string>>({ personal: '', master: '', self: '' })
  const [lastSent, setLastSent] = useState<Record<SendType, { at: string; instructors: string[] } | null>>({
    personal: null,
    master: null,
    self: null,
  })

  useEffect(() => {
    setSending(null)
    setNotes('')
    setErrors({ personal: '', master: '', self: '' })
    const load = (type: SendType) => {
      try {
        const stored = localStorage.getItem(storageKey(date, type))
        return stored ? JSON.parse(stored) : null
      } catch { return null }
    }
    setLastSent({ personal: load('personal'), master: load('master'), self: load('self') })
  }, [date])

  async function send(type: SendType) {
    setSending(type)
    setErrors(e => ({ ...e, [type]: '' }))
    const res = await fetch('/api/admin/day-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        sendMasterToAll: type === 'master',
        selfOnly: type === 'self',
        notes,
      }),
    })
    const data = await res.json()
    setSending(null)
    if (!res.ok) {
      setErrors(e => ({ ...e, [type]: data.error ?? 'Failed to send' }))
      return
    }
    const record = { at: new Date().toISOString(), instructors: data.instructorsSent ?? [] }
    setLastSent(prev => ({ ...prev, [type]: record }))
    try { localStorage.setItem(storageKey(date, type), JSON.stringify(record)) } catch {}
  }

  const canSend = hasLessons && assignedInstructors.length > 0

  function SentLabel({ type }: { type: SendType }) {
    const s = lastSent[type]
    if (!s) return null
    return (
      <p className="text-xs text-amber-600 font-medium text-right">
        ⚠️ Last sent {new Date(s.at).toLocaleString('en-NZ', {
          timeZone: 'Pacific/Auckland', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        })}
      </p>
    )
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Notes field */}
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Add notes for today (optional)…"
        rows={2}
        className="w-72 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-alpine-600 resize-none"
      />

      <div className="flex items-center gap-2">
        {/* Print */}
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          🖨 Print
        </button>

        {/* Send to Me — always available if there are lessons */}
        {hasLessons && (
          <button
            onClick={() => send('self')}
            disabled={sending !== null}
            title="Send master sheet + notes to snowsports@skirainbow.co.nz only"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
              errors.self ? 'bg-red-100 text-red-700'
              : lastSent.self ? 'bg-green-100 text-green-700'
              : 'bg-slate-600 text-white hover:bg-slate-700'
            }`}
          >
            {sending === 'self' ? 'Sending…'
              : errors.self ? `✗ ${errors.self}`
              : lastSent.self ? '✓ Sent to Me'
              : '📩 Send to Me'}
          </button>
        )}

        {canSend ? (
          <>
            {/* Personal — each instructor gets only their lesson(s) */}
            <button
              onClick={() => send('personal')}
              disabled={sending !== null}
              title="Each instructor receives only their own lesson and student list"
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
                errors.personal ? 'bg-red-100 text-red-700'
                : 'bg-alpine-900 text-white hover:bg-alpine-700'
              }`}
            >
              {sending === 'personal' ? 'Sending…'
                : errors.personal ? `✗ ${errors.personal}`
                : '📧 Send Individual Sheets'}
            </button>

            {/* Master — everyone gets the full rundown */}
            <button
              onClick={() => send('master')}
              disabled={sending !== null}
              title="Every instructor receives the full day's master sheet"
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
                errors.master ? 'bg-red-100 text-red-700'
                : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              {sending === 'master' ? 'Sending…'
                : errors.master ? `✗ ${errors.master}`
                : '📋 Send Master to All'}
            </button>
          </>
        ) : !hasLessons ? (
          <span className="text-sm text-slate-400 italic">No lessons on this date</span>
        ) : (
          <span className="text-sm text-slate-400 italic">No instructors assigned yet</span>
        )}
      </div>

      {/* Last-sent warnings */}
      <div className="flex flex-col items-end gap-0.5">
        {lastSent.self && (
          <p className="text-xs text-amber-600 font-medium text-right">
            ⚠️ Sent to me {new Date(lastSent.self.at).toLocaleString('en-NZ', {
              timeZone: 'Pacific/Auckland', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        )}
        {lastSent.personal && <SentLabel type="personal" />}
        {lastSent.master && (
          <p className="text-xs text-amber-600 font-medium text-right">
            ⚠️ Master last sent {new Date(lastSent.master.at).toLocaleString('en-NZ', {
              timeZone: 'Pacific/Auckland', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  )
}
