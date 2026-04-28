import type { Lesson, BookingAvailability } from '@/types'

// NZST = UTC+12 (ski season is NZ winter = May–Sep, no daylight saving)
// lesson.date stored as "YYYY-MM-DD" parsed as UTC midnight by JS
// Saturday (day 6 NZ) → cutoff Thursday 23:59:59 NZST = Thursday 11:59:59 UTC
// Sunday  (day 0 NZ) → cutoff Friday   23:59:59 NZST = Friday   11:59:59 UTC
// In both cases: lesson date − 2 days at 11:59:59 UTC
export function getBookingCutoff(date: Date): Date {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth()
  const d = date.getUTCDate()
  return new Date(Date.UTC(y, m, d - 2, 11, 59, 59))
}

export function canBook(lesson: Lesson, now: Date): BookingAvailability {
  const cutoff = getBookingCutoff(new Date(lesson.date))
  const isBefore = now < cutoff
  const confirmed = lesson.current_bookings >= 2
  const full = lesson.current_bookings >= lesson.max_students

  if (full) return { available: false, reason: 'full' }
  if (isBefore) return { available: true, reason: 'open' }
  if (confirmed) return { available: true, reason: 'late_booking' }
  return { available: false, reason: 'cutoff_passed' }
}

export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  return day === 0 || day === 6
}

export function getUpcomingWeekends(weeksAhead = 10): string[] {
  const dates: string[] = []
  const now = new Date()
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  for (let i = 0; i < weeksAhead * 7; i++) {
    const day = cursor.getUTCDay()
    if (day === 0 || day === 6) {
      dates.push(cursor.toISOString().slice(0, 10))
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    if (dates.length >= weeksAhead * 2) break
  }
  return dates
}

export function formatNZDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Pacific/Auckland',
  })
}

export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const period = h < 12 ? 'am' : 'pm'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')}${period}`
}
