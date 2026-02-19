import fixture from '../../../tests/fixtures/benchmark-queries.json'
import { describe, expect, it } from 'vitest'
import { evaluateBenchmarkResult } from '@/lib/search/benchmark'
import { createTypesenseSearchClient } from '@/lib/typesense/client'

const runIntegration = process.env.RUN_TYPESENSE_INTEGRATION === '1'

describe.skipIf(!runIntegration)('benchmark integration', () => {
  it('validates top domains for configured phase1 fixtures', async () => {
    const client = createTypesenseSearchClient()
    const queries = fixture.phase1.slice(0, 5)

    for (const query of queries) {
      const result = await client.collections('pages').documents().search({
        q: query.query,
        query_by: 'title,content',
        query_by_weights: '6,1',
        num_typos: '1,2',
        typo_tokens_threshold: 1,
        per_page: 10,
      })

      const domains = (result.hits ?? [])
        .map((hit) => String(hit.document.site_domain ?? ''))
        .filter(Boolean)

      const evaluation = evaluateBenchmarkResult(query, domains)
      expect(
        evaluation.pass,
        `Query "${query.query}" expected >=${query.minMatchCount} domain matches from ${query.expectedTopDomains.join(', ')}, got ${domains.join(', ')}`
      ).toBe(true)
    }
  })
})
