import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sessionToken, safeEqual } from '@/lib/admin-session'

// Guards both the admin pages and the admin API. The API used to sit outside
// this because the matcher only covered /admin/:path* — /api/admin/... does not
// start with /admin, so every admin endpoint was reachable without logging in,
// including the ones that cancel lessons and issue refunds.
async function isAuthed(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get('admin_session')
  const password = process.env.ADMIN_PASSWORD
  if (!cookie || !password) return false
  return safeEqual(cookie.value, await sessionToken(password))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Logging in and out must stay reachable while logged out.
  if (pathname === '/api/admin/login' || pathname === '/api/admin/logout') {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/admin')) {
    if (!(await isAuthed(request))) {
      // An API caller wants an answer, not a redirect to a login page.
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!(await isAuthed(request))) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
