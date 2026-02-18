import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import type { Database } from '@/types/supabase'

/**
 * Service-role Supabase client — bypasses RLS.
 * Used by server actions for all writes (crawler, search logging, site management).
 * Never import in client components or expose to the browser.
 */
export function createAdminClient() {
  return createClient<Database>(env.supabase.url, env.supabase.serviceRoleKey)
}
