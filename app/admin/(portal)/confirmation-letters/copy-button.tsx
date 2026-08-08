'use client'

import { useState } from 'react'

type Style = 'default' | 'green' | 'amber'

export default function CopyButton({
  text,
  label,
  successLabel,
  style = 'default',
}: {
  text: string
  label: string
  successLabel: string
  style?: Style
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const baseClass = 'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap'

  const styleClass = copied
    ? 'bg-green-100 text-green-700 border border-green-300'
    : style === 'green'
    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
    : style === 'amber'
    ? 'bg-amber-600 text-white hover:bg-amber-700'
    : 'bg-alpine-900 text-white hover:bg-alpine-700'

  return (
    <button onClick={handleCopy} className={`${baseClass} ${styleClass}`}>
      {copied ? successLabel : label}
    </button>
  )
}
