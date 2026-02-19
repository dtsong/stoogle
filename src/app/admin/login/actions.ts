'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  clearAdminSessionCookie,
  sendAdminMagicLink,
  setAdminSessionCookie,
  signInAdminWithPassword,
} from '@/lib/admin/auth'

function encodeMessage(message: string) {
  return encodeURIComponent(message)
}

async function requestOrigin() {
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (!host) {
    return 'http://localhost:3000'
  }

  return `${proto}://${host}`
}

export async function passwordLoginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    redirect('/admin/login?error=Email+and+password+are+required')
  }

  const result = await signInAdminWithPassword(email, password)
  if (!result.ok) {
    redirect(`/admin/login?error=${encodeMessage(result.message)}`)
  }

  await setAdminSessionCookie(result.accessToken)
  redirect('/admin')
}

export async function magicLinkLoginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email) {
    redirect('/admin/login?error=Email+is+required+for+magic+link')
  }

  const origin = await requestOrigin()
  const result = await sendAdminMagicLink(email, origin)
  if (!result.ok) {
    redirect(`/admin/login?error=${encodeMessage(result.message)}`)
  }

  redirect('/admin/login?notice=Magic+link+sent.+Check+your+email.')
}

export async function adminLogoutAction() {
  await clearAdminSessionCookie()
  redirect('/admin/login?notice=Logged+out')
}
