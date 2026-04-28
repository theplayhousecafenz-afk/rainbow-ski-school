import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export const PRICES = {
  group: {
    adult: 9000,
    youth_child_student_senior: 6000,
  },
  private: {
    adult: 15000,
    youth_child_student_senior: 15000,
  },
} as const

export function getPrice(
  lessonType: 'group' | 'private',
  customerType: 'adult' | 'youth_child_student_senior'
): number {
  return PRICES[lessonType][customerType]
}
