import Link from 'next/link'

export default function Nav() {
  return (
    <nav className="bg-alpine-900 text-white">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">
          Rainbow Ski School
        </Link>
        <div className="flex gap-6 text-sm font-medium">
          <Link href="/book" className="hover:text-orange-400 transition-colors">
            Book a Lesson
          </Link>
          <Link href="/contact" className="hover:text-orange-400 transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </nav>
  )
}
