import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { selectNextSite } from '@/lib/crawler/select-next-site'
import { runCrawlForSite } from '@/lib/crawler/run-crawl'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = createAdminClient()

  const site = await selectNextSite(client as never)
  if (!site) {
    return NextResponse.json({ status: 'no_sites', message: 'No active sites to crawl' })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 55_000)

  try {
    const result = await runCrawlForSite(site.id, 'vercel-cron', {
      signal: controller.signal,
    })

    await client
      .from('sites')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', site.id)

    return NextResponse.json({
      status: 'ok',
      site: { id: site.id, url: site.url, name: site.name },
      pagesIndexed: result.pagesIndexed,
      pagesProcessed: result.pagesProcessed,
      errors: result.errors.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { status: 'error', site: { id: site.id, url: site.url }, message },
      { status: 500 }
    )
  } finally {
    clearTimeout(timeout)
  }
}
