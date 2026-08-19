#!/usr/bin/env node
// Back up every table to a timestamped folder, as JSON and CSV.
//
//   npm run backup                  -> ./backups/2026-08-16T1204/
//   npm run backup -- ~/Drive/rss   -> writes into that folder instead
//
// JSON is the restorable copy; CSV is for opening in Sheets or Excel.
// Credentials come from .env.local and are never written into the backup.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const TABLES = [
  'customers',
  'bookings',
  'lessons',
  'instructors',
  'availability',
  'enquiries',
  'promo_codes',
]

function loadEnv() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) {
    console.error('No .env.local found — run this from the project folder.')
    process.exit(1)
  }
  const env = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return env
}

function toCsv(rows) {
  if (rows.length === 0) return ''
  const cols = Object.keys(rows[0])
  const cell = (v) => {
    if (v === null || v === undefined) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n')
}

const env = loadEnv()
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!key) {
  console.error('.env.local is missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// `vercel env pull` writes the literal "[SENSITIVE]" for variables marked
// sensitive, so the URL in .env.local may be a placeholder rather than the real
// value. The project reference is inside the service key itself, so derive the
// URL from that whenever what we have is not a usable https address.
function projectUrl() {
  const fromEnv = env.NEXT_PUBLIC_SUPABASE_URL
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) return fromEnv
  try {
    const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString())
    if (claims.ref) return `https://${claims.ref}.supabase.co`
  } catch {
    /* fall through to the error below */
  }
  return null
}

const url = projectUrl()
if (!url) {
  console.error('Could not work out the Supabase URL from .env.local or the service key.')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '').replace(/(\d{8})(\d{4})/, '$1-$2')
const base = process.argv[2] ? resolve(process.argv[2]) : resolve(process.cwd(), 'backups')
const dir = join(base, new Date().toISOString().slice(0, 10) + '_' + new Date().toISOString().slice(11, 16).replace(':', ''))
mkdirSync(dir, { recursive: true })

console.log('Backing up to ' + dir + '\n')

let total = 0
let failed = 0
const manifest = { takenAt: new Date().toISOString(), project: url, tables: {} }

for (const table of TABLES) {
  // Page through — Supabase caps a single select at 1000 rows.
  const rows = []
  let from = 0
  const size = 1000
  for (;;) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + size - 1)
    if (error) {
      console.log(`  ${table.padEnd(14)} FAILED — ${error.message}`)
      failed++
      break
    }
    rows.push(...data)
    if (data.length < size) break
    from += size
  }
  if (failed && rows.length === 0) continue

  writeFileSync(join(dir, `${table}.json`), JSON.stringify(rows, null, 2))
  writeFileSync(join(dir, `${table}.csv`), toCsv(rows))
  manifest.tables[table] = rows.length
  total += rows.length
  console.log(`  ${table.padEnd(14)} ${String(rows.length).padStart(5)} rows`)
}

writeFileSync(join(dir, '_manifest.json'), JSON.stringify(manifest, null, 2))

console.log(`\n${total} rows across ${Object.keys(manifest.tables).length} tables.`)
if (failed) {
  console.log(`${failed} table(s) failed — backup is INCOMPLETE.`)
  process.exit(1)
}
console.log('Backup complete.')
