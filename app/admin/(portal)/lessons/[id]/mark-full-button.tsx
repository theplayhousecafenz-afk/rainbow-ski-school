'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MarkFullButton({
  lessonId,
  currentBookings,
  maxStudents,
  closedToBookings,
}: {
  lessonId: string
  currentBookings: number
  maxStudents: number
  closedToBookings: boolean
}) {
  const router = useRouter()
  const [isClosed, setIsClosed] = useState(closedToBookings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function toggle() {
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/admin/lessons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lessonId, closed_to_bookings: !isClosed }),
    })
    setSaving(false)
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
      alert(`Failed to update lesson: ${error ?? res.statusText}`)
      return
    }
    setIsClosed(!isClosed)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2000)
  }

  // Already at capacity — it is closed by arithmetic, nothing to toggle
  if (!isClosed && currentBookings >= maxStudents) return null

  const spotsLeft = maxStudents - currentBookings

  return (
    <div className={`rounded-2xl border shadow-sm p-6 mb-6 ${isClosed ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`font-semibold mb-1 ${isClosed ? 'text-red-800' : 'text-slate-700'}`}>
            {isClosed ? '🚫 Closed to New Bookings' : 'Close This Lesson'}
          </h2>
          <p className="text-sm text-slate-500">
            {isClosed
              ? `Nobody new can book, even though ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} remain${spotsLeft === 1 ? 's' : ''}. Capacity is still ${maxStudents} — reopen any time.`
              : `Stop new bookings while keeping the ${currentBookings} student${currentBookings !== 1 ? 's' : ''} already booked in. ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} would be held back.`}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          className={`ml-6 shrink-0 px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
            isClosed
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {saving ? 'Saving…' : saved ? '✓ Done' : isClosed ? 'Reopen Lesson' : 'Close Lesson'}
        </button>
      </div>
    </div>
  )
}
