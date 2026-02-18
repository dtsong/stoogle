type SearchPageProps = {
  searchParams: Promise<{ query?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = (params.query ?? '').slice(0, 200)

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground sm:px-10">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-[0.14em]">
          Search Results
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {query ? `Results for "${query}"` : 'Enter a search query'}
        </h1>
        <p className="text-muted-foreground">
          Full results rendering arrives in Issue #16. This route now confirms query submission and
          navigation from the homepage search form.
        </p>
      </section>
    </main>
  )
}
