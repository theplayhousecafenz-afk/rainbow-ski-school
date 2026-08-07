'use client'

import { useState } from 'react'

export default function RosterActions({
  lessonId,
  hasInstructor,
  instructorName,
  hasStudents,
}: {
  lessonId: string
  hasInstructor: boolean
  instructorName: string | null
  hasStudents: boolean
}) {
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function sendEmail() {
    setEmailStatus('sending')
    setErrorMsg('')
    const res = await fetch('/api/admin/lessons/roster-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId }),
    })
    const data = await res.json()
    if (!res.ok) {
      setErrorMsg(data.error ?? 'Failed to send')
      setEmailStatus('error')
    } else {
      setEmailStatus('sent')
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Email button */}
      {hasInstructor && hasStudents ? (
        <button
          onClick={sendEmail}
          disabled={emailStatus === 'sending' || emailStatus === 'sent'}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
            emailStatus === 'sent'
              ? 'bg-green-100 text-green-700'
              : emailStatus === 'error'
              ? 'bg-red-100 text-red-700'
              : 'bg-alpine-900 text-white hover:bg-alpine-700'
          }`}
        >
          {emailStatus === 'sending' ? 'Sending…'
            : emailStatus === 'sent' ? `✓ Sent to ${instructorName}`
            : emailStatus === 'error' ? `✗ ${errorMsg}`
            : `Email to ${instructorName}`}
        </button>
      ) : !hasInstructor ? (
        <span className="text-xs text-slate-400 italic">Assign an instructor to email roster</span>
      ) : (
        <span className="text-xs text-slate-400 italic">No confirmed students yet</span>
      )}

      {/* Print button */}
      <button
        onClick={() => window.print()}
        className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
      >
        🖨 Print
      </button>
    </div>
  )
}
