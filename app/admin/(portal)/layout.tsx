'use client'

import Link from 'next/link'
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
        <Link href="/admin" className="font-bold text-base mr-4">
          🎿 Admin
        </Link>
        <Link href="/admin/lessons" className="hover:text-orange-300 transition-colors">
          Lessons
        </Link>
        <Link href="/admin/instructors" className="hover:text-orange-300 transition-colors">
          Instructors
        </Link>
        <Link href="/admin/close-day" className="hover:text-orange-300 transition-colors">
          Close Day
        </Link>
        <Link href="/admin/reports" className="hover:text-orange-300 transition-colors">
          Reports
        </Link>
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
