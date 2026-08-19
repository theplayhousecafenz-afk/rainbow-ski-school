'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HandledButton({
  enquiryId,
  handled,
}: {
  enquiryId: string
  handled: boolean
}) {
  const router = useRouter()
  const [done, setDone] = useState(handled)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    const res = await fetch('/api/admin/enquiries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: enquiryId, handled: !done }),
    })
    setBusy(false)
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Update failed' }))
      alert('Could not update: ' + error)
      return
    }
    setDone(!done)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
        done
          ? 'border-slate-300 text-slate-500 hover:bg-slate-100'
          : 'border-green-600 text-green-700 hover:bg-green-50'
      }`}
    >
      {busy ? 'Saving…' : done ? 'Reopen' : 'Mark answered'}
    </button>
  )
}
