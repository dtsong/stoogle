'use server'

import { headers } from 'next/headers'
import type { ReportInput, ReportResult } from '@/lib/report/types'
import { REPORT_REASONS } from '@/lib/report/types'
import { isRateLimited, recordReport } from '@/lib/report/rate-limit'

const REPORT_TEXT_MAX_LENGTH = 500

function getClientIp(headerStore: Headers): string {
  return (
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headerStore.get('x-real-ip') ??
    'unknown'
  )
}

function validateInput(input: ReportInput): string | null {
  if (!input.pageUrl || typeof input.pageUrl !== 'string') {
    return 'Page URL is required.'
  }

  if (!REPORT_REASONS.includes(input.reason)) {
    return 'Invalid report reason.'
  }

  if (input.text && input.text.length > REPORT_TEXT_MAX_LENGTH) {
    return `Text must be ${REPORT_TEXT_MAX_LENGTH} characters or less.`
  }

  return null
}

export type EmailSender = {
  send(params: {
    from: string
    to: string
    subject: string
    text: string
  }): Promise<{ error: { message: string } | null }>
}

async function getDefaultSender(): Promise<EmailSender> {
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  return {
    async send(params) {
      const { error } = await resend.emails.send({
        from: params.from,
        to: params.to,
        subject: params.subject,
        text: params.text,
      })
      return { error: error ? { message: error.message } : null }
    },
  }
}

export async function submitReport(
  input: ReportInput,
  sender?: EmailSender
): Promise<ReportResult> {
  const validationError = validateInput(input)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  const headerStore = await headers()
  const ip = getClientIp(headerStore)

  if (isRateLimited(ip)) {
    return { ok: false, error: 'Too many reports. Please try again later.' }
  }

  const adminEmail = process.env.ADMIN_REPORT_EMAIL
  if (!adminEmail) {
    console.error('[report] ADMIN_REPORT_EMAIL not configured')
    return { ok: false, error: 'Reporting is temporarily unavailable.' }
  }

  const emailSender = sender ?? (await getDefaultSender())
  const text = [
    `Page URL: ${input.pageUrl}`,
    `Reason: ${input.reason}`,
    input.text ? `Details: ${input.text}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const { error } = await emailSender.send({
    from: 'Stoogle Reports <reports@stoogle.app>',
    to: adminEmail,
    subject: `[Stoogle Report] ${input.reason}: ${input.pageUrl}`,
    text,
  })

  if (error) {
    console.error('[report] Failed to send report email:', error.message)
    return { ok: false, error: 'Failed to send report. Please try again.' }
  }

  recordReport(ip)
  return { ok: true, error: null }
}
