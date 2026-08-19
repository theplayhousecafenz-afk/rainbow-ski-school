'use client'

import { useState } from 'react'

export default function BackupButton() {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function download() {
    setState('working')
    setMessage('')
    try {
      const res = await fetch('/api/admin/backup')
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: `Server error (${res.status})` }))
        setState('error')
        setMessage(error ?? 'Backup failed')
        return
      }
      const blob = await res.blob()
      const name =
        res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ??
        'rainbow-ski-backup.zip'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setState('done')
      setMessage(name)
      setTimeout(() => setState('idle'), 8000)
    } catch {
      setState('error')
      setMessage('Could not reach the server')
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">Back up the database</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {state === 'done'
            ? `Downloaded ${message} — now drag it into your Google Drive backups folder.`
            : state === 'error'
              ? message
              : 'Downloads every booking, customer and lesson as a zip. Save it to Google Drive.'}
        </p>
      </div>
      <button
        onClick={download}
        disabled={state === 'working'}
        className={`shrink-0 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60 ${
          state === 'done'
            ? 'bg-green-100 text-green-800 border border-green-300'
            : state === 'error'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-alpine-900 text-white hover:bg-alpine-700'
        }`}
      >
        {state === 'working'
          ? 'Preparing…'
          : state === 'done'
            ? '✓ Downloaded'
            : state === 'error'
              ? 'Try again'
              : '⬇ Download Backup'}
      </button>
    </div>
  )
}
