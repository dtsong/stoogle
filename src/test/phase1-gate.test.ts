import { readFileSync, existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { evaluateBenchmarkGate, PHASE1_THRESHOLDS } from '@/lib/search/benchmark-gate'
import type { BenchmarkRunResult } from '@/lib/search/benchmark-gate'
import type { BenchmarkQueryFixture } from '@/lib/search/benchmark'

/**
 * Phase 1 Gate validation.
 * Verifies automated criteria from the benchmark artifact and
 * confirms all required components are in place.
 */

// ───────────────────────────────────────────────
// Benchmark gate logic tests
// ───────────────────────────────────────────────

describe('evaluateBenchmarkGate', () => {
  const fixtures: BenchmarkQueryFixture[] = [
    { query: 'alpha', expectedTopDomains: ['a.com'], minMatchCount: 1 },
    { query: 'beta', expectedTopDomains: ['b.com'], minMatchCount: 1 },
  ]

  it('passes when zero-results rate and latency are within thresholds', () => {
    const results: BenchmarkRunResult[] = [
      { query: 'alpha', found: 5, latencyMs: 50, resultDomains: ['a.com'] },
      { query: 'beta', found: 3, latencyMs: 100, resultDomains: ['b.com'] },
    ]

    const gate = evaluateBenchmarkGate(fixtures, results)
    expect(gate.passGate).toBe(true)
    expect(gate.passZeroResults).toBe(true)
    expect(gate.passLatency).toBe(true)
    expect(gate.zeroResultsRate).toBe(0)
    expect(gate.p95LatencyMs).toBe(100)
  })

  it('fails when zero-results rate exceeds threshold', () => {
    const results: BenchmarkRunResult[] = [
      { query: 'alpha', found: 0, latencyMs: 50, resultDomains: [] },
      { query: 'beta', found: 0, latencyMs: 100, resultDomains: [] },
    ]

    const gate = evaluateBenchmarkGate(fixtures, results, { maxZeroResultsRate: 0.15, maxP95LatencyMs: 500 })
    expect(gate.passGate).toBe(false)
    expect(gate.passZeroResults).toBe(false)
    expect(gate.zeroResultsRate).toBe(1)
  })

  it('fails when p95 latency exceeds threshold', () => {
    const results: BenchmarkRunResult[] = [
      { query: 'alpha', found: 5, latencyMs: 600, resultDomains: ['a.com'] },
      { query: 'beta', found: 3, latencyMs: 700, resultDomains: ['b.com'] },
    ]

    const gate = evaluateBenchmarkGate(fixtures, results, { maxZeroResultsRate: 0.15, maxP95LatencyMs: 500 })
    expect(gate.passGate).toBe(false)
    expect(gate.passLatency).toBe(false)
  })

  it('computes relevance results per fixture', () => {
    const results: BenchmarkRunResult[] = [
      { query: 'alpha', found: 5, latencyMs: 50, resultDomains: ['a.com', 'x.com'] },
      { query: 'beta', found: 3, latencyMs: 100, resultDomains: ['x.com'] },
    ]

    const gate = evaluateBenchmarkGate(fixtures, results)
    expect(gate.relevanceResults[0].evaluation.pass).toBe(true)
    expect(gate.relevanceResults[1].evaluation.pass).toBe(false)
  })
})

// ───────────────────────────────────────────────
// Phase 1 benchmark artifact validation
// ───────────────────────────────────────────────

describe('Phase 1 benchmark artifact', () => {
  it('benchmark artifact exists', () => {
    expect(existsSync('artifacts/phase1-benchmark.json')).toBe(true)
  })

  it('contains 20 query results', () => {
    const artifact = JSON.parse(readFileSync('artifacts/phase1-benchmark.json', 'utf8'))
    expect(artifact.results).toHaveLength(20)
  })

  it('zero-results rate is under 15%', () => {
    const artifact = JSON.parse(readFileSync('artifacts/phase1-benchmark.json', 'utf8'))
    const zeroCount = artifact.results.filter((r: { found: number }) => r.found === 0).length
    const rate = zeroCount / artifact.results.length
    expect(rate).toBeLessThanOrEqual(PHASE1_THRESHOLDS.maxZeroResultsRate)
  })

  it('p95 latency is under 500ms', () => {
    const artifact = JSON.parse(readFileSync('artifacts/phase1-benchmark.json', 'utf8'))
    expect(artifact.p95LatencyMs).toBeLessThanOrEqual(PHASE1_THRESHOLDS.maxP95LatencyMs)
  })
})

// ───────────────────────────────────────────────
// Phase 1 fixture structure
// ───────────────────────────────────────────────

describe('Phase 1 benchmark fixtures', () => {
  it('has 20 phase1 queries', () => {
    const fixture = JSON.parse(readFileSync('tests/fixtures/benchmark-queries.json', 'utf8'))
    expect(fixture.phase1).toHaveLength(20)
  })

  it('all fixtures have required fields', () => {
    const fixture = JSON.parse(readFileSync('tests/fixtures/benchmark-queries.json', 'utf8'))
    for (const entry of fixture.phase1) {
      expect(entry.query).toBeTruthy()
      expect(Array.isArray(entry.expectedTopDomains)).toBe(true)
      expect(entry.minMatchCount).toBeGreaterThan(0)
    }
  })
})

// ───────────────────────────────────────────────
// Component readiness checks
// ───────────────────────────────────────────────

describe('Phase 1 component readiness', () => {
  it('search results page exists', () => {
    expect(existsSync('src/app/search/page.tsx')).toBe(true)
  })

  it('faceted filtering components exist', () => {
    expect(existsSync('src/components/search/search-filters.tsx')).toBe(true)
  })

  it('empty/error/loading states exist', () => {
    expect(existsSync('src/components/search/search-states.tsx')).toBe(true)
    expect(existsSync('src/app/search/loading.tsx')).toBe(true)
  })

  it('admin panel exists', () => {
    expect(existsSync('src/app/admin/page.tsx')).toBe(true)
    expect(existsSync('src/app/admin/login/page.tsx')).toBe(true)
  })

  it('search action with query validation exists', () => {
    expect(existsSync('src/lib/search/search-action.ts')).toBe(true)
  })
})

// ───────────────────────────────────────────────
// Thresholds
// ───────────────────────────────────────────────

describe('Phase 1 gate thresholds', () => {
  it('defines correct thresholds per PRD', () => {
    expect(PHASE1_THRESHOLDS.maxZeroResultsRate).toBe(0.15)
    expect(PHASE1_THRESHOLDS.maxP95LatencyMs).toBe(500)
  })
})
