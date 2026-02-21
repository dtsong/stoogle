'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type ClickActionInput = {
  query: string
  clicked_url: string
  click_position: number
}

export type ClickActionResult = {
  ok: boolean
  error: string | null
}

type ClickLogClient = {
  from(table: 'search_logs'): {
    insert(payload: {
      query: string
      result_count: number
      clicked_url: string
      click_position: number
    }): Promise<{ error: { message: string } | null }>
  }
}

export async function executeClickAction(
  input: ClickActionInput,
  logger?: ClickLogClient
): Promise<ClickActionResult> {
  const query = input.query.trim()
  if (!query || !input.clicked_url) {
    return { ok: false, error: 'Missing required fields.' }
  }

  if (!Number.isInteger(input.click_position) || input.click_position < 0) {
    return { ok: false, error: 'Invalid click position.' }
  }

  try {
    const client = logger ?? (createAdminClient() as unknown as ClickLogClient)

    const { error } = await client.from('search_logs').insert({
      query,
      result_count: 0,
      clicked_url: input.clicked_url,
      click_position: input.click_position,
    })

    if (error) {
      console.error('[click-action] Failed to log click:', error.message)
      return { ok: false, error: 'Failed to log click.' }
    }

    return { ok: true, error: null }
  } catch (err) {
    console.error('[click-action] Unexpected error:', err)
    return { ok: false, error: 'Failed to log click.' }
  }
}

export async function clickAction(input: ClickActionInput): Promise<ClickActionResult> {
  return executeClickAction(input)
}
