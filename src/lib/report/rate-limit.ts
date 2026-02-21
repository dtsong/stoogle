const MAX_REPORTS_PER_HOUR = 3

const reportCounts = new Map<string, { count: number; resetAt: number }>()

export function isRateLimited(ip: string, now = Date.now()): boolean {
  const entry = reportCounts.get(ip)

  if (!entry || now >= entry.resetAt) {
    return false
  }

  return entry.count >= MAX_REPORTS_PER_HOUR
}

export function recordReport(ip: string, now = Date.now()) {
  const entry = reportCounts.get(ip)
  const hourFromNow = now + 60 * 60 * 1000

  if (!entry || now >= entry.resetAt) {
    reportCounts.set(ip, { count: 1, resetAt: hourFromNow })
  } else {
    entry.count += 1
  }
}
