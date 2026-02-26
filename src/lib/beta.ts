import { createHash, timingSafeEqual } from 'crypto'

export const BETA_COOKIE_NAME = 'stoogle_beta_access'
export const BETA_ACCESS_CODE = process.env.BETA_ACCESS_CODE ?? ''
export const isBetaEnabled = Boolean(BETA_ACCESS_CODE)

export function safeCompare(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}
