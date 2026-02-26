const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

const attempts = new Map<string, { count: number; resetAt: number }>()

export function isRateLimited(ip: string, now = Date.now()): boolean {
  const entry = attempts.get(ip)
  if (!entry || now >= entry.resetAt) return false
  return entry.count >= MAX_ATTEMPTS
}

export function recordAttempt(ip: string, now = Date.now()) {
  const entry = attempts.get(ip)
  if (!entry || now >= entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    entry.count += 1
  }
}
