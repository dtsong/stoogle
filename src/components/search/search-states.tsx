import { Button } from '@/components/ui/button'

export function SearchEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      No results found. Try a shorter phrase, different spelling, or broader terms.
    </div>
  )
}

export function SearchErrorState({ retryHref }: { retryHref: string }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <p className="text-sm text-destructive">Search is temporarily unavailable. Please try again.</p>
      <div className="mt-4">
        <Button asChild variant="outline" className="min-h-11">
          <a href={retryHref}>Retry Search</a>
        </Button>
      </div>
    </div>
  )
}

export function SearchLoadingSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-5">
          <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
