import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import type { Database } from '@/types/supabase'

/**
 * Anon Supabase client for server-side public reads (respects RLS).
 * Stoogle has no user auth — this client is for reading sites, categories, etc.
 * All writes go through createAdminClient() (service_role).
 */
export function createServerClient() {
  return createClient<Database>(env.supabase.url, env.supabase.anonKey)
}
