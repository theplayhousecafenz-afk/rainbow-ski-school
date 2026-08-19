import { NextRequest, NextResponse } from 'next/server'
import { sessionToken, safeEqual } from '@/lib/admin-session'

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  const expected = process.env.ADMIN_PASSWORD

  if (!password || !expected || !safeEqual(String(password), expected)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('admin_session', await sessionToken(expected), {
    httpOnly: true,
    // Only send over HTTPS in production; local dev runs on plain http.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return response
}
