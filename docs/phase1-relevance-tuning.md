# Phase 1 Relevance Tuning

## Configuration

Search relevance is configured in `src/lib/search/relevance.ts`.

- `queryBy`: `title,content`
- `queryByWeights`: `6,1` (title weighted higher than body)
- `numTypos`: `1,2` (title allows 1 typo, content allows 2 typos)
- `typoTokensThreshold`: `1`

## Benchmark Commands

- Baseline or current run: `npm run test:benchmark -- --phase=1`
- Write JSON artifact for gate evidence: `npm run test:benchmark -- --phase=1 --output=artifacts/phase1-benchmark.json`

## A/B Comparison Procedure

1. Edit `src/lib/search/relevance.ts` with baseline values.
2. Run `npm run test:benchmark -- --phase=1 --output=artifacts/phase1-benchmark-baseline.json`.
3. Restore tuned values (`6,1` and typo tolerance settings above).
4. Run `npm run test:benchmark -- --phase=1 --output=artifacts/phase1-benchmark-tuned.json`.
5. Compare `passed`, `zeroResults`, and `p95LatencyMs` across both artifacts.
