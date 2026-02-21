import * as Sentry from '@sentry/nextjs'

export type SentryComponent = 'search' | 'crawler' | 'admin' | 'general'

export function captureWithTag(error: unknown, component: SentryComponent, extra?: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setTag('component', component)
    if (extra) {
      scope.setExtras(extra)
    }
    Sentry.captureException(error)
  })
}
