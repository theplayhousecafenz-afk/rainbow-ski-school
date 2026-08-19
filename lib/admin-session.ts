// The admin session cookie used to be btoa(ADMIN_PASSWORD) — base64, which is
// an encoding rather than a secret. Anyone who saw the cookie could decode it
// straight back into the password, and people reuse passwords elsewhere.
//
// It is now a SHA-256 of the password with an app-specific salt, so the cookie
// still proves you logged in but cannot be turned back into the password. Same
// derivation runs in the login route (Node) and the middleware (Edge), both of
// which have Web Crypto available.

const SALT = 'rainbow-ski-admin-session:v1'

export async function sessionToken(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${SALT}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Compare without leaking how much of the token matched via timing.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
