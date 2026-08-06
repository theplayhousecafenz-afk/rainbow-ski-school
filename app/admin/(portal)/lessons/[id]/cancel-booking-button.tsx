'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CancelBookingButton({ bookingId, status }: { bookingId: string; status: string }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleCancel() {
    setLoading(true)
    const res = await fetch(`/api/admin/bookings?id=${bookingId}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      const { error } = await res.json()
      alert('Failed to cancel booking: ' + error)
    }
    setLoading(false)
    setConfirming(false)
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="text-xs font-semibold px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? 'Cancelling…' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="text-xs px-2 py-1 rounded text-slate-500 hover:text-slate-700"
        >
          Back
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs font-semibold px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50"
    >
      Cancel
    </button>
  )
}
