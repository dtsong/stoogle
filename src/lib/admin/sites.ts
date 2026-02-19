export function normalizeSiteUrl(input: string): string {
  const raw = input.trim()
  if (!raw) {
    throw new Error('Site URL is required')
  }

  const withProtocol = raw.match(/^https?:\/\//i) ? raw : `https://${raw}`

  let parsed: URL
  try {
    parsed = new URL(withProtocol)
  } catch {
    throw new Error('Enter a valid domain or URL')
  }

  if (!parsed.hostname || parsed.hostname.split('.').length < 2) {
    throw new Error('Enter a valid domain or URL')
  }

  parsed.hash = ''
  parsed.search = ''
  parsed.pathname = parsed.pathname === '/' ? '' : parsed.pathname

  return parsed.toString().replace(/\/$/, '')
}
