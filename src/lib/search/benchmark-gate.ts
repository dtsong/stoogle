import type { BenchmarkQueryFixture, BenchmarkEvaluation } from './benchmark'
import { evaluateBenchmarkResult } from './benchmark'

export type BenchmarkGateThresholds = {
  maxZeroResultsRate: number
  maxP95LatencyMs: number
}

export const PHASE1_THRESHOLDS: BenchmarkGateThresholds = {
  maxZeroResultsRate: 0.15,
  maxP95LatencyMs: 500,
}

export type BenchmarkRunResult = {
  query: string
  found: number
  latencyMs: number
  resultDomains: string[]
}

export type BenchmarkGateResult = {
  total: number
  zeroResultsCount: number
  zeroResultsRate: number
  p95LatencyMs: number
  relevanceResults: Array<{ query: string; evaluation: BenchmarkEvaluation }>
  passZeroResults: boolean
  passLatency: boolean
  passGate: boolean
}

function p95(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[index]
}

export function evaluateBenchmarkGate(
  fixtures: BenchmarkQueryFixture[],
  results: BenchmarkRunResult[],
  thresholds: BenchmarkGateThresholds = PHASE1_THRESHOLDS
): BenchmarkGateResult {
  const total = results.length
  const zeroResultsCount = results.filter((r) => r.found === 0).length
  const zeroResultsRate = total > 0 ? zeroResultsCount / total : 0
  const p95LatencyMs = p95(results.map((r) => r.latencyMs))

  const relevanceResults = fixtures.map((fixture) => {
    const result = results.find((r) => r.query === fixture.query)
    const evaluation = result
      ? evaluateBenchmarkResult(fixture, result.resultDomains)
      : { matchedCount: 0, pass: false }
    return { query: fixture.query, evaluation }
  })

  const passZeroResults = zeroResultsRate <= thresholds.maxZeroResultsRate
  const passLatency = p95LatencyMs <= thresholds.maxP95LatencyMs

  return {
    total,
    zeroResultsCount,
    zeroResultsRate,
    p95LatencyMs,
    relevanceResults,
    passZeroResults,
    passLatency,
    passGate: passZeroResults && passLatency,
  }
}
