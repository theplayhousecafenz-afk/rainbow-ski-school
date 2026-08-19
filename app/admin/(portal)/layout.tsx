'use client'

import { useRouter } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <nav className="bg-alpine-900 text-white h-14 flex items-center px-6 gap-6 text-sm font-medium shrink-0">
        <a href="/admin" className="font-bold text-base mr-4">
          🎿 Admin
        </a>
        <a href="/admin/lessons" className="hover:text-orange-300 transition-colors">
          Lessons
        </a>
        <a href="/admin/instructors" className="hover:text-orange-300 transition-colors">
          Instructors
        </a>
        <a href="/admin/day-sheet" className="hover:text-orange-300 transition-colors">
          Day Sheet
        </a>
        <a href="/admin/confirmation-letters" className="hover:text-orange-300 transition-colors">
          Letters
        </a>
        <a href="/admin/archive" className="hover:text-orange-300 transition-colors">
          Archive
        </a>
        <a href="/admin/close-day" className="hover:text-orange-300 transition-colors">
          Close Day
        </a>
        <a href="/admin/reports" className="hover:text-orange-300 transition-colors">
          Reports
        </a>
        <a href="/admin/enquiries" className="hover:text-orange-300 transition-colors">
          Enquiries
        </a>
        <a href="/admin/promos" className="hover:text-orange-300 transition-colors">
          Promo Codes
        </a>
        <div className="ml-auto">
          <button
            onClick={logout}
            className="text-slate-400 hover:text-white text-xs transition-colors"
          >
            Log out
          </button>
        </div>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
