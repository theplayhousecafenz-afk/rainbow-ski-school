import type { Lesson, BookingAvailability } from '@/types'

// Capacity of a group lesson. Held at 7 rather than 8 to keep groups a
// manageable size for instructors. Change here and every booking form,
// create route and capacity check follows.
export const GROUP_MAX_STUDENTS = 7

export function defaultMaxStudents(lessonType: 'group' | 'private'): number {
  return lessonType === 'group' ? GROUP_MAX_STUDENTS : 1
}

// Booking price tiers are the only age signal we hold — there is no date of
// birth anywhere. "Youth" is the concession tier, covering youth, child,
// student and senior, so treat it as a rough age hint rather than a fact.
export function customerTypeLabel(type: string | null | undefined): string {
  return type === 'adult' ? 'Adult' : 'Youth'
}

// "4 adult, 2 youth" — the headline instructors actually want off a day sheet.
export function studentMix(
  students: Array<{ quantity: number; customerType?: string | null }>
): string {
  let adults = 0
  let youth = 0
  for (const s of students) {
    if (s.customerType === 'adult') adults += s.quantity
    else youth += s.quantity
  }
  const parts: string[] = []
  if (adults > 0) parts.push(`${adults} adult`)
  if (youth > 0) parts.push(`${youth} youth`)
  return parts.join(', ') || 'no students'
}

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

export function canBook(lesson: Lesson, now: Date, qty = 1): BookingAvailability {
  const cutoff = getBookingCutoff(new Date(lesson.date))
  const isBefore = now < cutoff
  const minStudents = lesson.min_students ?? 2
  const confirmed = lesson.current_bookings >= minStudents
  // Block if adding qty would exceed max capacity
  const full = lesson.current_bookings + qty > lesson.max_students

  if (lesson.on_hold) return { available: false, reason: 'on_hold' }
  // Manually closed by an admin — capacity is irrelevant, no more bookings
  if (lesson.closed_to_bookings) return { available: false, reason: 'full' }
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
