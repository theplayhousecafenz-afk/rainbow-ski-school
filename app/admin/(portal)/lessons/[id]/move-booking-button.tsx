'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatNZDate, formatTime } from '@/lib/booking-utils'
import type { Lesson } from '@/types'

export default function MoveBookingButton({
  bookingId,
  customerName,
  quantity,
  currentLessonId,
  lessonType,
}: {
  bookingId: string
  customerName: string
  quantity: number
  currentLessonId: string
  lessonType: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [lessons, setLessons] = useState<Lesson[] | null>(null)
  const [selected, setSelected] = useState('')
  const [moveQty, setMoveQty] = useState(quantity)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function openPicker() {
    setOpen(true)
    setError('')
    if (lessons) return
    const res = await fetch('/api/admin/lessons?upcoming=true')
    if (!res.ok) { setError('Could not load lessons'); return }
    const { lessons: all } = await res.json()
    setLessons(all as Lesson[])
  }

  // Only somewhere these students can actually go: same price tier, still open,
  // and with room for however many are being moved.
  const options = (lessons ?? []).filter(
    (l) =>
      l.id !== currentLessonId &&
      l.lesson_type === lessonType &&
      !['cancelled', 'closed'].includes(l.status) &&
      !l.closed_to_bookings &&
      l.current_bookings + moveQty <= l.max_students
  )

  const isSplit = moveQty < quantity

  async function move() {
    if (!selected) return
    setBusy(true)
    setError('')
    const res = await fetch('/api/admin/bookings/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, targetLessonId: selected, quantity: moveQty }),
    })
    setBusy(false)
    if (!res.ok) {
      const { error: e } = await res.json().catch(() => ({ error: 'Move failed' }))
      setError(e ?? 'Move failed')
      return
    }
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={openPicker}
        className="text-xs font-semibold px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
      >
        Move
      </button>
    )
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 min-w-[22rem]">
      <p className="text-xs text-slate-600 mb-2">
        Move <strong>{customerName}</strong>&rsquo;s booking
        {quantity === 1 ? '' : ` (${quantity} students)`}:
      </p>

      {quantity > 1 && (
        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs text-slate-600">How many students?</label>
          <select
            value={moveQty}
            onChange={(e) => { setMoveQty(parseInt(e.target.value, 10)); setSelected(''); setError('') }}
            className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-alpine-600"
          >
            {Array.from({ length: quantity }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}{n === quantity ? ' (all)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {isSplit && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-2 leading-snug">
          Splits the booking: {moveQty} student{moveQty !== 1 ? 's' : ''} move,{' '}
          {quantity - moveQty} stay{quantity - moveQty === 1 ? 's' : ''} on this lesson. The
          payment is divided between them.
        </p>
      )}

      {lessons === null ? (
        <p className="text-xs text-slate-400 py-2">Loading lessons…</p>
      ) : options.length === 0 ? (
        <p className="text-xs text-amber-700 py-2">
          No other {lessonType} lesson has room for {moveQty} student{moveQty !== 1 ? 's' : ''}.
        </p>
      ) : (
        <select
          value={selected}
          onChange={(e) => { setSelected(e.target.value); setError('') }}
          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-alpine-600"
        >
          <option value="">— Choose a lesson —</option>
          {options.map((l) => (
            <option key={l.id} value={l.id}>
              {formatNZDate(l.date)} · {formatTime(l.start_time)} · {l.discipline}
              {l.level !== 'private' ? ` · ${l.level === 'first_timer' ? 'first timer' : l.level}` : ''}
              {' '}({l.current_bookings}/{l.max_students})
            </option>
          ))}
        </select>
      )}

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={move}
          disabled={busy || !selected}
          className="text-xs font-semibold px-3 py-1.5 rounded bg-alpine-900 text-white hover:bg-alpine-700 disabled:opacity-40"
        >
          {busy ? 'Moving…' : isSplit ? `Split & Move ${moveQty}` : 'Move Booking'}
        </button>
        <button
          onClick={() => { setOpen(false); setSelected(''); setMoveQty(quantity); setError('') }}
          disabled={busy}
          className="text-xs px-3 py-1.5 rounded text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </div>

      <p className="text-[11px] text-slate-400 mt-2 leading-snug">
        The payment stays with the booking — no refund, no new charge. The student
        is not emailed, so let them know yourself.
      </p>
    </div>
  )
}
