'use client'

import { useState, useEffect, useCallback } from 'react'

type PromoCode = {
  id: string
  code: string
  discount_percent: number
  max_uses: number
  current_uses: number
  expires_at: string
  active: boolean
  created_at: string
}

export default function PromosPage() {
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ code: '', discount_percent: 10, max_uses: 50, expires_at: '2026-10-01' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/promos')
    if (res.ok) {
      const data = await res.json()
      setPromos(data.promos)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/promos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, code: form.code.toUpperCase().trim() }),
    })
    if (res.ok) {
      setShowCreate(false)
      setForm({ code: '', discount_percent: 10, max_uses: 50, expires_at: '2026-10-01' })
      load()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to create')
    }
    setSaving(false)
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch('/api/admin/promos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    })
    load()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-alpine-900">Promo Codes</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          + New Code
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-4">New Promo Code</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Code">
              <input
                required
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className={inp}
                placeholder="RAINBOW10"
              />
            </Field>
            <Field label="Discount %">
              <input
                type="number"
                required
                min={1}
                max={100}
                value={form.discount_percent}
                onChange={e => setForm({ ...form, discount_percent: parseInt(e.target.value) })}
                className={inp}
              />
            </Field>
            <Field label="Max Uses">
              <input
                type="number"
                required
                min={1}
                value={form.max_uses}
                onChange={e => setForm({ ...form, max_uses: parseInt(e.target.value) })}
                className={inp}
              />
            </Field>
            <Field label="Expires">
              <input
                type="date"
                required
                value={form.expires_at}
                onChange={e => setForm({ ...form, expires_at: e.target.value })}
                className={inp}
              />
            </Field>
          </div>
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
          <div className="flex gap-3 mt-5">
            <button type="submit" disabled={saving} className="bg-alpine-900 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); setError('') }} className="text-slate-500 text-sm px-4 py-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-center text-slate-400 py-12 text-sm">Loading…</p>
        ) : promos.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-sm">No promo codes yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500 tracking-wide">
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Discount</th>
                <th className="px-4 py-3 font-semibold">Uses</th>
                <th className="px-4 py-3 font-semibold">Expires</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {promos.map(p => {
                const expired = new Date(p.expires_at) < new Date()
                const exhausted = p.current_uses >= p.max_uses
                return (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-alpine-900">{p.code}</td>
                    <td className="px-4 py-3 font-semibold">{p.discount_percent}% off</td>
                    <td className="px-4 py-3">{p.current_uses} / {p.max_uses}</td>
                    <td className="px-4 py-3">{new Date(p.expires_at).toLocaleDateString('en-NZ')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        !p.active || expired || exhausted
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {!p.active ? 'Disabled' : expired ? 'Expired' : exhausted ? 'Exhausted' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(p.id, p.active)}
                        className="text-xs text-slate-500 hover:text-slate-800 underline"
                      >
                        {p.active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alpine-600'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
