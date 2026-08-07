'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Instructor } from '@/types'

export default function AssignInstructor({
  lessonId,
  lessonDiscipline,
  currentInstructorId,
}: {
  lessonId: string
  lessonDiscipline: string
  currentInstructorId: string | null
}) {
  const router = useRouter()
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(currentInstructorId ?? '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Fetch fresh every mount — bypasses Next.js router cache
  useEffect(() => {
    setLoading(true)
    fetch('/api/admin/instructors')
      .then(r => r.json())
      .then(d => {
        const all: Instructor[] = d.instructors ?? []
        setInstructors(all.filter(i => i.discipline === lessonDiscipline && i.active))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [lessonDiscipline])

  async function save() {
    setSaving(true)
    setStatus('idle')
    setErrorMsg('')

    const res = await fetch('/api/admin/lessons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lessonId, instructor_id: selected || null }),
    })

    setSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setStatus('error')
      setErrorMsg(data.error ?? `Server error (${res.status})`)
      return
    }

    setStatus('saved')
    // Bust the router cache so roster and lesson detail reflect the new instructor
    router.refresh()
    setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
      <h2 className="font-semibold text-slate-700 mb-4">Assign Instructor</h2>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Instructor
            {loading && <span className="ml-2 text-slate-400 font-normal">Loading…</span>}
          </label>
          <select
            value={selected}
            onChange={e => { setSelected(e.target.value); setStatus('idle') }}
            disabled={loading}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alpine-600 disabled:opacity-50"
          >
            <option value="">— No instructor assigned —</option>
            {instructors.map(i => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>

          {!loading && instructors.length === 0 && (
            <p className="text-xs text-orange-600 mt-1">
              No active {lessonDiscipline} instructors found. Add one in the Instructors page.
            </p>
          )}
        </div>

        <button
          onClick={save}
          disabled={saving || loading}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
            status === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-alpine-900 text-white hover:bg-alpine-700'
          }`}
        >
          {saving ? 'Saving…' : status === 'saved' ? '✓ Saved' : status === 'error' ? '✗ Failed' : 'Save'}
        </button>
      </div>

      {status === 'error' && errorMsg && (
        <p className="text-xs text-red-600 mt-2">Error: {errorMsg}</p>
      )}

      <p className="text-xs text-slate-400 mt-2">
        The instructor will receive an email immediately when assigned.
      </p>
    </div>
  )
}
