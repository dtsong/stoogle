import { SearchLoadingSkeleton } from '@/components/search/search-states'

export default function SearchLoadingPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground sm:px-10">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="sticky top-0 z-20 rounded-xl border border-border bg-background/95 p-3 backdrop-blur">
          <div className="h-11 w-full animate-pulse rounded-md bg-muted" />
        </div>
        <SearchLoadingSkeleton />
      </section>
    </main>
  )
}
