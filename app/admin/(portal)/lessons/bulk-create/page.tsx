'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatNZDate } from '@/lib/booking-utils'

type Discipline = 'ski' | 'snowboard'
type Level = 'first_timer' | 'beginner' | 'intermediate' | 'advanced'
type LessonType = 'group' | 'private'

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getUpcomingWeekends(weeks: number): string[] {
  const dates: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(today)
  while (dates.length < weeks * 2) {
    const day = d.getDay()
    if (day === 6 || day === 0) dates.push(toLocalDateStr(d))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

export default function BulkCreatePage() {
  const weekends = getUpcomingWeekends(12)

  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>(['ski', 'snowboard'])
  const [level, setLevel] = useState<Level>('beginner')
  const [lessonType, setLessonType] = useState<LessonType>('group')
  const [times, setTimes] = useState(['10:30', '13:00'])
  const [newTime, setNewTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped?: number } | null>(null)
  const [error, setError] = useState('')

  function toggleDate(date: string) {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    )
  }

  function toggleDiscipline(d: Discipline) {
    setDisciplines((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    )
  }

  function addTime() {
    const t = newTime.trim()
    if (!t || times.includes(t)) return
    setTimes((prev) => [...prev, t].sort())
    setNewTime('')
  }

  function removeTime(t: string) {
    setTimes((prev) => prev.filter((x) => x !== t))
  }

  // Preview count
  const totalToCreate = selectedDates.length * disciplines.length * times.length

  async function handleSubmit() {
    if (totalToCreate === 0) { setError('Please select at least one date, discipline, and time.'); return }
    setSubmitting(true)
    setError('')
    setResult(null)

    const lessons = []
    for (const date of selectedDates) {
      for (const discipline of disciplines) {
        for (const time of times) {
          lessons.push({ date, discipline, lesson_type: lessonType, level, start_time: time })
        }
      }
    }

    try {
      const res = await fetch('/api/admin/lessons/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessons }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create lessons'); return }
      setResult(data)
      setSelectedDates([])
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/lessons" className="text-sm text-slate-500 hover:text-slate-700">← Lessons</Link>
        <h1 className="text-2xl font-bold text-alpine-900">Bulk Create Lessons</h1>
      </div>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <p className="text-green-800 font-semibold">
            ✓ {result.created} lesson{result.created !== 1 ? 's' : ''} created
            {result.skipped ? ` · ${result.skipped} already existed and were skipped` : ''}
          </p>
          <button onClick={() => setResult(null)} className="text-green-600 text-sm underline">Dismiss</button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">

        {/* Left column — settings */}
        <div className="space-y-6">

          {/* Discipline */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-700 mb-3">Discipline</h2>
            <div className="flex gap-3">
              {(['ski', 'snowboard'] as Discipline[]).map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDiscipline(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    disciplines.includes(d)
                      ? 'bg-alpine-900 text-white border-alpine-900'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-alpine-600'
                  }`}
                >
                  {d === 'ski' ? '⛷️ Ski' : '🏂 Snowboard'}
                </button>
              ))}
            </div>
          </div>

          {/* Lesson type */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-700 mb-3">Lesson Type</h2>
            <div className="flex gap-3">
              {(['group', 'private'] as LessonType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setLessonType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    lessonType === t
                      ? 'bg-alpine-900 text-white border-alpine-900'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-alpine-600'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-700 mb-3">Level</h2>
            <div className="flex gap-2 flex-wrap">
              {(['first_timer', 'beginner', 'intermediate', 'advanced'] as Level[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    level === l
                      ? 'bg-alpine-900 text-white border-alpine-900'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-alpine-600'
                  }`}
                >
                  {l === 'first_timer' ? 'First Timer' : l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Times */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-700 mb-3">Times</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {times.map((t) => (
                <span key={t} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium">
                  {t}
                  <button onClick={() => removeTime(t)} className="text-slate-400 hover:text-red-500 ml-1 font-bold">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alpine-600"
              />
              <button
                onClick={addTime}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Right column — date picker */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700">Dates</h2>
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => setSelectedDates(weekends)}
                className="text-alpine-700 underline"
              >
                All
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => setSelectedDates([])}
                className="text-slate-400 underline"
              >
                None
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
            {weekends.map((date) => {
              const d = new Date(date + 'T00:00:00')
              const isSelected = selectedDates.includes(date)
              const isSat = d.getDay() === 6
              return (
                <button
                  key={date}
                  onClick={() => toggleDate(date)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    isSelected
                      ? 'bg-alpine-900 text-white'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isSat ? 'bg-blue-400' : 'bg-purple-400'}`} />
                  <span className="font-medium w-8 text-xs opacity-70">{isSat ? 'SAT' : 'SUN'}</span>
                  <span>{formatNZDate(date)}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between gap-4">
        <div className="text-sm text-slate-600">
          {totalToCreate > 0 ? (
            <span>
              Creates <strong>{totalToCreate} lessons</strong> — {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} × {disciplines.length} discipline{disciplines.length !== 1 ? 's' : ''} × {times.length} time{times.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-slate-400">Select dates, disciplines, and times above</span>
          )}
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={submitting || totalToCreate === 0}
          className="shrink-0 bg-alpine-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-alpine-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Creating…' : `Create ${totalToCreate || ''} Lessons`}
        </button>
      </div>
    </div>
  )
}
