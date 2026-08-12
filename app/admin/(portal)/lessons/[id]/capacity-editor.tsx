'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CapacityEditor({
  lessonId,
  maxStudents,
  currentBookings,
}: {
  lessonId: string
  maxStudents: number
  currentBookings: number
}) {
  const router = useRouter()
  const [value, setValue] = useState(String(maxStudents))
  const [savedAt, setSavedAt] = useState(maxStudents)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const parsed = parseInt(value, 10)
  const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= 30
  const belowBooked = valid && parsed < currentBookings
  const changed = valid && parsed !== savedAt

  async function save() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/lessons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lessonId, max_students: parsed }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? `Server error (${res.status})`)
      return
    }
    setSavedAt(parsed)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
      <h2 className="font-semibold text-slate-700 mb-1">Class Size</h2>
      <p className="text-sm text-slate-500 mb-4">
        How many students this lesson can take. Raise it for a bigger group — handy when you
        plan to put more than one instructor on it.
      </p>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          max={30}
          value={value}
          onChange={(e) => { setValue(e.target.value); setError('') }}
          className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alpine-600"
        />
        <span className="text-sm text-slate-500">
          students · {currentBookings} booked in
        </span>
        <button
          onClick={save}
          disabled={saving || !changed || belowBooked}
          className="ml-auto bg-alpine-900 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-alpine-700 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving…' : changed ? 'Save' : 'Saved'}
        </button>
      </div>
      {belowBooked && (
        <p className="text-amber-700 text-sm mt-3">
          {currentBookings} students are already booked in — capacity cannot go below that.
          Use “Close This Lesson” below to stop new bookings instead.
        </p>
      )}
      {!valid && value !== '' && (
        <p className="text-red-600 text-sm mt-3">Enter a whole number between 1 and 30.</p>
      )}
      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
    </div>
  )
}
