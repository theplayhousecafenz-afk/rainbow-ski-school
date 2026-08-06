'use client'

import { useState } from 'react'

export default function HoldButton({
  lessonId,
  initialOnHold,
}: {
  lessonId: string
  initialOnHold: boolean
}) {
  const [onHold, setOnHold] = useState(initialOnHold)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function toggle() {
    setSaving(true)
    setSaved(false)
    const next = !onHold
    await fetch('/api/admin/lessons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lessonId, on_hold: next }),
    })
    setOnHold(next)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className={`rounded-2xl border shadow-sm p-6 mb-6 ${onHold ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`font-semibold mb-1 ${onHold ? 'text-orange-800' : 'text-slate-700'}`}>
            {onHold ? '⏸ Lesson On Hold' : 'Lesson Hold'}
          </h2>
          <p className="text-sm text-slate-500">
            {onHold
              ? 'New bookings are paused. Existing bookings are unaffected. Remove hold once a new instructor is confirmed.'
              : 'Put this lesson on hold to pause new bookings — useful if an instructor calls in sick.'}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          className={`ml-6 shrink-0 px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
            onHold
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          {saving ? 'Saving…' : saved ? '✓ Done' : onHold ? 'Remove Hold' : 'Put on Hold'}
        </button>
      </div>
    </div>
  )
}
