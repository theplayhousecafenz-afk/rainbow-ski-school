import { Resend } from 'resend'
import type { Customer, Lesson, Booking, Instructor, Enquiry } from '@/types'
import { formatNZDate, formatTime } from './booking-utils'

const getResend = () => new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')
const FROM = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'snowsports@skirainbow.co.nz'
const ADMIN_EMAIL_2 = 'theplayhousecafenz@gmail.com'
const ADMIN_EMAILS = [ADMIN_EMAIL, ADMIN_EMAIL_2]
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{font-family:sans-serif;background:#f4f6fb;margin:0;padding:0}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .hdr{background:#172554;color:#fff;padding:28px 32px}
  .hdr h1{margin:0;font-size:20px;font-weight:700}
  .hdr p{margin:4px 0 0;font-size:13px;opacity:.8}
  .body{padding:28px 32px;color:#1e293b;font-size:15px;line-height:1.6}
  .btn{display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;margin:16px 0}
  .info{background:#f0f4ff;border-left:4px solid #1e3a8a;padding:14px 18px;border-radius:4px;margin:16px 0;font-size:14px}
  .footer{padding:16px 32px;background:#f8fafc;font-size:12px;color:#94a3b8;text-align:center}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th{background:#f0f4ff;text-align:left;padding:8px 12px;font-size:13px}
  td{padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:14px}
</style></head><body>
<div class="wrap">
  <div class="hdr"><h1>Rainbow Ski School</h1><p>${title}</p></div>
  <div class="body">${body}</div>
  <div class="footer">
    Rainbow Ski Area · St Arnaud, NZ · Meet at Mountain Clock<br><br>
    <strong style="color:#475569">Please do not reply to this email.</strong><br>
    For enquiries contact <a href="mailto:snowsports@skirainbow.co.nz" style="color:#1e3a8a;font-weight:600">snowsports@skirainbow.co.nz</a>
    &nbsp;·&nbsp; <a href="${BASE_URL}/faq" style="color:#1e3a8a">FAQs</a>
  </div>
</div></body></html>`
}

async function send(to: string | string[], subject: string, html: string, cc?: string, throwOnError = false) {
  try {
    const result = await getResend().emails.send({
      from: FROM,
      to,
      subject,
      html,
      ...(cc ? { cc } : {}),
    })
    if (result.error) throw new Error(result.error.message)
  } catch (err) {
    console.error('[Email] Failed to send to', to, err)
    if (throwOnError) throw err
  }
}

function lessonInfo(lesson: Lesson): string {
  return `<div class="info">
    <strong>Discipline:</strong> ${lesson.discipline.toUpperCase()}<br>
    <strong>Date:</strong> ${formatNZDate(lesson.date)}<br>
    <strong>Time:</strong> ${formatTime(lesson.start_time)}<br>
    <strong>Type:</strong> ${lesson.lesson_type.charAt(0).toUpperCase() + lesson.lesson_type.slice(1)}<br>
    <strong>Level:</strong> ${lesson.level.charAt(0).toUpperCase() + lesson.level.slice(1)}<br>
    <strong>Meeting point:</strong> Mountain Clock
  </div>`
}

// 1. Booking confirmation — lesson has only 1 student (pending minimum numbers)
export async function sendBookingPending(
  customer: Customer,
  lesson: Lesson,
  booking: Booking,
  quantity = 1
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const subject = `[${disc}] Booking received — pending confirmation`
  const studentLine = quantity > 1
    ? `<p>You have booked <strong>${quantity} students</strong> into this lesson.</p>`
    : ''
  const html = baseTemplate(
    `${disc} Lesson Booking`,
    `<p>Hi ${customer.name},</p>
    <p>Thanks for booking a <strong>${disc}</strong> lesson with Rainbow Ski School! Your payment of <strong>$${(booking.amount_paid / 100).toFixed(2)} NZD</strong> has been received.</p>
    ${studentLine}
    <p>Your lesson is currently <strong>pending minimum numbers</strong>. Once enough students have booked, the lesson will be confirmed and we'll let you know.</p>
    <p>If the lesson doesn't reach the minimum by the booking cutoff, it will be cancelled and you'll receive a full refund.</p>
    ${lessonInfo(lesson)}
    <a class="btn" href="${BASE_URL}/booking/${booking.id}">View Booking</a>`
  )
  await send(customer.email, subject, html)
}

// 2. Booking confirmation — lesson already has 2+ students (confirmed)
export async function sendBookingConfirmed(
  customer: Customer,
  lesson: Lesson,
  booking: Booking,
  quantity = 1
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const subject = `[${disc}] Booking confirmed — see you on the mountain!`
  const studentLine = quantity > 1
    ? `<p>You have booked <strong>${quantity} students</strong> into this lesson.</p>`
    : ''
  const html = baseTemplate(
    `${disc} Lesson Confirmed`,
    `<p>Hi ${customer.name},</p>
    <p>Great news — your <strong>${disc}</strong> lesson is <strong>confirmed</strong>! Payment of <strong>$${(booking.amount_paid / 100).toFixed(2)} NZD</strong> received.</p>
    ${studentLine}
    ${lessonInfo(lesson)}
    <p>Come prepared with appropriate gear. We look forward to seeing you on the snow!</p>
    <a class="btn" href="${BASE_URL}/booking/${booking.id}">View Booking</a>`
  )
  await send(customer.email, subject, html)
}

// 3. Lesson confirmed — notify existing students when lesson hits 2 bookings
export async function sendLessonConfirmedToStudents(
  customers: Customer[],
  lesson: Lesson
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const subject = `[${disc}] Great news — your lesson is confirmed!`
  for (const customer of customers) {
    const html = baseTemplate(
      `${disc} Lesson Now Confirmed`,
      `<p>Hi ${customer.name},</p>
      <p>Your <strong>${disc}</strong> lesson has reached the minimum number of students and is now <strong>confirmed</strong>. See you there!</p>
      ${lessonInfo(lesson)}`
    )
    await send(customer.email, subject, html)
  }
}

// 4. Lesson cancelled — 1 student at cutoff, with private lesson offer
export async function sendLessonCancelledInsufficientBookings(
  customer: Customer,
  lesson: Lesson,
  booking: Booking,
  privateOptions: Lesson[]
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const subject = `[${disc}] Lesson cancelled — refund issued`
  const privateSection =
    privateOptions.length > 0
      ? `<p>We do have <strong>private ${disc} lessons</strong> available on that day if you'd like to continue with your ski experience:</p>
        <table><tr><th>Time</th><th>Level</th></tr>
        ${privateOptions.map((l) => `<tr><td>${formatTime(l.start_time)}</td><td>${l.level}</td></tr>`).join('')}
        </table>
        <a class="btn" href="${BASE_URL}/book">Book a Private Lesson</a>`
      : ''
  const html = baseTemplate(
    `${disc} Lesson Cancelled`,
    `<p>Hi ${customer.name},</p>
    <p>Unfortunately your <strong>${disc}</strong> lesson on ${formatNZDate(lesson.date)} has been cancelled due to insufficient bookings.</p>
    <p>A full refund of <strong>$${(booking.amount_paid / 100).toFixed(2)} NZD</strong> has been issued to your original payment method. Please allow 5–10 business days.</p>
    ${privateSection}
    <p>We hope to see you on the mountain another time!</p>`
  )
  await send(customer.email, subject, html)
}

// 5. Mountain closure refund — admin triggers close day
export async function sendMountainClosureRefund(
  customer: Customer,
  lesson: Lesson,
  booking: Booking
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const subject = `[${disc}] Lesson cancelled — mountain closure, refund issued`
  const html = baseTemplate(
    `Mountain Closure — ${disc} Lesson`,
    `<p>Hi ${customer.name},</p>
    <p>Due to a mountain closure at Rainbow Ski Area, your <strong>${disc}</strong> lesson on ${formatNZDate(lesson.date)} has been cancelled.</p>
    <p>A full refund of <strong>$${(booking.amount_paid / 100).toFixed(2)} NZD</strong> has been issued. Please allow 5–10 business days.</p>
    <p>We're sorry for the inconvenience and hope to welcome you back to the mountain soon.</p>`
  )
  await send(customer.email, subject, html)
}

// 6a. Instructor assigned to lesson by admin
export async function sendInstructorAssigned(
  instructor: Instructor,
  lesson: Lesson
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const subject = `[${disc}] You've been assigned a lesson — ${formatNZDate(lesson.date)}`
  const html = baseTemplate(
    `${disc} Lesson — You've Been Assigned`,
    `<p>Hi ${instructor.name},</p>
    <p>You have been assigned to the following <strong>${disc}</strong> lesson by the Rainbow Ski School admin team:</p>
    ${lessonInfo(lesson)}
    <p>You'll receive another email once the lesson reaches minimum bookings and is confirmed. If you have any questions contact <a href="mailto:snowsports@skirainbow.co.nz">snowsports@skirainbow.co.nz</a>.</p>`
  )
  await send(instructor.email, subject, html)
}

// 6b. Instructor notified — lesson cancelled before minimum bookings reached
export async function sendInstructorLessonCancelled(
  instructor: Instructor,
  lesson: Lesson
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const subject = `[${disc}] Lesson cancelled — ${formatNZDate(lesson.date)}`
  const html = baseTemplate(
    `${disc} Lesson — Cancelled`,
    `<p>Hi ${instructor.name},</p>
    <p>Unfortunately the following <strong>${disc}</strong> lesson has been cancelled as it did not reach the minimum number of bookings by the cutoff time:</p>
    ${lessonInfo(lesson)}
    <p>You are no longer required for this lesson. We'll be in touch when another lesson comes up that needs you.</p>
    <p>If you have any questions contact <a href="mailto:snowsports@skirainbow.co.nz">snowsports@skirainbow.co.nz</a>.</p>`
  )
  await send(instructor.email, subject, html)
}

// 6. Instructor availability request — with confirm/decline token links
export async function sendInstructorAvailabilityRequest(
  instructor: Instructor,
  lesson: Lesson,
  confirmUrl: string,
  declineUrl: string
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const subject = `[${disc}] Availability request — ${formatNZDate(lesson.date)}`
  const html = baseTemplate(
    `${disc} Lesson — Availability Request`,
    `<p>Hi ${instructor.name},</p>
    <p>A <strong>${disc}</strong> lesson has been confirmed for the following date and we'd like to know if you're available:</p>
    ${lessonInfo(lesson)}
    <p>Please respond as soon as possible:</p>
    <a class="btn" href="${confirmUrl}" style="background:#16a34a;margin-right:8px">✓ I'm Available</a>
    <a class="btn" href="${declineUrl}" style="background:#dc2626">✗ Not Available</a>
    <p style="font-size:13px;color:#64748b;margin-top:16px">These links are unique to you. If you confirm, we'll send through full details including the student list closer to the lesson date.</p>`
  )
  await send(instructor.email, subject, html)
}

// 7. Instructor confirmed acknowledgement
export async function sendInstructorConfirmedAck(
  instructor: Instructor,
  lesson: Lesson
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const subject = `[${disc}] Confirmed — you're rostered for ${formatNZDate(lesson.date)}`
  const html = baseTemplate(
    `${disc} Lesson — Confirmed`,
    `<p>Hi ${instructor.name},</p>
    <p>Thanks for confirming! You're rostered for the following <strong>${disc}</strong> lesson:</p>
    ${lessonInfo(lesson)}
    <p>We'll send you a reminder the evening before with the full student list.</p>`
  )
  await send(instructor.email, subject, html)
}

// 8. Instructor reminder — evening before, with full student list + phones
export async function sendInstructorReminder(
  instructor: Instructor,
  lesson: Lesson,
  students: Array<{ customer: Customer; quantity: number }>
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const totalStudents = students.reduce((sum, s) => sum + s.quantity, 0)
  const subject = `[${disc}] Tomorrow's lesson reminder — ${totalStudents} student${totalStudents !== 1 ? 's' : ''}`
  const studentRows = students
    .map((s) => `<tr><td>${s.customer.name}</td><td>${s.customer.phone}</td><td>${s.customer.email}</td><td style="text-align:center">${s.quantity}</td></tr>`)
    .join('')
  const html = baseTemplate(
    `${disc} Lesson — Reminder`,
    `<p>Hi ${instructor.name},</p>
    <p>This is your reminder for tomorrow's <strong>${disc}</strong> lesson.</p>
    ${lessonInfo(lesson)}
    <h3 style="font-size:15px;margin-top:24px">Students (${totalStudents} total)</h3>
    <table><tr><th>Name</th><th>Phone</th><th>Email</th><th>Students</th></tr>${studentRows}</table>
    <p>See you on the mountain!</p>`
  )
  await send(instructor.email, subject, html)
}

// 9. Student reminder — evening before, with instructor name + phone
export async function sendStudentReminder(
  customer: Customer,
  lesson: Lesson,
  instructor: Instructor | null
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const subject = `[${disc}] Tomorrow's lesson reminder`
  const instructorSection = instructor
    ? `<div class="info">
        <strong>Your instructor:</strong> ${instructor.name}<br>
        <strong>Instructor phone:</strong> ${instructor.phone}
      </div>`
    : `<div class="info">Your instructor will be confirmed shortly — contact <a href="mailto:snowsports@skirainbow.co.nz">snowsports@skirainbow.co.nz</a> with any questions.</div>`
  const html = baseTemplate(
    `${disc} Lesson — Reminder`,
    `<p>Hi ${customer.name},</p>
    <p>This is your reminder for tomorrow's <strong>${disc}</strong> lesson!</p>
    ${lessonInfo(lesson)}
    ${instructorSection}
    <p>Please arrive a few minutes early and meet at the Mountain Clock. See you there!</p>`
  )
  await send(customer.email, subject, html)
}

// 10. New student added — notify instructor with updated headcount + student list
export async function sendNewStudentAddedNotifyInstructor(
  instructor: Instructor,
  lesson: Lesson,
  students: Array<{ customer: Customer; quantity: number }>
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const totalStudents = students.reduce((sum, s) => sum + s.quantity, 0)
  const subject = `[${disc}] New student added — now ${totalStudents}/${lesson.max_students}`
  const studentRows = students
    .map((s) => `<tr><td>${s.customer.name}</td><td>${s.customer.phone}</td><td style="text-align:center">${s.quantity}</td></tr>`)
    .join('')
  const html = baseTemplate(
    `${disc} Lesson — Student Update`,
    `<p>Hi ${instructor.name},</p>
    <p>A new booking has been added to your <strong>${disc}</strong> lesson. Updated headcount: <strong>${totalStudents}/${lesson.max_students}</strong>.</p>
    ${lessonInfo(lesson)}
    <table><tr><th>Name</th><th>Phone</th><th>Students</th></tr>${studentRows}</table>`
  )
  await send(instructor.email, subject, html)
}

// 11. Enquiry forwarded to admin
export async function sendEnquiryToAdmin(enquiry: Enquiry): Promise<void> {
  const subject = `New enquiry from ${enquiry.name}`
  const html = baseTemplate(
    'New Website Enquiry',
    `<p>A new enquiry has been submitted via the Rainbow Ski School website.</p>
    <div class="info">
      <strong>Name:</strong> ${enquiry.name}<br>
      <strong>Email:</strong> <a href="mailto:${enquiry.email}">${enquiry.email}</a><br>
      <strong>Received:</strong> ${new Date(enquiry.created_at).toLocaleString('en-NZ')}
    </div>
    <h3 style="font-size:15px">Message</h3>
    <p style="background:#f8fafc;padding:16px;border-radius:6px;white-space:pre-wrap">${enquiry.message}</p>`
  )
  await send(ADMIN_EMAIL, subject, html)
}

// Admin alert — confirmed lesson tomorrow has no instructor assigned
export async function sendAdminNoInstructorAlert(lessons: Lesson[]): Promise<void> {
  const rows = lessons
    .map((l) => {
      const disc = l.discipline.toUpperCase()
      return `<tr><td>${disc}</td><td>${formatNZDate(l.date)}</td><td>${formatTime(l.start_time)}</td><td>${l.lesson_type}</td><td>${l.current_bookings}/${l.max_students}</td></tr>`
    })
    .join('')
  const html = baseTemplate(
    'Action Required — No Instructor Assigned',
    `<p>The following lessons are running <strong>tomorrow</strong> but have no instructor assigned. Please log in and assign one urgently.</p>
    <table><tr><th>Discipline</th><th>Date</th><th>Time</th><th>Type</th><th>Bookings</th></tr>${rows}</table>
    <a class="btn" href="${BASE_URL}/admin/lessons">Open Admin</a>`
  )
  await send(ADMIN_EMAIL, 'ACTION REQUIRED: Lesson(s) tomorrow with no instructor', html)
}

// Admin notification — lesson cancelled (0 bookings at cutoff)
export async function sendAdminLessonCancelledNoBookings(lesson: Lesson): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const subject = `[${disc}] Lesson auto-cancelled — 0 bookings`
  const html = baseTemplate(
    `${disc} Lesson Auto-Cancelled`,
    `<p>A ${disc} lesson was automatically cancelled at cutoff due to zero bookings.</p>
    ${lessonInfo(lesson)}`
  )
  await send(ADMIN_EMAIL, subject, html)
}

// 12. Instructor notification — lesson just confirmed (min students reached), pre-assigned
export async function sendInstructorLessonConfirmed(
  instructor: Instructor,
  lesson: Lesson,
  students: Array<{ customer: Customer; quantity: number }>
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const totalStudents = students.reduce((sum, s) => sum + s.quantity, 0)
  const subject = `[${disc}] Your lesson is confirmed — ${totalStudents} student${totalStudents !== 1 ? 's' : ''} booked`
  const studentRows = students
    .map((s) => `<tr><td>${s.customer.name}</td><td>${s.customer.phone}</td><td>${s.customer.email}</td><td style="text-align:center">${s.quantity}</td></tr>`)
    .join('')
  const html = baseTemplate(
    `${disc} Lesson — Confirmed`,
    `<p>Hi ${instructor.name},</p>
    <p>Great news! Your assigned <strong>${disc}</strong> lesson has reached the minimum number of students and is now <strong>confirmed</strong>.</p>
    ${lessonInfo(lesson)}
    <h3 style="font-size:15px;margin-top:24px">Bookings (${totalStudents} student${totalStudents !== 1 ? 's' : ''} total)</h3>
    <table><tr><th>Name</th><th>Phone</th><th>Email</th><th>Students</th></tr>${studentRows}</table>
    <p>You'll receive a full reminder the evening before the lesson. If you have any questions, contact the ski school at <a href="mailto:snowsports@skirainbow.co.nz">snowsports@skirainbow.co.nz</a>.</p>`
  )
  await send(instructor.email, subject, html)
}

// 13. Day sheet — send instructor their lesson(s) for the day with student contacts
export async function sendDaySheetToInstructor(
  instructor: Instructor,
  lessons: Array<{
    lesson: Lesson
    students: Array<{ customer: Customer; quantity: number }>
  }>
): Promise<void> {
  const disc = instructor.discipline.toUpperCase()
  const date = formatNZDate(lessons[0].lesson.date)
  const subject = `[${disc}] Day sheet — ${date}`

  const lessonBlocks = lessons.map(({ lesson, students }) => {
    const totalStudents = students.reduce((sum, s) => sum + s.quantity, 0)
    const rows = students
      .map((s) => `<tr><td>${s.customer.name}</td><td>${s.customer.phone}</td><td>${s.customer.email}</td><td style="text-align:center">${s.quantity}</td></tr>`)
      .join('')
    return `
      <div style="margin-bottom:24px">
        ${lessonInfo(lesson)}
        <h3 style="font-size:14px;margin:12px 0 6px">Students (${totalStudents} total)</h3>
        <table><tr><th>Name</th><th>Phone</th><th>Email</th><th>Qty</th></tr>${rows}</table>
      </div>`
  }).join('<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">')

  const html = baseTemplate(
    `${disc} Day Sheet — ${date}`,
    `<p>Hi ${instructor.name},</p>
    <p>Here is your day sheet for <strong>${date}</strong>. Please find your lesson${lessons.length > 1 ? 's' : ''} and student contact details below.</p>
    ${lessonBlocks}
    <p style="margin-top:16px;font-size:13px;color:#64748b">See you on the mountain! Contact <a href="mailto:snowsports@skirainbow.co.nz">snowsports@skirainbow.co.nz</a> with any questions.</p>`
  )
  await send(instructor.email, subject, html, ADMIN_EMAIL, true)
}

// 13aa. Day sheet — send to self (admin only) with optional notes
export async function sendDaySheetToSelf(
  date: string,
  lessonGroups: Array<{
    lesson: Lesson
    instructor: Instructor | null
    students: Array<{ customer: Customer; quantity: number }>
  }>,
  notes = ''
): Promise<void> {
  const dateStr = formatNZDate(date)
  const subject = `Day Sheet — ${dateStr}`

  const notesBlock = notes.trim()
    ? `<div class="info" style="background:#fefce8;border-left-color:#ca8a04">
        <strong style="color:#92400e">📝 Notes for today:</strong><br>
        <span style="white-space:pre-wrap;color:#1e293b">${notes.trim()}</span>
      </div>`
    : ''

  const blocks = lessonGroups.map(({ lesson, instructor, students }) => {
    const totalStudents = students.reduce((sum, s) => sum + s.quantity, 0)
    const rows = students
      .map((s) => `<tr><td>${s.customer.name}</td><td>${s.customer.phone}</td><td>${s.customer.email}</td><td style="text-align:center">${s.quantity}</td></tr>`)
      .join('')
    const instrLine = instructor
      ? `<p style="margin:4px 0;font-size:14px"><strong>Instructor:</strong> ${instructor.name} · ${instructor.phone}</p>`
      : `<p style="margin:4px 0;font-size:14px;color:#dc2626"><strong>⚠️ No instructor assigned</strong></p>`
    return `
      <div style="margin-bottom:28px">
        <h3 style="font-size:15px;margin:0 0 6px;color:#172554">${lesson.discipline.toUpperCase()} · ${formatTime(lesson.start_time)} · ${lesson.lesson_type} · ${lesson.level}</h3>
        ${instrLine}
        ${totalStudents > 0
          ? `<table style="margin-top:8px"><tr><th>Name</th><th>Phone</th><th>Email</th><th>Qty</th></tr>${rows}</table>`
          : `<p style="font-size:13px;color:#94a3b8;margin:4px 0">No confirmed students.</p>`}
      </div>`
  }).join('<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">')

  const html = baseTemplate(
    `Day Sheet — ${dateStr}`,
    `${notesBlock}
    <p>Full rundown for <strong>${dateStr}</strong> (${lessonGroups.length} lesson${lessonGroups.length !== 1 ? 's' : ''}).</p>
    ${blocks}`
  )
  // Send to Gmail only until skirainbow.co.nz domain is verified in Resend
  await send(ADMIN_EMAIL_2, subject, html, undefined, true)
}

// 13a. Day sheet — send full master rundown for the day (to admin or a specific instructor)
export async function sendMasterDaySheetToAdmin(
  date: string,
  lessonGroups: Array<{
    lesson: Lesson
    instructor: Instructor | null
    students: Array<{ customer: Customer; quantity: number }>
  }>,
  recipient: Instructor | null = null  // null = send to admin email
): Promise<void> {
  const dateStr = formatNZDate(date)
  const subject = `Master Day Sheet — ${dateStr}`

  const blocks = lessonGroups.map(({ lesson, instructor, students }) => {
    const totalStudents = students.reduce((sum, s) => sum + s.quantity, 0)
    const rows = students
      .map((s) => `<tr><td>${s.customer.name}</td><td>${s.customer.phone}</td><td>${s.customer.email}</td><td style="text-align:center">${s.quantity}</td></tr>`)
      .join('')
    const instrLine = instructor
      ? `<p style="margin:4px 0;font-size:14px"><strong>Instructor:</strong> ${instructor.name} · ${instructor.phone}</p>`
      : `<p style="margin:4px 0;font-size:14px;color:#dc2626"><strong>⚠️ No instructor assigned</strong></p>`
    return `
      <div style="margin-bottom:28px">
        <h3 style="font-size:15px;margin:0 0 6px;color:#172554">${lesson.discipline.toUpperCase()} · ${formatTime(lesson.start_time)} · ${lesson.lesson_type} · ${lesson.level}</h3>
        ${instrLine}
        ${totalStudents > 0
          ? `<table style="margin-top:8px"><tr><th>Name</th><th>Phone</th><th>Email</th><th>Qty</th></tr>${rows}</table>`
          : `<p style="font-size:13px;color:#94a3b8;margin:4px 0">No confirmed students.</p>`}
      </div>`
  }).join('<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">')

  const greeting = recipient
    ? `<p>Hi ${recipient.name},</p><p>Here is the full master day sheet for <strong>${dateStr}</strong>.</p>`
    : `<p>Full rundown for <strong>${dateStr}</strong> (${lessonGroups.length} lesson${lessonGroups.length !== 1 ? 's' : ''}).</p>`

  const html = baseTemplate(
    `Master Day Sheet — ${dateStr}`,
    `${greeting}${blocks}`
  )
  // If sending to an instructor, CC both admin emails; if sending to admin, send to both directly
  await send(
    recipient ? recipient.email : ADMIN_EMAILS,
    subject,
    html,
    recipient ? ADMIN_EMAIL : undefined,
    true
  )
}

// 14. Roster email — send student contact list to instructor on demand
export async function sendRosterToInstructor(
  instructor: Instructor,
  lesson: Lesson,
  students: Array<{ customer: Customer; quantity: number }>
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const totalStudents = students.reduce((sum, s) => sum + s.quantity, 0)
  const subject = `[${disc}] Student roster — ${formatNZDate(lesson.date)} ${formatTime(lesson.start_time)}`
  const rows = students
    .map((s) => `<tr>
      <td>${s.customer.name}</td>
      <td>${s.customer.phone}</td>
      <td>${s.customer.email}</td>
      <td style="text-align:center">${s.quantity}</td>
    </tr>`)
    .join('')
  const html = baseTemplate(
    `${disc} Lesson — Student Roster`,
    `<p>Hi ${instructor.name},</p>
    <p>Here is the student contact list for your upcoming <strong>${disc}</strong> lesson.</p>
    ${lessonInfo(lesson)}
    <h3 style="font-size:15px;margin-top:24px">Students (${totalStudents} total)</h3>
    <table>
      <tr><th>Name</th><th>Phone</th><th>Email</th><th>Qty</th></tr>
      ${rows}
    </table>
    <p style="margin-top:16px;font-size:13px;color:#64748b">See you on the mountain!</p>`
  )
  await send(instructor.email, subject, html, ADMIN_EMAIL)
}

// 14. Lesson cancelled by admin — notify each confirmed student
export async function sendLessonCancelledByAdmin(
  customer: Customer,
  lesson: Lesson,
  booking: Booking
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const subject = `[${disc}] Lesson cancelled — full refund issued`
  const html = baseTemplate(
    `${disc} Lesson Cancelled`,
    `<p>Hi ${customer.name},</p>
    <p>We're sorry to let you know that your <strong>${disc}</strong> lesson on ${formatNZDate(lesson.date)} has been cancelled by Rainbow Ski School.</p>
    <p>A <strong>full refund of $${(booking.amount_paid / 100).toFixed(2)} NZD</strong> has been issued to your original payment method. Please allow 5–10 business days for it to appear.</p>
    ${lessonInfo(lesson)}
    <p>We're sorry for the inconvenience. If you'd like to book another lesson please visit our website or contact us at <a href="mailto:snowsports@skirainbow.co.nz">snowsports@skirainbow.co.nz</a>.</p>
    <a class="btn" href="${BASE_URL}/book">Browse Other Lessons</a>`
  )
  await send(customer.email, subject, html)
}

// Admin notification — lesson cancelled (1 booking at cutoff, refund issued)
export async function sendAdminLessonCancelledOneBooking(
  lesson: Lesson,
  customer: Customer
): Promise<void> {
  const disc = lesson.discipline.toUpperCase()
  const subject = `[${disc}] Lesson auto-cancelled — 1 booking, refund issued`
  const html = baseTemplate(
    `${disc} Lesson Auto-Cancelled`,
    `<p>A ${disc} lesson was automatically cancelled at cutoff with only 1 booking. A refund has been issued.</p>
    ${lessonInfo(lesson)}
    <div class="info">
      <strong>Student:</strong> ${customer.name}<br>
      <strong>Email:</strong> ${customer.email}<br>
      <strong>Phone:</strong> ${customer.phone}
    </div>`
  )
  await send(ADMIN_EMAIL, subject, html)
}
