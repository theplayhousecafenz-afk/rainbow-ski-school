import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <nav className="bg-alpine-900 text-white h-14 flex items-center px-6 gap-6 text-sm font-medium shrink-0">
        <Link href="/admin" className="font-bold text-base mr-4">
          🎿 Admin
        </Link>
        <Link href="/admin/lessons" className="hover:text-orange-300 transition-colors">
          Lessons
        </Link>
        <Link href="/admin/close-day" className="hover:text-orange-300 transition-colors">
          Close Day
        </Link>
        <div className="ml-auto">
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="text-slate-400 hover:text-white text-xs transition-colors">
              Log out
            </button>
          </form>
        </div>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
