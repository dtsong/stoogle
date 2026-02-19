import { FormSubmitButton } from '@/components/admin/form-submit-button'
import { Input } from '@/components/ui/input'
import { requireAdminUserOrRedirect } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminLogoutAction } from './login/actions'
import { addSiteAction, recrawlSiteAction, removeSiteAction } from './actions'

type AdminPageProps = {
  searchParams: Promise<{ notice?: string; error?: string }>
}

function statusLabel(status: 'pending' | 'processing' | 'completed' | 'failed') {
  if (status === 'processing') return 'running'
  if (status === 'completed') return 'done'
  return status
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const user = await requireAdminUserOrRedirect()
  const params = await searchParams
  const client = createAdminClient()

  const [{ data: sites }, { data: categories }, { data: siteCategoryRows }, { data: crawlRows }] =
    await Promise.all([
      client
        .from('sites')
        .select('id, url, name, description, is_active')
        .order('name', { ascending: true }),
      client.from('categories').select('id, name, slug').order('name', { ascending: true }),
      client.from('site_categories').select('site_id, category_id'),
      client
        .from('crawl_queue')
        .select('site_id, status, error, updated_at')
        .order('updated_at', { ascending: false }),
    ])

  const siteList = (sites ?? []) as Array<{
    id: string
    url: string
    name: string
    description: string | null
    is_active: boolean
  }>
  const categoryList = (categories ?? []) as Array<{ id: string; name: string; slug: string }>
  const siteCategoryList = (siteCategoryRows ?? []) as Array<{ site_id: string; category_id: string }>
  const crawlList = (crawlRows ?? []) as Array<{
    site_id: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    error: string | null
    updated_at: string
  }>

  const categoryById = new Map(categoryList.map((category) => [category.id, category]))
  const categoriesBySiteId = new Map<string, Array<{ id: string; name: string; slug: string }>>()

  for (const row of siteCategoryList) {
    const category = categoryById.get(row.category_id)
    if (!category) continue
    const existing = categoriesBySiteId.get(row.site_id) ?? []
    existing.push(category)
    categoriesBySiteId.set(row.site_id, existing)
  }

  const latestCrawlBySiteId = new Map<string, { status: 'pending' | 'processing' | 'completed' | 'failed'; error: string | null }>()
  for (const crawl of crawlList) {
    if (!latestCrawlBySiteId.has(crawl.site_id)) {
      latestCrawlBySiteId.set(crawl.site_id, {
        status: crawl.status,
        error: crawl.error,
      })
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:px-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium tracking-[0.12em] text-muted-foreground uppercase">Admin Dashboard</p>
            <h1 className="text-2xl font-semibold tracking-tight">Curated Site Management</h1>
            <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
          </div>
          <form action={adminLogoutAction}>
            <FormSubmitButton label="Logout" pendingLabel="Logging out..." variant="outline" />
          </form>
        </header>

        {params.notice ? <p className="rounded-md border border-border bg-card p-3 text-sm">{params.notice}</p> : null}
        {params.error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{params.error}</p>
        ) : null}

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Add Curated Site</h2>
          <form action={addSiteAction} className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="site-url" className="text-sm font-medium">Domain or URL</label>
                <Input id="site-url" name="url" placeholder="example.org" required className="min-h-11" />
              </div>
              <div className="space-y-1">
                <label htmlFor="site-name" className="text-sm font-medium">Display name</label>
                <Input id="site-name" name="name" placeholder="Example Ministry" required className="min-h-11" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Categories</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {categoryList.map((category) => (
                  <label key={category.id} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm">
                    <input type="checkbox" name="categories" value={category.id} className="size-4" />
                    <span>{category.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <FormSubmitButton label="Save Site" pendingLabel="Saving..." />
          </form>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Curated Sites</h2>
          <div className="mt-4 space-y-3">
            {siteList.map((site) => {
              const siteCategories = categoriesBySiteId.get(site.id) ?? []
              const crawl = latestCrawlBySiteId.get(site.id)

              return (
                <article key={site.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold">{site.name}</p>
                        <a
                          href={`/search?query=theology&site=${encodeURIComponent(site.name)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-muted-foreground underline"
                        >
                          Test Search
                        </a>
                      </div>
                      <p className="text-sm text-muted-foreground">{site.url}</p>
                      <div className="flex flex-wrap gap-2">
                        {siteCategories.map((category) => (
                          <span key={category.id} className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
                            {category.name}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Crawl status: {crawl ? statusLabel(crawl.status) : 'not queued'}
                      </p>
                      {crawl?.status === 'failed' && crawl.error ? (
                        <p className="text-xs text-destructive">Last crawl error: {crawl.error}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <form action={recrawlSiteAction}>
                        <input type="hidden" name="siteId" value={site.id} />
                        <input type="hidden" name="siteUrl" value={site.url} />
                        <FormSubmitButton label="Re-crawl" pendingLabel="Queueing..." variant="outline" />
                      </form>

                      <form action={removeSiteAction}>
                        <input type="hidden" name="siteId" value={site.id} />
                        <FormSubmitButton
                          label="Remove"
                          pendingLabel="Removing..."
                          variant="destructive"
                          confirmMessage={`Remove ${site.name} from the curated list?`}
                        />
                      </form>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </section>
    </main>
  )
}
