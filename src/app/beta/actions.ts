'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { BETA_ACCESS_CODE, BETA_COOKIE_NAME } from '@/lib/beta'

export async function betaAccessAction(formData: FormData) {
  const code = String(formData.get('code') ?? '').trim()

  if (!code || code !== BETA_ACCESS_CODE) {
    redirect('/beta?error=Invalid+access+code')
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
