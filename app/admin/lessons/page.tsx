'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatNZDate, formatTime } from '@/lib/booking-utils'
import type { Lesson, Discipline, LessonType, LessonLevel } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  instructor_confirmed: 'bg-blue-100 text-blue-800',
  active: 'bg-blue-200 text-blue-900',
  cancelled: 'bg-red-100 text-red-700',
  closed: 'bg-slate-100 text-slate-500',
}

type CreateForm = {
  date: string
  discipline: Discipline
  lesson_type: LessonType
  start_time: string
  level: LessonLevel
}

const EMPTY_FORM: CreateForm = {
  date: '',
  discipline: 'ski',
  lesson_type: 'group',
  start_time: '10:30',
  level: 'beginner',
}

export default function AdminLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [filter, setFilter] = useState<'all' | 'ski' | 'snowboard'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadLessons = useCallback(async () => {
    const res = await fetch(
      `/api/admin/lessons${filter !== 'all' ? `?discipline=${filter}` : ''}`
    )
    if (res.ok) {
      const data = await res.json()
      setLessons(data.lessons)
    }
  }, [filter])

  useEffect(() => { loadLessons() }, [loadLessons])

  const defaultTime = form.lesson_type === 'group' ? '10:30' : '09:30'

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        max_students: form.lesson_type === 'group' ? 8 : 1,
        min_students: form.lesson_type === 'group' ? 2 : 1,
      }),
    })
    if (res.ok) {
      setShowCreate(false)
      setForm(EMPTY_FORM)
      loadLessons()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to create lesson')
    }
    setSaving(false)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-alpine-900">Lessons</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
        >
          + New Lesson
        </button>
      </div>

      {/* Discipline filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'ski', 'snowboard'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === tab
                ? 'bg-alpine-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-alpine-600'
            }`}
          >
            {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm"
        >
          <h2 className="font-semibold text-slate-700 mb-4">New Lesson</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Date">
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={input}
              />
            </Field>
            <Field label="Discipline">
              <select
                value={form.discipline}
                onChange={(e) => setForm({ ...form, discipline: e.target.value as Discipline })}
                className={input}
              >
                <option value="ski">Skiing</option>
                <option value="snowboard">Snowboarding</option>
              </select>
            </Field>
            <Field label="Type">
              <select
                value={form.lesson_type}
                onChange={(e) => {
                  const t = e.target.value as LessonType
                  setForm({ ...form, lesson_type: t, start_time: t === 'group' ? '10:30' : '09:30' })
                }}
                className={input}
              >
                <option value="group">Group</option>
                <option value="private">Private</option>
              </select>
            </Field>
            <Field label="Start Time">
              <input
                type="time"
                required
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className={input}
              />
            </Field>
            <Field label="Level">
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value as LessonLevel })}
                className={input}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </Field>
          </div>
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
          <div className="flex gap-3 mt-5">
            <button
              type="submit"
              disabled={saving}
              className="bg-alpine-900 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setError('') }}
              className="text-slate-500 text-sm px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Lessons table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {lessons.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-sm">No lessons found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500 tracking-wide">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Discipline</th>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Type · Level</th>
                <th className="px-4 py-3 font-semibold">Bookings</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((lesson) => (
                <tr key={lesson.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/lessons/${lesson.id}`} className="text-alpine-800 font-medium hover:underline">
                      {formatNZDate(lesson.date)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{lesson.discipline}</td>
                  <td className="px-4 py-3">{formatTime(lesson.start_time)}</td>
                  <td className="px-4 py-3 capitalize">{lesson.lesson_type} · {lesson.level}</td>
                  <td className="px-4 py-3">{lesson.current_bookings}/{lesson.max_students}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[lesson.status]}`}>
                      {lesson.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const input = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alpine-600'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
