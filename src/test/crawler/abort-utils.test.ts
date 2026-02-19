import { describe, expect, it } from 'vitest'
import { composeSignals } from '@/lib/crawler/abort-utils'

describe('composeSignals', () => {
  it('returns a non-aborted signal when given no parent and no timeout', () => {
    const signal = composeSignals()
    expect(signal.aborted).toBe(false)
  })

  it('returns a signal that aborts when parent aborts', async () => {
    const controller = new AbortController()
    const signal = composeSignals(controller.signal)

    expect(signal.aborted).toBe(false)
    controller.abort(new Error('parent abort'))
    // composeSignals with parent-only returns parent signal directly
    expect(signal.aborted).toBe(true)
  })

  it('returns a timeout signal when given timeout only', () => {
    const signal = composeSignals(undefined, 60000)
    expect(signal.aborted).toBe(false)
  })

  it('aborts when parent fires before timeout', async () => {
    const controller = new AbortController()
    const signal = composeSignals(controller.signal, 60000)

    expect(signal.aborted).toBe(false)
    controller.abort(new Error('parent first'))

    // Give the event listener time to fire
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(signal.aborted).toBe(true)
  })

  it('aborts when timeout fires before parent', async () => {
    const controller = new AbortController()
    const signal = composeSignals(controller.signal, 50)

    expect(signal.aborted).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(signal.aborted).toBe(true)
  })

  it('returns already-aborted signal when parent is already aborted', () => {
    const controller = new AbortController()
    controller.abort(new Error('pre-aborted'))
    const signal = composeSignals(controller.signal, 60000)
    expect(signal.aborted).toBe(true)
  })
})
