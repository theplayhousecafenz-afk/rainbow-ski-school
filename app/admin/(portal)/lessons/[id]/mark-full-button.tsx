'use client'

import { useState } from 'react'
import { defaultMaxStudents } from '@/lib/booking-utils'

export default function MarkFullButton({
  lessonId,
  currentBookings,
  maxStudents,
  lessonType,
}: {
  lessonId: string
  currentBookings: number
  maxStudents: number
  lessonType: string
}) {
  const defaultMax = defaultMaxStudents(lessonType as 'group' | 'private')
  // Lesson is "manually full" when max_students has been reduced below default
  const [isFull, setIsFull] = useState(maxStudents < defaultMax)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function toggle() {
    setSaving(true)
    setSaved(false)
    const newMax = isFull ? defaultMax : currentBookings
    const res = await fetch('/api/admin/lessons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lessonId, max_students: newMax }),
    })
    setSaving(false)
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
      alert(`Failed to update lesson: ${error ?? res.statusText}`)
      return
    }
    setIsFull(!isFull)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Don't show for private lessons — they're always 1 person anyway
  if (lessonType === 'private') return null

  // If already naturally full, no need to manually mark it
  if (!isFull && currentBookings >= defaultMax) return null

  return (
    <div className={`rounded-2xl border shadow-sm p-6 mb-6 ${isFull ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`font-semibold mb-1 ${isFull ? 'text-red-800' : 'text-slate-700'}`}>
            {isFull
              ? currentBookings === 0
                ? '🚫 Lesson Closed'
                : '🚫 Lesson Marked Full'
              : currentBookings === 0
                ? 'Close This Lesson'
                : 'Mark Lesson Full'}
          </h2>
          <p className="text-sm text-slate-500">
            {isFull
              ? currentBookings === 0
                ? 'Closed to new bookings — nobody is booked in. Reopen to put it back on sale.'
                : `New bookings are blocked — lesson is set to ${currentBookings}/${currentBookings}. Reopen to free up spots.`
              : currentBookings === 0
                ? 'Take this lesson off the public booking page. Nobody is booked in, so no one is affected.'
                : `Manually close this lesson to new bookings even though it has ${defaultMax - currentBookings} spot${defaultMax - currentBookings !== 1 ? 's' : ''} remaining.`}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          className={`ml-6 shrink-0 px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
            isFull
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {saving
            ? 'Saving…'
            : saved
              ? '✓ Done'
              : isFull
                ? currentBookings === 0 ? 'Reopen Lesson' : 'Reopen Spots'
                : currentBookings === 0 ? 'Close Lesson' : 'Mark as Full'}
        </button>
      </div>
    </div>
  )
}
