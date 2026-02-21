import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { setAdminSessionCookie } from '@/lib/admin/auth'
import { env } from '@/lib/env'
import type { Database } from '@/types/supabase'

const VALID_OTP_TYPES = ['magiclink', 'recovery', 'invite', 'email_change'] as const
type OtpType = (typeof VALID_OTP_TYPES)[number]

function isValidOtpType(value: string): value is OtpType {
  return (VALID_OTP_TYPES as readonly string[]).includes(value)
}

function normalizeInternalNextPath(nextValue: string | null): string {
  if (!nextValue) return '/admin'
  if (!nextValue.startsWith('/')) return '/admin'
  if (nextValue.startsWith('//')) return '/admin'
  return nextValue
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  const nextPath = normalizeInternalNextPath(url.searchParams.get('next'))

  if (!tokenHash || !type || !isValidOtpType(type)) {
    return NextResponse.redirect(new URL('/admin/login?error=Invalid+magic+link', request.url))
  }

  const client = createClient<Database>(env.supabase.url, env.supabase.anonKey)
  const { data, error } = await client.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })

  if (error || !data.session?.access_token) {
    return NextResponse.redirect(new URL('/admin/login?error=Magic+link+verification+failed', request.url))
  }

  await setAdminSessionCookie(data.session.access_token)
  return NextResponse.redirect(new URL(nextPath, request.url))
}
