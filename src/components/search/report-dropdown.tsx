'use client'

import { Flag } from 'lucide-react'
import { useRef, useState } from 'react'
import { REPORT_REASONS, REPORT_REASON_LABELS } from '@/lib/report/types'
import type { ReportReason } from '@/lib/report/types'
import { submitReport } from '@/lib/report/report-action'

type ReportDropdownProps = {
  pageUrl: string
}

export function ReportDropdown({ pageUrl }: ReportDropdownProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  function handleToggle() {
    setOpen((prev) => !prev)
    setReason(null)
    setText('')
  }

  async function handleSubmit() {
    if (!reason) return
    setSubmitting(true)

    const result = await submitReport({
      pageUrl,
      reason,
      text: text.trim() || undefined,
    })

    setSubmitting(false)
    setOpen(false)
    setReason(null)
    setText('')
    setToast(result.ok ? 'Report sent. Thank you.' : (result.error ?? 'Something went wrong.'))

    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        aria-label="Report result"
        aria-expanded={open}
        onClick={handleToggle}
        className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-40 transition-opacity hover:opacity-70"
      >
        <Flag className="size-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-foreground">Report this result</p>

          <div className="space-y-1">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                  reason === r
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {REPORT_REASON_LABELS[r]}
              </button>
            ))}
          </div>

          {reason && (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 500))}
                placeholder="Optional details (500 chars max)"
                rows={2}
                className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="mt-2 w-full rounded-md bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Submit Report'}
              </button>
            </>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
