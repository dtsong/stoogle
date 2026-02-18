import { Button } from '@/components/ui/button'
import { ResultCard } from '@/components/search/result-card'
import { Input } from '@/components/ui/input'
import { executeSearchAction } from '@/lib/search/search-action'

type SearchPageProps = {
  searchParams: Promise<{ query?: string | string[]; page?: string | string[] }>
}


function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return value ?? ''
}

function parsePageParam(value: string | string[] | undefined): number {
  const raw = firstParam(value).trim()
  if (!raw) return 1

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return 1

  return Math.max(1, parsed)
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = firstParam(params.query).slice(0, 200)
  const page = parsePageParam(params.page)

  const searchResult = await executeSearchAction({
    query,
    options: {
      page,
      limit: 10,
    },
  })

  const totalPages = Math.max(1, Math.ceil(searchResult.data.found / searchResult.data.limit))
  const hasPreviousPage = page > 1
  const hasNextPage = page < totalPages

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground sm:px-10">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <form action="/search" method="GET" className="sticky top-0 z-20 rounded-xl border border-border bg-background/95 p-3 backdrop-blur">
          <label htmlFor="query" className="sr-only">
            Search trusted Christian resources
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="query"
              name="query"
              type="search"
              maxLength={200}
              defaultValue={query}
              placeholder="Search sermons, theology, apologetics..."
              className="h-11 text-base"
            />
            <Button type="submit" className="h-11 px-6">
              Search
            </Button>
          </div>
        </form>

        <header className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-[0.14em]">
            Search Results
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {searchResult.data.found} results for &ldquo;{query || 'all resources'}&rdquo;
          </h1>
          {searchResult.error ? (
            <p className="text-sm text-destructive">{searchResult.error}</p>
          ) : null}
        </header>

        {searchResult.data.results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No results found. Try a shorter phrase, different spelling, or broader terms.
          </div>
        ) : (
          <div className="grid gap-4">
            {searchResult.data.results.map((result) => (
              <ResultCard key={result.id} result={result} query={query} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" disabled={!hasPreviousPage} asChild>
            <a href={hasPreviousPage ? `/search?query=${encodeURIComponent(query)}&page=${page - 1}` : '#'}>
              Previous
            </a>
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <Button variant="outline" disabled={!hasNextPage} asChild>
            <a href={hasNextPage ? `/search?query=${encodeURIComponent(query)}&page=${page + 1}` : '#'}>
              Next
            </a>
          </Button>
        </div>
      </section>
    </main>
  )
}
