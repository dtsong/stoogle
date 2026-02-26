'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { BETA_ACCESS_CODE, BETA_COOKIE_NAME, safeCompare } from '@/lib/beta'
import { isRateLimited, recordAttempt } from '@/lib/beta-rate-limit'

export async function betaAccessAction(formData: FormData) {
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for') ?? 'unknown'

  if (isRateLimited(ip)) {
    redirect('/beta?error=rate_limited')
  }

  const code = String(formData.get('code') ?? '').trim()

  if (!code || !safeCompare(code, BETA_ACCESS_CODE)) {
    recordAttempt(ip)
    redirect('/beta?error=invalid_code')
  }

  const store = await cookies()
  store.set(BETA_COOKIE_NAME, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  redirect('/')
}
