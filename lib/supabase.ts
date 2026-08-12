import { createClient } from '@supabase/supabase-js'

// Next.js patches the global fetch and stores GET responses in its Data Cache.
// supabase-js calls that patched fetch, so server-rendered pages could return
// rows captured minutes earlier — a booking moved between lessons still showed
// on its old lesson, and marking the route force-dynamic did not help because
// the route re-rendered from cached fetch data.
//
// Admin screens decide who turns up to a lesson, so every server-side read has
// to reach the database. Opting out here covers every caller at once: lesson
// detail, roster, day sheet, letters, overview, archive and the API routes.
export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  )
}

export function createBrowserSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
