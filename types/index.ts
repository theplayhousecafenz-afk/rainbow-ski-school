export type Discipline = 'ski' | 'snowboard'
export type LessonType = 'group' | 'private'
export type LessonLevel = 'beginner' | 'intermediate' | 'advanced'
export type LessonStatus =
  | 'pending'
  | 'confirmed'
  | 'instructor_confirmed'
  | 'active'
  | 'cancelled'
  | 'closed'
export type CustomerType = 'adult' | 'youth_child_student_senior'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded'
export type AvailabilityResponse = 'pending' | 'confirmed' | 'declined'

export interface Instructor {
  id: string
  name: string
  email: string
  phone: string
  discipline: Discipline
  qualifications: string | null
  active: boolean
  created_at: string
}

export interface Lesson {
  id: string
  date: string
  start_time: string
  discipline: Discipline
  lesson_type: LessonType
  level: LessonLevel
  max_students: number
  min_students: number
  current_bookings: number
  instructor_id: string | null
  instructor_confirmed: boolean
  status: LessonStatus
  created_at: string
  instructor?: Instructor | null
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  created_at: string
}

export interface Booking {
  id: string
  lesson_id: string
  customer_id: string
  discipline: Discipline
  customer_type: CustomerType
  amount_paid: number
  stripe_payment_intent_id: string
  stripe_refund_id: string | null
  status: BookingStatus
  created_at: string
  lesson?: Lesson
  customer?: Customer
}

export interface Availability {
  id: string
  instructor_id: string
  lesson_id: string
  response: AvailabilityResponse
  response_token: string
  responded_at: string | null
  created_at: string
  instructor?: Instructor
  lesson?: Lesson
}

export interface Enquiry {
  id: string
  name: string
  email: string
  message: string
  auto_reply_sent: boolean
  created_at: string
}

export type BookingAvailability =
  | { available: true; reason: 'open' | 'late_booking' }
  | { available: false; reason: 'full' | 'cutoff_passed' }
