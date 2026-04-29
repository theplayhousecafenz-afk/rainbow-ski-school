import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'

const PRICING = [
  {
    type: 'Group Lesson',
    duration: '1.5 hours',
    times: '10:30am or 1:00pm',
    adult: '$90',
    concession: '$60',
  },
  {
    type: 'Private Lesson',
    duration: 'per hour',
    times: '9:30am or 2:30pm',
    adult: '$150',
    concession: '$150',
  },
]

const LEVELS = ['Beginner', 'Intermediate', 'Advanced']

export default function HomePage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-alpine-900 via-alpine-700 to-blue-800 text-white py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-orange-400 font-semibold text-sm uppercase tracking-widest mb-3">
              Rainbow Ski Area · St Arnaud, NZ
            </p>
            <h1 className="text-5xl font-extrabold mb-6 leading-tight">
              Rainbow Ski School
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10">
              Ski and snowboard lessons every weekend — from first turns to full-send shredders. All levels welcome.
            </p>
            <Link
              href="/book"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-4 rounded-xl text-lg transition-colors shadow-lg"
            >
              Book a Lesson
            </Link>
          </div>
        </section>

        {/* Disciplines */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-3 text-alpine-800">
              Choose Your Discipline
            </h2>
            <p className="text-center text-slate-500 mb-12">
              Ski and snowboard lessons run separately with dedicated instructor pools.
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  name: 'Skiing',
                  icon: '⛷️',
                  desc: 'Carve down groomed runs with our certified ski instructors. Groups are ski-only, taught by ski specialists.',
                  color: 'from-blue-600 to-blue-800',
                },
                {
                  name: 'Snowboarding',
                  icon: '🏂',
                  desc: "Learn to ride with our dedicated snowboard coaches. Snowboard lessons run their own groups and roster.",
                  color: 'from-purple-600 to-purple-900',
                },
              ].map((d) => (
                <div
                  key={d.name}
                  className={`rounded-2xl bg-gradient-to-br ${d.color} text-white p-8 shadow-xl`}
                >
                  <div className="text-5xl mb-4">{d.icon}</div>
                  <h3 className="text-2xl font-bold mb-3">{d.name}</h3>
                  <p className="text-blue-100 text-sm leading-relaxed mb-6">{d.desc}</p>
                  <Link
                    href={`/book?discipline=${d.name.toLowerCase()}`}
                    className="inline-block bg-white text-slate-900 font-semibold px-6 py-2 rounded-lg text-sm hover:bg-orange-50 transition-colors"
                  >
                    Book {d.name} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 px-4 bg-slate-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-3 text-alpine-800">Pricing</h2>
            <p className="text-center text-slate-500 mb-3">
              Same rates for skiing and snowboarding · All prices in NZD
            </p>
            <p className="text-center text-slate-400 text-sm mb-12">
              Concession rate applies to: Youth &amp; Children (14 &amp; under), Students, Seniors
            </p>
            <div className="overflow-hidden rounded-2xl shadow-sm border border-slate-200">
              <table className="w-full bg-white">
                <thead>
                  <tr className="bg-alpine-900 text-white text-sm">
                    <th className="text-left px-6 py-4 font-semibold">Lesson Type</th>
                    <th className="text-left px-6 py-4 font-semibold">Duration</th>
                    <th className="text-left px-6 py-4 font-semibold">Times</th>
                    <th className="text-right px-6 py-4 font-semibold">Adult (15–65)</th>
                    <th className="text-right px-6 py-4 font-semibold">Concession</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICING.map((row, i) => (
                    <tr key={row.type} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-6 py-5 font-semibold text-slate-800">{row.type}</td>
                      <td className="px-6 py-5 text-slate-600 text-sm">{row.duration}</td>
                      <td className="px-6 py-5 text-slate-600 text-sm">{row.times}</td>
                      <td className="px-6 py-5 text-right font-bold text-alpine-800">{row.adult}</td>
                      <td className="px-6 py-5 text-right font-bold text-alpine-800">{row.concession}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-center text-slate-400 text-xs mt-4">
              Minimum age 7 years · Maximum 8 students per group lesson · Meeting point: Mountain Clock
            </p>
          </div>
        </section>

        {/* Levels & info */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-alpine-800">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '1',
                  title: 'Choose & Book',
                  body: 'Select your discipline, date, lesson type, and level. Pay securely online.',
                },
                {
                  step: '2',
                  title: 'Get Confirmed',
                  body: 'Group lessons confirm once they reach 2 students. Private lessons confirm immediately.',
                },
                {
                  step: '3',
                  title: 'Hit the Snow',
                  body: 'Meet your instructor at the Mountain Clock on the day. Dress warm and have fun!',
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-alpine-800">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-16 grid md:grid-cols-3 gap-6">
              {LEVELS.map((level) => (
                <div key={level} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <h3 className="font-bold text-alpine-800 mb-2">{level}</h3>
                  <p className="text-slate-500 text-sm">
                    {level === 'Beginner' && 'Never been on snow? No worries — start here.'}
                    {level === 'Intermediate' && "You can get down a blue run. Ready to improve technique."}
                    {level === 'Advanced' && 'Confident on blacks and looking to refine your skills.'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Booking window notice */}
        <section className="py-12 px-4 bg-blue-50 border-t border-b border-blue-100">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-alpine-800 font-semibold mb-2">Booking Deadlines</p>
            <p className="text-slate-600 text-sm">
              Saturday lessons close <strong>Thursday midnight NZST</strong> ·{' '}
              Sunday lessons close <strong>Friday midnight NZST</strong>
            </p>
            <p className="text-slate-500 text-xs mt-2">
              Once a lesson reaches 2 confirmed bookings it stays open right up until lesson start time (max 8 students).
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 bg-alpine-900 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to ride?</h2>
          <p className="text-blue-200 mb-8 max-w-xl mx-auto">
            Book your lesson online in minutes. Lessons every Saturday and Sunday — skiing and snowboarding.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/book"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-xl transition-colors"
            >
              Book Now
            </Link>
            <Link
              href="/contact"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3 rounded-xl transition-colors border border-white/20"
            >
              Get in Touch
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
