import type { Customer, Lesson, Instructor } from '@/types'
import { formatNZDate, formatTime } from './booking-utils'

function twilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER
  if (!sid || !token || !from) return null
  const twilio = require('twilio') /* eslint-disable-line */
  return { client: twilio(sid, token) as ReturnType<typeof twilio>, from }
}

async function send(to: string, body: string): Promise<void> {
  const t = twilioClient()
  if (!t) {
    console.warn('[SMS] Twilio credentials not configured — skipping SMS to', to)
    return
  }
  try {
    await t.client.messages.create({ body, from: t.from, to })
  } catch (err) {
    console.error('[SMS] Failed to send to', to, err)
  }
}

export async function sendStudentReminderSMS(
  customer: Customer,
  lesson: Lesson,
  instructor: Instructor
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const body =
    `[Rainbow Ski School – ${disc}] Reminder: your lesson is tomorrow ` +
    `${formatNZDate(lesson.date)} at ${formatTime(lesson.start_time)}. ` +
    `Meet at Mountain Clock. Instructor: ${instructor.name} (${instructor.phone}).`
  await send(customer.phone, body)
}

export async function sendInstructorReminderSMS(
  instructor: Instructor,
  lesson: Lesson,
  students: Customer[]
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const studentList = students.map((s) => `${s.name} ${s.phone}`).join(', ')
  const body =
    `[Rainbow Ski School – ${disc}] Reminder: you have a ${lesson.lesson_type} ` +
    `lesson tomorrow ${formatNZDate(lesson.date)} at ${formatTime(lesson.start_time)}. ` +
    `Students (${students.length}): ${studentList}.`
  await send(instructor.phone, body)
}

export async function sendMountainClosureSMS(
  customer: Customer,
  lesson: Lesson
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const body =
    `[Rainbow Ski School – ${disc}] Rainbow Ski Area is closed on ` +
    `${formatNZDate(lesson.date)}. Your booking has been cancelled and a full ` +
    `refund has been issued. We're sorry for the inconvenience.`
  await send(customer.phone, body)
}
