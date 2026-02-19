import { describe, expect, it } from 'vitest'
import { evaluateBenchmarkResult } from '@/lib/search/benchmark'

describe('evaluateBenchmarkResult', () => {
  it('passes when matched domains meet threshold', () => {
    const evaluation = evaluateBenchmarkResult(
      {
        query: 'apologetics',
        expectedTopDomains: ['carm.org', 'str.org'],
        minMatchCount: 1,
      },
      ['str.org', 'example.com']
    )

    expect(evaluation).toEqual({ matchedCount: 1, pass: true })
  })

  it('fails when matched domains are below threshold', () => {
    const evaluation = evaluateBenchmarkResult(
      {
        query: 'apologetics',
        expectedTopDomains: ['carm.org', 'str.org'],
        minMatchCount: 2,
      },
      ['str.org', 'example.com']
    )

    expect(evaluation).toEqual({ matchedCount: 1, pass: false })
  })
})
