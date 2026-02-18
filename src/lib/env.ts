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

function getAny(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]
    if (value) return value
  }

  throw new Error(`Missing required environment variable: ${names.join(' or ')}`)
}

export const env = {
  supabase: {
    get url() { return get('NEXT_PUBLIC_SUPABASE_URL') },
    get anonKey() { return get('NEXT_PUBLIC_SUPABASE_ANON_KEY') },
    get serviceRoleKey() { return get('SUPABASE_SERVICE_ROLE_KEY') },
  },
  typesense: {
    get host() { return getAny(['TYPESENSE_HOST', 'NEXT_PUBLIC_TYPESENSE_HOST']) },
    get adminApiKey() { return getAny(['TYPESENSE_ADMIN_API_KEY', 'TYPESENSE_API_KEY']) },
    get searchApiKey() { return getAny(['TYPESENSE_SEARCH_API_KEY', 'TYPESENSE_API_KEY']) },
  },
} as const
