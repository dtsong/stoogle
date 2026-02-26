import { isBetaEnabled } from '@/lib/beta'

export function BetaBanner() {
  if (!isBetaEnabled) return null

  const feedbackUrl = process.env.BETA_FEEDBACK_URL

  return (
    <div className="bg-primary px-4 py-2 text-center text-sm text-primary-foreground">
      Stoogle closed beta
      {feedbackUrl ? (
        <>
          {' — '}
          <a href={feedbackUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            Share feedback
          </a>
        </>
      ) : null}
    </div>
  )
}
