import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { evaluateMetrics } from '@/lib/analytics/thresholds'
import type { SearchLogRow } from '@/lib/analytics/metrics'

export const dynamic = 'force-dynamic'

type MetricsClient = {
  from(table: 'search_logs'): {
    select(columns: string): {
      gte(column: string, value: string): {
        then: Promise<{ data: SearchLogRow[] | null; error: { message: string } | null }>['then']
      }
    }
  }
}

export async function fetchAndEvaluate(client: MetricsClient) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data, error } = await client
    .from('search_logs')
    .select('query, result_count, clicked_url, click_position, created_at')
    .gte('created_at', sevenDaysAgo.toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const logs: SearchLogRow[] = data ?? []
  const report = evaluateMetrics(logs)

  return NextResponse.json({
    period: '7d',
    totalLogs: logs.length,
    metrics: report,
  })
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.METRICS_API_TOKEN

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = createAdminClient() as unknown as MetricsClient
  return fetchAndEvaluate(client)
}
