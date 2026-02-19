export type BenchmarkQueryFixture = {
  query: string
  expectedTopDomains: string[]
  minMatchCount: number
}

export type BenchmarkEvaluation = {
  matchedCount: number
  pass: boolean
}

export function evaluateBenchmarkResult(
  fixture: BenchmarkQueryFixture,
  resultDomains: string[]
): BenchmarkEvaluation {
  const matchedCount = fixture.expectedTopDomains.filter((domain) => resultDomains.includes(domain)).length

  return {
    matchedCount,
    pass: matchedCount >= fixture.minMatchCount,
  }
}
