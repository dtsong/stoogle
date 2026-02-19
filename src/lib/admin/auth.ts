import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { env } from '@/lib/env'
import type { Database } from '@/types/supabase'

export const ADMIN_SESSION_COOKIE = 'stoogle_admin_session'
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

type LoginResult =
  | { ok: true; accessToken: string }
  | { ok: false; message: string }

function allowedAdminEmails(): string[] {
  const allowlist = process.env.ADMIN_ALLOWLIST ?? ''
  return allowlist
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

function isEmailAllowlisted(email: string): boolean {
  const allowlist = allowedAdminEmails()
  if (allowlist.length === 0) return true
  return allowlist.includes(email.toLowerCase())
}

function createSupabaseAuthClient() {
  return createClient<Database>(env.supabase.url, env.supabase.anonKey)
}

async function getAttempt(email: string) {
  const client = createAdminClient()
  const { data, error } = await client
    .from('admin_login_attempts')
    .select('email, failed_attempts, locked_until')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to read login attempt row: ${error.message}`)
  }

  return data
}

async function clearAttempts(email: string) {
  const client = createAdminClient()
  const { error } = await client.from('admin_login_attempts').delete().eq('email', email)

  if (error) {
    throw new Error(`Failed to clear login attempts: ${error.message}`)
  }
}

async function recordFailedAttempt(email: string) {
  const current = await getAttempt(email)
  const nextCount = (current?.failed_attempts ?? 0) + 1
  const lockedUntil =
    nextCount >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
      : null

  const client = createAdminClient()
  const { error } = await client.from('admin_login_attempts').upsert(
    {
      email,
      failed_attempts: nextCount,
      locked_until: lockedUntil,
    },
    { onConflict: 'email' }
  )

  if (error) {
    throw new Error(`Failed to record login attempt: ${error.message}`)
  }

  return { nextCount, lockedUntil }
}

function lockoutMessage() {
  return `Too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`
}

export async function signInAdminWithPassword(email: string, password: string): Promise<LoginResult> {
  if (!isEmailAllowlisted(email)) {
    return { ok: false, message: 'This email is not authorized for admin access.' }
  }

  const attempt = await getAttempt(email)
  if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > Date.now()) {
    return { ok: false, message: lockoutMessage() }
  }

  const authClient = createSupabaseAuthClient()
  const { data, error } = await authClient.auth.signInWithPassword({ email, password })

  if (error || !data.session?.access_token) {
    const failure = await recordFailedAttempt(email)
    if (failure.lockedUntil) {
      return { ok: false, message: lockoutMessage() }
    }

    const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - failure.nextCount)
    return {
      ok: false,
      message: `Invalid login credentials. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    }
  }

  await clearAttempts(email)
  return { ok: true, accessToken: data.session.access_token }
}

export async function sendAdminMagicLink(email: string, origin: string): Promise<LoginResult> {
  if (!isEmailAllowlisted(email)) {
    return { ok: false, message: 'This email is not authorized for admin access.' }
  }

  const authClient = createSupabaseAuthClient()
  const { error } = await authClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/admin`,
    },
  })

  if (error) {
    return { ok: false, message: 'Failed to send magic link. Please try again.' }
  }

  return { ok: true, accessToken: '' }
}

export async function setAdminSessionCookie(accessToken: string) {
  const store = await cookies()
  store.set(ADMIN_SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  })
}

export async function clearAdminSessionCookie() {
  const store = await cookies()
  store.delete(ADMIN_SESSION_COOKIE)
}

export async function getAdminUserFromCookie() {
  const store = await cookies()
  const token = store.get(ADMIN_SESSION_COOKIE)?.value
  if (!token) return null

  const authClient = createSupabaseAuthClient()
  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data.user?.email) {
    return null
  }

  if (!isEmailAllowlisted(data.user.email)) {
    return null
  }

  return data.user
}

export async function requireAdminUserOrRedirect() {
  const user = await getAdminUserFromCookie()
  if (!user) {
    redirect('/admin/login')
  }

  return user
}
