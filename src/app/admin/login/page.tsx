import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAdminUserFromCookie } from '@/lib/admin/auth'
import { redirect } from 'next/navigation'
import { magicLinkLoginAction, passwordLoginAction } from './actions'

type LoginPageProps = {
  searchParams: Promise<{ error?: string; notice?: string }>
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const user = await getAdminUserFromCookie()
  if (user) {
    redirect('/admin')
  }

  const params = await searchParams
  const error = params.error ?? null
  const notice = params.notice ?? null

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground sm:px-10">
      <section className="mx-auto w-full max-w-lg space-y-6 rounded-2xl border border-border bg-card p-6">
        <header className="space-y-2">
          <p className="text-sm font-medium tracking-[0.12em] text-muted-foreground uppercase">Admin Access</p>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to Stoogle Admin</h1>
          <p className="text-sm text-muted-foreground">
            Use your approved email address and password, or request a magic link.
          </p>
        </header>

        {notice ? <p className="rounded-md border border-border bg-background p-3 text-sm">{notice}</p> : null}
        {error ? <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

        <form action={passwordLoginAction} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input id="email" name="email" type="email" autoComplete="email" required className="min-h-11" />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required className="min-h-11" />
          </div>
          <Button type="submit" className="min-h-11 w-full">Sign In</Button>
        </form>

        <div className="border-t border-border pt-4">
          <form action={magicLinkLoginAction} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="magic-email" className="text-sm font-medium">Magic link email</label>
              <Input id="magic-email" name="email" type="email" autoComplete="email" required className="min-h-11" />
            </div>
            <Button type="submit" variant="outline" className="min-h-11 w-full">Send Magic Link</Button>
          </form>
        </div>
      </section>
    </main>
  )
}
