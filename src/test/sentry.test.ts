import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(__dirname, '../..')

function readProjectFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8')
}

type MockScope = {
  setTag: ReturnType<typeof vi.fn>
  setExtras: ReturnType<typeof vi.fn>
}

function createMockScope(): MockScope {
  return { setTag: vi.fn(), setExtras: vi.fn() }
}

vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((cb: (scope: MockScope) => void) => {
    cb(createMockScope())
  }),
  captureException: vi.fn(),
}))

describe('Sentry configuration', () => {
  it('client config initializes with NEXT_PUBLIC_SENTRY_DSN', () => {
    const config = readProjectFile('sentry.client.config.ts')
    expect(config).toContain('NEXT_PUBLIC_SENTRY_DSN')
    expect(config).toContain('Sentry.init')
  })

  it('server config initializes with NEXT_PUBLIC_SENTRY_DSN', () => {
    const config = readProjectFile('sentry.server.config.ts')
    expect(config).toContain('NEXT_PUBLIC_SENTRY_DSN')
    expect(config).toContain('Sentry.init')
  })

  it('edge config initializes with NEXT_PUBLIC_SENTRY_DSN', () => {
    const config = readProjectFile('sentry.edge.config.ts')
    expect(config).toContain('NEXT_PUBLIC_SENTRY_DSN')
    expect(config).toContain('Sentry.init')
  })

  it('instrumentation registers server and edge runtimes', () => {
    const instrumentation = readProjectFile('src/instrumentation.ts')
    expect(instrumentation).toContain("NEXT_RUNTIME === 'nodejs'")
    expect(instrumentation).toContain("NEXT_RUNTIME === 'edge'")
    expect(instrumentation).toContain('sentry.server.config')
    expect(instrumentation).toContain('sentry.edge.config')
  })

  it('next.config.ts wraps with withSentryConfig', () => {
    const config = readProjectFile('next.config.ts')
    expect(config).toContain('withSentryConfig')
    expect(config).toContain('sourcemaps')
  })

  it('CSP allows Sentry connections', () => {
    const config = readProjectFile('next.config.ts')
    expect(config).toContain('*.sentry.io')
  })
})

describe('Error tagging utility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('captureWithTag sets component tag and calls captureException', async () => {
    const Sentry = await import('@sentry/nextjs')
    const { captureWithTag } = await import('@/lib/sentry')

    const error = new Error('search failed')
    captureWithTag(error, 'search')

    expect(Sentry.withScope).toHaveBeenCalledOnce()
    expect(Sentry.captureException).toHaveBeenCalledWith(error)
  })

  it('tags search errors with component: search', async () => {
    const Sentry = await import('@sentry/nextjs')
    const { captureWithTag } = await import('@/lib/sentry')

    const setTag = vi.fn()
    vi.mocked(Sentry.withScope).mockImplementation((cb) => {
      cb({ setTag, setExtras: vi.fn() } as MockScope)
    })

    captureWithTag(new Error('test'), 'search')
    expect(setTag).toHaveBeenCalledWith('component', 'search')
  })

  it('tags crawler errors with component: crawler', async () => {
    const Sentry = await import('@sentry/nextjs')
    const { captureWithTag } = await import('@/lib/sentry')

    const setTag = vi.fn()
    vi.mocked(Sentry.withScope).mockImplementation((cb) => {
      cb({ setTag, setExtras: vi.fn() } as MockScope)
    })

    captureWithTag(new Error('crawl failed'), 'crawler')
    expect(setTag).toHaveBeenCalledWith('component', 'crawler')
  })

  it('passes extra context to scope', async () => {
    const Sentry = await import('@sentry/nextjs')
    const { captureWithTag } = await import('@/lib/sentry')

    const setExtras = vi.fn()
    vi.mocked(Sentry.withScope).mockImplementation((cb) => {
      cb({ setTag: vi.fn(), setExtras } as MockScope)
    })

    captureWithTag(new Error('test'), 'search', { query: 'bible' })
    expect(setExtras).toHaveBeenCalledWith({ query: 'bible' })
  })
})
