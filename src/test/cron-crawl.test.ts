import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { selectNextSite } from '@/lib/crawler/select-next-site'

const ROOT = resolve(__dirname, '../..')

describe('selectNextSite', () => {
  it('returns the least-recently-updated active site', async () => {
    const mockClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 'site-1', url: 'https://example.com', name: 'Example' }],
                error: null,
              }),
            }),
          }),
        }),
      }),
    }

    const result = await selectNextSite(mockClient)
    expect(result).toEqual({ id: 'site-1', url: 'https://example.com', name: 'Example' })
  })

  it('returns null when no active sites exist', async () => {
    const mockClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }

    const result = await selectNextSite(mockClient)
    expect(result).toBeNull()
  })

  it('throws on database error', async () => {
    const mockClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'connection failed' },
              }),
            }),
          }),
        }),
      }),
    }

    await expect(selectNextSite(mockClient)).rejects.toThrow('Failed to select next site')
  })
})

describe('Vercel cron configuration', () => {
  it('vercel.json has weekly cron for /api/cron/crawl', () => {
    const vercelConfig = JSON.parse(readFileSync(resolve(ROOT, 'vercel.json'), 'utf-8'))
    expect(vercelConfig.crons).toContainEqual(
      expect.objectContaining({
        path: '/api/cron/crawl',
        schedule: expect.stringMatching(/\d/),
      })
    )
  })

  it('cron route requires CRON_SECRET authorization', () => {
    const routeFile = readFileSync(
      resolve(ROOT, 'src/app/api/cron/crawl/route.ts'),
      'utf-8'
    )
    expect(routeFile).toContain('CRON_SECRET')
    expect(routeFile).toContain('401')
  })

  it('cron route has 60s maxDuration', () => {
    const routeFile = readFileSync(
      resolve(ROOT, 'src/app/api/cron/crawl/route.ts'),
      'utf-8'
    )
    expect(routeFile).toContain('maxDuration = 60')
  })

  it('cron route aborts before Vercel timeout', () => {
    const routeFile = readFileSync(
      resolve(ROOT, 'src/app/api/cron/crawl/route.ts'),
      'utf-8'
    )
    expect(routeFile).toMatch(/setTimeout.*55[_,]?000/)
  })
})
