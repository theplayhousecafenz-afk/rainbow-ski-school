'use client'

import { useState } from 'react'
import Nav from '@/components/nav'
import Footer from '@/components/footer'

type FAQItem = { q: string; a: string | React.ReactNode }
type FAQSection = { title: string; items: FAQItem[] }

const faqs: FAQSection[] = [
  {
    title: 'Bookings',
    items: [
      {
        q: 'How do I book a lesson?',
        a: 'All bookings are made online through the Rainbow Ski School booking system. Simply choose your discipline (skiing or snowboarding), preferred date, lesson type, level, and time slot, enter your details, and pay securely by card. You will receive a confirmation email once your booking is complete.',
      },
      {
        q: 'Can I book on the day?',
        a: 'It depends. New lessons require advance booking — Thursday midnight for Saturday, Friday midnight for Sunday. However, if a lesson already has 2 or more confirmed students, you can book right up until the lesson start time. Check the booking system to see which lessons still have spots available.',
      },
      {
        q: 'How far in advance can I book?',
        a: 'You can book as far in advance as you like, as soon as lesson slots are published for the season. We recommend booking early, especially for popular time slots and beginner lessons.',
      },
      {
        q: 'Can I book for multiple people in one transaction?',
        a: 'Yes. When booking you can add multiple students to the same lesson in a single transaction. Each student will need their own details entered (name, age category). This is ideal for families or groups booking together.',
      },
      {
        q: 'Is there a maximum group size?',
        a: 'Group lessons have a maximum of 8 students. Once a lesson is full, it will show as unavailable in the booking system. Private lessons are one-on-one.',
      },
      {
        q: 'What age do students need to be?',
        a: 'Our lessons are open to students aged 7 and over. We do not offer lessons for children under 7 at this stage. There is no upper age limit — we welcome adult beginners at any age.',
      },
      {
        q: 'Do I need to create an account to book?',
        a: 'No account is required. You can book as a guest using your name, email address, and phone number. You will receive all booking details and updates via email.',
      },
    ],
  },
  {
    title: 'Lessons',
    items: [
      {
        q: 'What lesson types do you offer?',
        a: (
          <div className="space-y-2">
            <p>We offer lessons for both skiers and snowboarders. Ski and snowboard lessons are run separately with their own dedicated instructors. Within each discipline we offer two formats:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-slate-600">
              <li><strong>Group Lessons (1.5 hours)</strong> — 2 to 8 students of the same discipline and level. Available at 10:30am and 1:00pm.</li>
              <li><strong>Private Lessons (1 hour)</strong> — one-on-one with a dedicated instructor. Preferred times are 9:30am and 2:30pm, though other times may be available on request.</li>
            </ul>
          </div>
        ),
      },
      {
        q: 'What levels are available?',
        a: 'We offer three levels for both skiing and snowboarding: Beginner, Intermediate, and Advanced. When booking, select your discipline first, then choose the level that best matches your current ability. If you are unsure, select Beginner — your instructor can adjust on the day.',
      },
      {
        q: 'What days do lessons run?',
        a: 'Lessons run on Saturdays and Sundays, subject to the mountain being open and minimum booking numbers being met. Lesson availability follows the Rainbow Ski Area operating schedule for the season.',
      },
      {
        q: 'What times are lessons available?',
        a: 'Group lessons run at 10:30am and 1:00pm. Private lessons are available at 9:30am and 2:30pm by preference, though other times may be arranged. All times are NZST.',
      },
      {
        q: 'Where do lessons meet?',
        a: 'All lessons meet at the Mountain Clock at Rainbow Ski Area. Your instructor will be there at the start of your lesson time. Rainbow now has cell coverage across the mountain, so your instructor can contact you directly on the morning of your lesson if there are any last-minute changes. The meeting point will also be confirmed in your booking confirmation email.',
      },
      {
        q: 'What if I have never skied or snowboarded before?',
        a: 'Perfect — our Beginner group lessons for both skiing and snowboarding are designed for first-timers. Your instructor will cover everything from getting your gear on to basic movement, stopping, and turning. No experience is necessary.',
      },
    ],
  },
  {
    title: 'Pricing & Payment',
    items: [
      {
        q: 'How much do lessons cost?',
        a: (
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li><strong>Group Lessons (1.5 hrs):</strong> $90 NZD for adults (15–65), $60 NZD for youth/children (14 and under), students, and seniors.</li>
            <li><strong>Private Lessons (1 hr):</strong> $150 NZD for all age categories.</li>
          </ul>
        ),
      },
      {
        q: 'When do I pay?',
        a: 'Payment is taken in full at the time of booking, by credit or debit card. Your lesson spot is only confirmed once payment is received.',
      },
      {
        q: 'Is my payment secure?',
        a: 'Yes. All payments are processed securely through Stripe, a globally trusted payment provider. Rainbow Ski School does not store your card details. You will receive a payment receipt by email.',
      },
      {
        q: 'Can I pay on the day or at the ticket office?',
        a: 'No. All payments must be made online in advance through the booking system. The ticket office does not handle ski school payments or enrolments.',
      },
    ],
  },
  {
    title: 'Cancellations & Refunds',
    items: [
      {
        q: 'What happens if the mountain closes due to weather?',
        a: 'If Rainbow Ski Area closes on the day of your lesson, your lesson will be cancelled and a full refund will be issued automatically to your original payment method. You do not need to contact us — the refund is triggered by the admin team and processed instantly. Allow 3–5 business days for the funds to appear, depending on your bank.',
      },
      {
        q: "What happens if there aren't enough students for my lesson to run?",
        a: "Group lessons require a minimum of 2 students. If your lesson has only 1 student at the booking cutoff (Thursday midnight for Saturday, Friday midnight for Sunday), it will be cancelled and you will be automatically refunded in full. If you would still like a lesson on the same day, contact us as soon as possible and we will do our best to arrange an alternative.",
      },
      {
        q: 'How long do refunds take?',
        a: 'Refunds are issued immediately on our end and typically appear in your account within 3–5 business days, depending on your bank or card provider.',
      },
      {
        q: 'What if my instructor cancels?',
        a: 'In the unlikely event that no instructor is available for a confirmed lesson, we will notify you as early as possible by email and SMS. A full refund will be issued automatically, or you may be offered an alternative time if one is available.',
      },
    ],
  },
  {
    title: 'Instructors',
    items: [
      {
        q: 'Who are the instructors?',
        a: 'Rainbow Ski School has dedicated pools of ski instructors and snowboard instructors — all qualified, experienced professionals. Ski instructors teach ski lessons only; snowboard instructors teach snowboard lessons only. All hold recognised teaching qualifications and are familiar with the Rainbow Ski Area terrain.',
      },
      {
        q: 'How is an instructor assigned to my lesson?',
        a: 'Once your lesson is confirmed (2+ students booked), the system automatically contacts available instructors. Your instructor will confirm their availability and you will receive a notification with their name and contact details ahead of your lesson day.',
      },
      {
        q: 'Can I request a specific instructor?',
        a: 'We will do our best to accommodate requests for specific instructors, but cannot guarantee availability. If you have a preference, contact us after booking and we will note it for scheduling.',
      },
      {
        q: 'Can I contact my instructor before the lesson?',
        a: 'Instructor contact details are included in your confirmation email once an instructor is assigned. Rainbow now has full cell coverage across the mountain, so your instructor can also reach you directly on the morning of your lesson.',
      },
    ],
  },
  {
    title: 'Gear & Preparation',
    items: [
      {
        q: 'Do I need my own skis/snowboard and boots?',
        a: 'Ski and snowboard hire (including boots) is available at Rainbow Ski Area. We recommend organising your hire gear when you arrive at the field, allowing enough time before your lesson starts. Let the hire team know you have a ski school lesson so they can fit you efficiently.',
      },
      {
        q: 'Do I need a helmet?',
        a: 'Helmets are strongly recommended and are available for hire at the field. While not compulsory for adults, they are required for students under 18 participating in ski school lessons.',
      },
      {
        q: 'What should I wear?',
        a: (
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>Warm, waterproof jacket and snow pants</li>
            <li>Thermal base layers</li>
            <li>Ski gloves or mittens</li>
            <li>Warm socks (wool or synthetic, not cotton)</li>
            <li>Helmet and goggles or sunglasses</li>
            <li>Sunscreen — UV is intense at altitude even on cloudy days</li>
          </ul>
        ),
      },
      {
        q: 'What should I bring?',
        a: (
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>Water and snacks — lessons are physically demanding</li>
            <li>A positive attitude and willingness to fall over occasionally</li>
            <li>Your booking confirmation (email on your phone is fine)</li>
          </ul>
        ),
      },
      {
        q: 'Where can I check snow conditions?',
        a: 'Check the Rainbow Ski Area website at rainbowskiarea.co.nz for daily conditions, weather updates, and lift status before heading up.',
      },
    ],
  },
  {
    title: 'Reminders & Communications',
    items: [
      {
        q: 'Will I receive a reminder before my lesson?',
        a: 'Yes. You will receive an email and SMS reminder the evening before your lesson with all the details you need: time, meeting point, instructor name, and a link to check current conditions. Make sure your phone number is correct when booking.',
      },
      {
        q: 'How will I know if my lesson is cancelled?',
        a: 'If your lesson is cancelled for any reason — weather closure, insufficient bookings, or instructor unavailability — you will be notified immediately by email and SMS. A refund will be issued at the same time. Check your spam folder if you are not receiving emails.',
      },
      {
        q: 'What if I entered the wrong contact details?',
        a: 'Contact us as soon as possible with your booking reference and we will update your details. It is important your email and phone number are correct so you receive all lesson communications.',
      },
    ],
  },
  {
    title: 'Contact & Further Information',
    items: [
      {
        q: 'How do I get in touch?',
        a: 'For general enquiries, use the contact form on our website or reach us via email. We aim to respond within 24 hours. For urgent day-of questions, your instructor is your best point of contact once assigned.',
      },
      {
        q: 'Where is Rainbow Ski Area?',
        a: "Rainbow Ski Area is located in the St Arnaud Range in the Nelson/Tasman region of New Zealand's South Island, approximately 90 minutes from Nelson city. For access and directions visit rainbowskiarea.co.nz.",
      },
      {
        q: 'Is Rainbow Ski Area a volunteer-run operation?',
        a: 'Yes. Rainbow Ski Area is a community-run ski field operated largely by volunteers. The ski school operates as a self-sustaining service within that model, offering both ski and snowboard lessons through independent contractor instructors rostered only when lessons are confirmed. We appreciate your support of this community asset.',
      },
    ],
  },
]

function AccordionItem({ q, a }: FAQItem) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-4 flex items-start justify-between gap-4 hover:text-alpine-700 transition-colors"
      >
        <span className="font-medium text-slate-800 text-sm leading-relaxed">{q}</span>
        <span className={`text-slate-400 text-lg leading-none mt-0.5 transition-transform shrink-0 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <div className="pb-4 text-sm text-slate-600 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  )
}

export default function FAQPage() {
  return (
    <>
      <Nav />
      <main className="flex-1 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-alpine-900 mb-3">Frequently Asked Questions</h1>
            <p className="text-slate-500">Everything you need to know about Rainbow Ski School lessons.</p>
          </div>

          <div className="space-y-6">
            {faqs.map((section) => (
              <div key={section.title} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-orange-500 pt-4 pb-2">
                  {section.title}
                </h2>
                {section.items.map((item) => (
                  <AccordionItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            ))}
          </div>

          <div className="mt-10 text-center bg-alpine-900 text-white rounded-2xl p-8">
            <p className="font-semibold text-lg mb-2">Still have questions?</p>
            <p className="text-slate-300 text-sm mb-5">We&apos;re happy to help. Get in touch and we&apos;ll get back to you within 24 hours.</p>
            <a
              href="/contact"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
