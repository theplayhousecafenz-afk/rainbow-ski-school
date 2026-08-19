import { createServerSupabase } from '@/lib/supabase'
import type { Enquiry } from '@/types'
import HandledButton from './handled-button'
import CopyButton from '../confirmation-letters/copy-button'

export const dynamic = 'force-dynamic'

function whenNZ(iso: string): string {
  return new Date(iso).toLocaleString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Pacific/Auckland',
  })
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: { show?: string }
}) {
  const showAll = searchParams.show === 'all'
  const supabase = createServerSupabase()

  const { data, error } = await supabase
    .from('enquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-alpine-900 mb-4">Enquiries</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="font-semibold text-amber-900 mb-2">Run this in Supabase first</p>
          <p className="text-sm text-amber-800 mb-3">
            This page needs one new column before it can track which enquiries you have dealt with.
            Paste this into the Supabase SQL Editor and run it, then reload.
          </p>
          <pre className="bg-white border border-amber-200 rounded-lg p-3 text-xs overflow-x-auto">
{`ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS handled boolean NOT NULL DEFAULT false;`}
          </pre>
          <p className="text-xs text-amber-700 mt-3">Database said: {error.message}</p>
        </div>
      </div>
    )
  }

  const all = (data ?? []) as Enquiry[]
  const outstanding = all.filter((e) => !e.handled)
  const shown = showAll ? all : outstanding

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-alpine-900">Enquiries</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Messages sent through the website contact form.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <a
            href="/admin/enquiries"
            className={`px-3 py-1.5 rounded-lg font-medium ${
              !showAll ? 'bg-alpine-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            To answer ({outstanding.length})
          </a>
          <a
            href="/admin/enquiries?show=all"
            className={`px-3 py-1.5 rounded-lg font-medium ${
              showAll ? 'bg-alpine-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            All ({all.length})
          </a>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg mb-1">
            {showAll ? 'No enquiries yet' : 'Nothing waiting on you'}
          </p>
          <p className="text-sm">
            {showAll ? 'They appear here when someone uses the contact form.' : 'Every enquiry has been dealt with.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map((e) => {
            const age = daysAgo(e.created_at)
            const stale = !e.handled && age >= 3
            return (
              <div
                key={e.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  e.handled ? 'border-slate-200 opacity-60' : stale ? 'border-red-300' : 'border-slate-200'
                }`}
              >
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {e.name || 'No name given'}
                      {e.handled && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-green-700">
                          answered
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {whenNZ(e.created_at)}
                      {!e.handled && (
                        <span className={stale ? 'text-red-600 font-semibold' : ''}>
                          {' '}· {age === 0 ? 'today' : `${age} day${age !== 1 ? 's' : ''} ago`}
                        </span>
                      )}
                    </p>
                  </div>
                  <HandledButton enquiryId={e.id} handled={e.handled ?? false} />
                </div>

                <div className="px-6 py-4">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {e.message}
                  </p>
                </div>

                <div className="px-6 py-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                  <a
                    href={`mailto:${e.email}?subject=${encodeURIComponent('Re: your Rainbow Ski School enquiry')}`}
                    className="text-sm font-semibold bg-alpine-900 text-white px-4 py-1.5 rounded-lg hover:bg-alpine-700 transition-colors"
                  >
                    Reply
                  </a>
                  <CopyButton text={e.email} label={e.email} successLabel="✓ Address copied" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
