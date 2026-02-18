/**
 * Server-side environment variable accessors with explicit error messages.
 * Validated at call time (not module load) so Next.js builds don't require
 * runtime secrets to be present in the build environment.
 */

function get(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const env = {
  supabase: {
    get url() { return get('NEXT_PUBLIC_SUPABASE_URL') },
    get anonKey() { return get('NEXT_PUBLIC_SUPABASE_ANON_KEY') },
    get serviceRoleKey() { return get('SUPABASE_SERVICE_ROLE_KEY') },
  },
} as const
