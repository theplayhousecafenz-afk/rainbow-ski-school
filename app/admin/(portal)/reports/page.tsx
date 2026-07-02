'use client'

import { useState, useEffect } from 'react'
import { formatNZDate, formatTime } from '@/lib/booking-utils'
import type { Booking } from '@/types'

type AnnotatedBooking = Booking & {
  lesson: NonNullable<Booking['lesson']>
  customer: NonNullable<Booking['customer']>
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function downloadCSV(bookings: AnnotatedBooking[]) {
  const headers = ['Date', 'Discipline', 'Time', 'Type', 'Level', 'Customer', 'Email', 'Phone', 'Age Category', 'Amount Paid', 'Status', 'Booked At']
  const rows = bookings.map(b => [
    b.lesson?.date ?? '',
    b.lesson?.discipline ?? '',
    b.lesson?.start_time ? formatTime(b.lesson.start_time) : '',
    b.lesson?.lesson_type ?? '',
    b.lesson?.level ?? '',
    b.customer?.name ?? '',
    b.customer?.email ?? '',
    b.customer?.phone ?? '',
    b.customer_type === 'adult' ? 'Adult' : 'Youth/Student/Senior',
    fmt(b.amount_paid),
    b.status,
    new Date(b.created_at).toLocaleDateString('en-NZ'),
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rainbow-ski-school-bookings-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [bookings, setBookings] = useState<AnnotatedBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDiscipline, setFilterDiscipline] = useState<'all' | 'ski' | 'snowboard'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'refunded' | 'pending'>('all')

  useEffect(() => {
    fetch('/api/admin/reports')
      .then(r => r.json())
      .then(d => { setBookings(d.bookings ?? []); setLoading(false) })
  }, [])

  const filtered = bookings.filter(b => {
    if (filterDiscipline !== 'all' && b.discipline !== filterDiscipline) return false
    if (filterStatus !== 'all' && b.status !== filterStatus) return false
    return true
  })

  // Summary stats from filtered bookings
  const confirmed = filtered.filter(b => b.status === 'confirmed')
  const refunded = filtered.filter(b => b.status === 'refunded')
  const totalRevenue = confirmed.reduce((sum, b) => sum + b.amount_paid, 0)
  const totalRefunded = refunded.reduce((sum, b) => sum + b.amount_paid, 0)
  const netRevenue = totalRevenue - totalRefunded
  const skiBookings = confirmed.filter(b => b.discipline === 'ski').length
  const snowboardBookings = confirmed.filter(b => b.discipline === 'snowboard').length
  const groupBookings = confirmed.filter(b => b.lesson?.lesson_type === 'group').length
  const privateBookings = confirmed.filter(b => b.lesson?.lesson_type === 'private').length

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-alpine-900">Reports</h1>
        <button
          onClick={() => downloadCSV(filtered)}
          className="text-sm bg-alpine-900 hover:bg-alpine-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Confirmed Bookings" value={confirmed.length.toString()} />
        <StatCard label="Total Revenue" value={fmt(totalRevenue)} highlight />
        <StatCard label="Total Refunded" value={fmt(totalRefunded)} />
        <StatCard label="Net Revenue" value={fmt(netRevenue)} highlight />
        <StatCard label="Ski Bookings" value={skiBookings.toString()} />
        <StatCard label="Snowboard Bookings" value={snowboardBookings.toString()} />
        <StatCard label="Group Lessons" value={groupBookings.toString()} />
        <StatCard label="Private Lessons" value={privateBookings.toString()} />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex gap-2">
          {(['all', 'ski', 'snowboard'] as const).map(d => (
            <button
              key={d}
              onClick={() => setFilterDiscipline(d)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterDiscipline === d ? 'bg-alpine-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-alpine-600'}`}
            >
              {d === 'all' ? 'All Disciplines' : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(['all', 'confirmed', 'refunded', 'pending'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterStatus === s ? 'bg-alpine-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-alpine-600'}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-center text-slate-400 py-12 text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-sm">No bookings found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500 tracking-wide">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Discipline</th>
                  <th className="px-4 py-3 font-semibold">Time · Type</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Age Cat.</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Booked</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{b.lesson?.date ? formatNZDate(b.lesson.date) : '—'}</td>
                    <td className="px-4 py-3 capitalize">{b.discipline}</td>
                    <td className="px-4 py-3 capitalize">{b.lesson?.start_time ? formatTime(b.lesson.start_time) : '—'} · {b.lesson?.lesson_type}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{b.customer?.name}</p>
                      <p className="text-xs text-slate-400">{b.customer?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{b.customer_type === 'adult' ? 'Adult' : 'Youth/Student/Senior'}</td>
                    <td className="px-4 py-3 font-semibold text-alpine-900">{fmt(b.amount_paid)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        b.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        b.status === 'refunded' ? 'bg-red-100 text-red-700' :
                        b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(b.created_at).toLocaleDateString('en-NZ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${highlight ? 'bg-alpine-900 text-white border-alpine-900' : 'bg-white border-slate-200'}`}>
      <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${highlight ? 'text-alpine-200' : 'text-slate-500'}`}>{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-white' : 'text-alpine-900'}`}>{value}</p>
    </div>
  )
}
