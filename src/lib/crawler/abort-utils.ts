export function composeSignals(parentSignal?: AbortSignal, timeoutMs?: number): AbortSignal {
  if (!parentSignal && !timeoutMs) return new AbortController().signal
  if (!parentSignal && timeoutMs) return AbortSignal.timeout(timeoutMs)
  if (parentSignal && !timeoutMs) return parentSignal

  const controller = new AbortController()

  const onAbort = () => controller.abort(parentSignal!.reason)
  if (parentSignal!.aborted) {
    controller.abort(parentSignal!.reason)
    return controller.signal
  }

  parentSignal!.addEventListener('abort', onAbort, { once: true })

  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException('The operation timed out.', 'TimeoutError'))
  }, timeoutMs!)

  controller.signal.addEventListener(
    'abort',
    () => {
      clearTimeout(timeoutId)
      parentSignal!.removeEventListener('abort', onAbort)
    },
    { once: true }
  )

  return controller.signal
}
