'use client'

import { useState, useEffect } from 'react'
import type { Instructor, Discipline } from '@/types'

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  discipline: 'ski' as Discipline,
  qualifications: '',
}

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/instructors')
    const data = await res.json()
    setInstructors(data.instructors ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
  }

  function openEdit(inst: Instructor) {
    setEditingId(inst.id)
    setForm({
      name: inst.name,
      email: inst.email,
      phone: inst.phone,
      discipline: inst.discipline,
      qualifications: inst.qualifications ?? '',
    })
    setError('')
    setShowForm(true)
  }

  function cancel() {
    setShowForm(false)
    setEditingId(null)
    setError('')
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const method = editingId ? 'PATCH' : 'POST'
      const body = editingId ? { id: editingId, ...form } : form
      const res = await fetch('/api/admin/instructors', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      setShowForm(false)
      setEditingId(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(inst: Instructor) {
    await fetch('/api/admin/instructors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: inst.id, active: !inst.active }),
    })
    await load()
  }

  async function remove(inst: Instructor) {
    if (!confirm(`Delete ${inst.name}? This cannot be undone.`)) return
    await fetch(`/api/admin/instructors?id=${inst.id}`, { method: 'DELETE' })
    await load()
  }

  const ski = instructors.filter((i) => i.discipline === 'ski')
  const snowboard = instructors.filter((i) => i.discipline === 'snowboard')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-alpine-900">Instructors</h1>
        <button
          onClick={openCreate}
          className="bg-alpine-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-alpine-700 transition-colors"
        >
          + Add Instructor
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-alpine-900 mb-4">
              {editingId ? 'Edit Instructor' : 'New Instructor'}
            </h2>
            <form onSubmit={save} className="space-y-4">
              <Field label="Full Name">
                <input
                  required
                  className={inp}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jane Smith"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  required
                  className={inp}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jane@example.com"
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  className={inp}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+64 21 000 0000"
                />
              </Field>
              <Field label="Discipline">
                <select
                  className={inp}
                  value={form.discipline}
                  onChange={(e) => setForm({ ...form, discipline: e.target.value as Discipline })}
                >
                  <option value="ski">Skiing</option>
                  <option value="snowboard">Snowboarding</option>
                </select>
              </Field>
              <Field label="Qualifications (optional)">
                <input
                  className={inp}
                  value={form.qualifications}
                  onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
                  placeholder="e.g. NZSIA Level 2"
                />
              </Field>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-alpine-900 text-white font-semibold py-2 rounded-lg hover:bg-alpine-700 transition-colors disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  className="flex-1 border border-slate-300 text-slate-600 font-semibold py-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : (
        <div className="space-y-8">
          {[
            { label: '⛷️ Ski Instructors', list: ski },
            { label: '🏂 Snowboard Instructors', list: snowboard },
          ].map(({ label, list }) => (
            <section key={label}>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">{label}</h2>
              {list.length === 0 ? (
                <p className="text-slate-400 text-sm italic">None added yet.</p>
              ) : (
                <div className="space-y-2">
                  {list.map((inst) => (
                    <div
                      key={inst.id}
                      className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{inst.name}</span>
                          {!inst.active && (
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inactive</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {inst.email}
                          {inst.phone ? ` · ${inst.phone}` : ''}
                          {inst.qualifications ? ` · ${inst.qualifications}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleActive(inst)}
                          className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                            inst.active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {inst.active ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => openEdit(inst)}
                          className="text-xs text-alpine-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(inst)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alpine-600'
