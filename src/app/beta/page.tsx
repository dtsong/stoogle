import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { betaAccessAction } from './actions'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code: 'Invalid access code. Please try again.',
  rate_limited: 'Too many attempts. Please try again later.',
}

type BetaPageProps = {
  searchParams: Promise<{ error?: string }>
}

export default async function BetaPage({ searchParams }: BetaPageProps) {
  const params = await searchParams
  const error = params.error ? (ERROR_MESSAGES[params.error] ?? 'An error occurred.') : null

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground sm:px-10">
      <section className="mx-auto w-full max-w-lg space-y-6 rounded-2xl border border-border bg-card p-6">
        <header className="space-y-2">
          <p className="text-sm font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Closed Beta
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to Stoogle</h1>
          <p className="text-sm text-muted-foreground">
            Enter the access code shared with you to continue.
          </p>
        </header>

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <form action={betaAccessAction} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="code" className="text-sm font-medium">
              Access code
            </label>
            <Input
              id="code"
              name="code"
              type="password"
              autoComplete="off"
              required
              className="min-h-11"
            />
          </div>
          <Button type="submit" className="min-h-11 w-full">
            Enter Beta
          </Button>
        </form>
      </section>
    </main>
  )
}
