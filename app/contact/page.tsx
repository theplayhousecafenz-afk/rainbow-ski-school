'use client'

import { useState } from 'react'
import Nav from '@/components/nav'
import Footer from '@/components/footer'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setStatus('sent')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <Nav />
      <main className="flex-1 bg-slate-50">
        <div className="max-w-xl mx-auto px-4 py-16">
          <h1 className="text-3xl font-bold text-alpine-900 mb-2">Get in Touch</h1>
          <p className="text-slate-500 mb-10">
            Questions about lessons, gear, or the mountain? We&apos;d love to hear from you.
          </p>

          {status === 'sent' ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">✓</div>
              <h2 className="font-bold text-green-800 text-lg mb-1">Message sent!</h2>
              <p className="text-green-700 text-sm">
                We&apos;ll get back to you as soon as we can.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alpine-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alpine-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-alpine-600 resize-none"
                />
              </div>
              {status === 'error' && (
                <p className="text-red-600 text-sm">Something went wrong. Please try again.</p>
              )}
              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full bg-alpine-900 hover:bg-alpine-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
              >
                {status === 'sending' ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
