export const REPORT_REASONS = ['inappropriate', 'broken-link', 'other'] as const
export type ReportReason = (typeof REPORT_REASONS)[number]

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  inappropriate: 'Inappropriate content',
  'broken-link': 'Broken link',
  other: 'Other',
}

export type ReportInput = {
  pageUrl: string
  reason: ReportReason
  text?: string
}

export type ReportResult = {
  ok: boolean
  error: string | null
}
