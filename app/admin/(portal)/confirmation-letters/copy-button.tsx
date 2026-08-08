'use client'

import { useState } from 'react'

export default function CopyButton({ text, email }: { text: string; email: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Quick-open mailto link */}
      <a
        href={`mailto:${email}?subject=Your Rainbow Ski School Lesson`}
        className="text-xs text-alpine-700 hover:underline font-medium"
        title="Open in email client"
      >
        ✉️ Open in Mail
      </a>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
          copied
            ? 'bg-green-100 text-green-700 border border-green-300'
            : 'bg-alpine-900 text-white hover:bg-alpine-700'
        }`}
      >
        {copied ? '✓ Copied!' : '📋 Copy Letter'}
      </button>
    </div>
  )
}
