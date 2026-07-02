'use client'

import { useState } from 'react'
import type { Instructor } from '@/types'

export default function AssignInstructor({
  lessonId,
  currentInstructorId,
  instructors,
}: {
  lessonId: string
  currentInstructorId: string | null
  instructors: Instructor[]
}) {
  const [selected, setSelected] = useState(currentInstructorId ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/admin/lessons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lessonId, instructor_id: selected || null }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
      <h2 className="font-semibold text-slate-700 mb-4">Assign Instructor</h2>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 mb-1">Instructor</label>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alpine-600"
          >
            <option value="">— No instructor assigned —</option>
            {instructors.map(i => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.discipline})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="bg-alpine-900 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-alpine-700 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Assigning an instructor here reserves them for this lesson. They won&apos;t receive an email until the lesson reaches minimum bookings.
      </p>
    </div>
  )
}
