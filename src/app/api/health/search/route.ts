import { NextResponse } from 'next/server'
import type { SearchAdapter } from '@/lib/search/adapter'
import { TypesenseAdapter } from '@/lib/search/typesense-adapter'

const TIMEOUT_MS = 5000

export const dynamic = 'force-dynamic'

export async function checkHealth(adapter: SearchAdapter): Promise<Response> {
  const start = performance.now()

  try {
    await Promise.race([
      adapter.search('test', { limit: 1 }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timed out')), TIMEOUT_MS)
      ),
    ])

    const latencyMs = Math.round(performance.now() - start)

    return NextResponse.json(
      { status: 'ok', latency_ms: latencyMs },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { status: 'error', message },
      { status: 503 }
    )
  }
}

export async function GET() {
  return checkHealth(new TypesenseAdapter())
}
