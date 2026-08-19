import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { createZip } from '@/lib/zip'

export const dynamic = 'force-dynamic'

const TABLES = [
  'customers',
  'bookings',
  'lessons',
  'instructors',
  'availability',
  'enquiries',
  'promo_codes',
] as const

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const cols = Object.keys(rows[0])
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n')
}

export async function GET() {
  const supabase = createServerSupabase()
  const files: Array<{ name: string; content: string }> = []
  const counts: Record<string, number> = {}

  for (const table of TABLES) {
    // Page through — a single select is capped at 1000 rows.
    const rows: Record<string, unknown>[] = []
    let from = 0
    const size = 1000
    for (;;) {
      const { data, error } = await supabase.from(table).select('*').range(from, from + size - 1)
      if (error) {
        return NextResponse.json(
          { error: `Backup failed reading ${table}: ${error.message}` },
          { status: 500 }
        )
      }
      rows.push(...(data as Record<string, unknown>[]))
      if (data.length < size) break
      from += size
    }
    files.push({ name: `${table}.csv`, content: toCsv(rows) })
    files.push({ name: `${table}.json`, content: JSON.stringify(rows, null, 2) })
    counts[table] = rows.length
  }

  const takenAt = new Date().toISOString()
  files.push({
    name: '_manifest.json',
    content: JSON.stringify(
      { takenAt, tables: counts, total: Object.values(counts).reduce((a, b) => a + b, 0) },
      null,
      2
    ),
  })

  const stamp = takenAt.slice(0, 16).replace('T', '_').replace(':', '')
  const zip = createZip(files)

  // Buffer -> Uint8Array so it satisfies BodyInit
  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="rainbow-ski-backup_${stamp}.zip"`,
      'Content-Length': String(zip.length),
      'Cache-Control': 'no-store',
    },
  })
}
