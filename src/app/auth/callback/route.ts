import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { setAdminSessionCookie } from '@/lib/admin/auth'
import { env } from '@/lib/env'
import type { Database } from '@/types/supabase'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  const nextPath = url.searchParams.get('next') ?? '/admin'

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL('/admin/login?error=Invalid+magic+link', request.url))
  }

  const client = createClient<Database>(env.supabase.url, env.supabase.anonKey)
  const { data, error } = await client.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as 'magiclink' | 'recovery' | 'invite' | 'email_change',
  })

  if (error || !data.session?.access_token) {
    return NextResponse.redirect(new URL('/admin/login?error=Magic+link+verification+failed', request.url))
  }

  await setAdminSessionCookie(data.session.access_token)
  return NextResponse.redirect(new URL(nextPath, request.url))
}
