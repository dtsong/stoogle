import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRedirect = vi.fn()
const mockRequireAdmin = vi.fn()

// Supabase mock builders
const mockUpsert = vi.fn()
const mockDelete = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockSelectSingle = vi.fn()
const mockSelectMaybeSingle = vi.fn()

function resetSupabaseMocks() {
  mockUpsert.mockResolvedValue({ error: null })
  mockDelete.mockResolvedValue({ error: null })
  mockInsert.mockResolvedValue({ error: null })
  mockUpdate.mockResolvedValue({ error: null })
  mockSelectSingle.mockResolvedValue({ data: { id: 'site-1' }, error: null })
  mockSelectMaybeSingle.mockResolvedValue({ data: null, error: null })
}

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url)
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))

vi.mock('@/lib/admin/auth', () => ({
  requireAdminUserOrRedirect: () => mockRequireAdmin(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'site_categories') {
        return {
          delete: () => ({ eq: () => mockDelete() }),
          insert: (rows: unknown) => mockInsert(rows),
        }
      }
      if (table === 'crawl_queue') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: () => mockSelectMaybeSingle() }),
            }),
          }),
          insert: (row: unknown) => mockInsert(row),
          update: (data: unknown) => ({
            eq: () => mockUpdate(data),
          }),
        }
      }
      // sites table
      return {
        upsert: (data: unknown, opts: unknown) => mockUpsert(data, opts),
        delete: () => ({ eq: () => mockDelete() }),
        select: () => ({
          eq: () => ({ single: () => mockSelectSingle() }),
        }),
      }
    },
  }),
}))

describe('admin actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ email: 'admin@test.com' })
    resetSupabaseMocks()
  })

  describe('addSiteAction', () => {
    async function callAddSite(fields: Record<string, string | string[]>) {
      const { addSiteAction } = await import('@/app/admin/actions')
      const form = new FormData()
      for (const [k, v] of Object.entries(fields)) {
        if (Array.isArray(v)) {
          v.forEach((val) => form.append(k, val))
        } else {
          form.set(k, v)
        }
      }
      return addSiteAction(form)
    }

    it('redirects with error when name is missing', async () => {
      await expect(
        callAddSite({ url: 'https://example.com', name: '', categories: ['cat-1'] })
      ).rejects.toThrow('NEXT_REDIRECT')
      expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('error='))
      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it('redirects with error when categories are missing', async () => {
      await expect(
        callAddSite({ url: 'https://example.com', name: 'Example' })
      ).rejects.toThrow('NEXT_REDIRECT')
      expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('error='))
    })

    it('redirects with error on invalid URL', async () => {
      await expect(
        callAddSite({ url: '', name: 'Test', categories: ['cat-1'] })
      ).rejects.toThrow('NEXT_REDIRECT')
      expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('error='))
    })

    it('upserts site and assigns categories on success', async () => {
      await expect(
        callAddSite({ url: 'example.com', name: 'Example', categories: ['cat-1', 'cat-2'] })
      ).rejects.toThrow('NEXT_REDIRECT')

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com',
          name: 'Example',
          is_active: true,
        }),
        { onConflict: 'url' }
      )
      expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('notice='))
    })

    it('redirects with error when upsert fails', async () => {
      mockUpsert.mockResolvedValue({ error: { message: 'DB error' } })

      await expect(
        callAddSite({ url: 'example.com', name: 'Example', categories: ['cat-1'] })
      ).rejects.toThrow('NEXT_REDIRECT')
      expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('Failed%20to%20save'))
    })
  })

  describe('removeSiteAction', () => {
    async function callRemoveSite(siteId: string) {
      const { removeSiteAction } = await import('@/app/admin/actions')
      const form = new FormData()
      form.set('siteId', siteId)
      return removeSiteAction(form)
    }

    it('redirects with error when siteId is missing', async () => {
      await expect(callRemoveSite('')).rejects.toThrow('NEXT_REDIRECT')
      expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('error='))
    })

    it('deletes site and redirects with notice on success', async () => {
      await expect(callRemoveSite('site-1')).rejects.toThrow('NEXT_REDIRECT')
      expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('notice='))
    })
  })

  describe('recrawlSiteAction', () => {
    async function callRecrawl(siteId: string, siteUrl: string) {
      const { recrawlSiteAction } = await import('@/app/admin/actions')
      const form = new FormData()
      form.set('siteId', siteId)
      form.set('siteUrl', siteUrl)
      return recrawlSiteAction(form)
    }

    it('redirects with error when siteId or siteUrl is missing', async () => {
      await expect(callRecrawl('', '')).rejects.toThrow('NEXT_REDIRECT')
      expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('error='))
    })

    it('blocks duplicate crawl when pending crawl exists', async () => {
      mockSelectMaybeSingle.mockResolvedValue({
        data: { id: 'q-1', status: 'pending' },
        error: null,
      })

      await expect(callRecrawl('site-1', 'https://example.com')).rejects.toThrow('NEXT_REDIRECT')
      expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('already%20active'))
    })

    it('inserts new queue entry when no existing crawl', async () => {
      mockSelectMaybeSingle.mockResolvedValue({ data: null, error: null })

      await expect(callRecrawl('site-1', 'https://example.com')).rejects.toThrow('NEXT_REDIRECT')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          site_id: 'site-1',
          url: 'https://example.com',
          status: 'pending',
        })
      )
      expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('Re-crawl%20queued'))
    })

    it('resets existing completed crawl to pending', async () => {
      mockSelectMaybeSingle.mockResolvedValue({
        data: { id: 'q-1', status: 'completed' },
        error: null,
      })

      await expect(callRecrawl('site-1', 'https://example.com')).rejects.toThrow('NEXT_REDIRECT')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' })
      )
    })
  })
})
