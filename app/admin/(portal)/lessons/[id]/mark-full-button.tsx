'use client'

import { useState } from 'react'

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
  const defaultMax = lessonType === 'group' ? 8 : 1
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

  // If no bookings yet, nothing to anchor max_students to — hide button
  if (!isFull && currentBookings === 0) return null

  return (
    <div className={`rounded-2xl border shadow-sm p-6 mb-6 ${isFull ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`font-semibold mb-1 ${isFull ? 'text-red-800' : 'text-slate-700'}`}>
            {isFull ? '🚫 Lesson Marked Full' : 'Mark Lesson Full'}
          </h2>
          <p className="text-sm text-slate-500">
            {isFull
              ? `New bookings are blocked — lesson is set to ${currentBookings}/${currentBookings}. Remove to reopen spots.`
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
          {saving ? 'Saving…' : saved ? '✓ Done' : isFull ? 'Reopen Spots' : 'Mark as Full'}
        </button>
      </div>
    </div>
  )
}
