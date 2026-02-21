import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const suggestedQueries = [
  'what is apologetics',
  'biblical counseling anxiety',
  'creation vs evolution',
]

function SearchForm({ compact = false }: { compact?: boolean }) {
  return (
    <form action="/search" method="GET" className="w-full">
      <label htmlFor={compact ? 'query-mobile' : 'query'} className="sr-only">
        Search trusted Christian resources
      </label>
      <div
        className={[
          'flex gap-3 rounded-2xl border border-border bg-card/70 shadow-sm backdrop-blur',
          compact ? 'items-center p-2' : 'flex-col p-3 sm:flex-row sm:p-4',
        ].join(' ')}
      >
        <Input
          id={compact ? 'query-mobile' : 'query'}
          name="query"
          type="search"
          required
          maxLength={200}
          autoComplete="off"
          placeholder="Search sermons, theology, apologetics..."
          className="h-11 flex-1 border-0 bg-background text-base shadow-none focus-visible:ring-2"
        />
        <Button type="submit" size={compact ? 'default' : 'lg'} className="h-11 px-6 sm:px-7">
          Search
        </Button>
      </div>
    </form>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground sm:px-10">
      <div
        data-testid="mobile-sticky-search"
        className="sticky top-0 z-20 -mx-6 bg-background/95 px-6 py-3 backdrop-blur sm:hidden"
      >
        <SearchForm compact />
      </div>

      <section className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-10 pt-16 text-center sm:pt-24">
        <div className="space-y-4">
          <p className="text-sm font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Curated Christian Search
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Stoogle
          </h1>
          <p className="mx-auto max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Search trusted ministry resources across apologetics, biblical counseling, creation,
            theology, and church life.
          </p>
        </div>

        <div className="w-full max-w-2xl space-y-3">
          <SearchForm />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {suggestedQueries.map((query) => (
            <a
              key={query}
              href={`/search?query=${encodeURIComponent(query)}`}
              className="inline-flex min-h-11 items-center rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {query}
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}
