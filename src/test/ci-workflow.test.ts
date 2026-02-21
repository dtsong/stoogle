import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(__dirname, '../..')
const workflow = readFileSync(resolve(ROOT, '.github/workflows/ci.yml'), 'utf-8')

describe('CI/CD workflow', () => {
  it('triggers on pull requests and pushes to main', () => {
    expect(workflow).toContain('pull_request')
    expect(workflow).toContain('branches:')
    expect(workflow).toContain('- main')
  })

  it('runs lint, test, and build in quality job', () => {
    expect(workflow).toContain('npm run lint')
    expect(workflow).toContain('npm test')
    expect(workflow).toContain('npm run build')
  })

  it('has an E2E job that depends on quality', () => {
    expect(workflow).toContain('e2e:')
    expect(workflow).toContain('needs: quality')
    expect(workflow).toContain('test:e2e')
  })

  it('caches npm dependencies', () => {
    expect(workflow).toContain('cache: npm')
  })

  it('uses concurrency to cancel in-progress runs', () => {
    expect(workflow).toContain('concurrency:')
    expect(workflow).toContain('cancel-in-progress: true')
  })

  it('sets reasonable timeout', () => {
    expect(workflow).toContain('timeout-minutes:')
  })

  it('installs Playwright browsers for E2E', () => {
    expect(workflow).toContain('playwright install')
  })
})
