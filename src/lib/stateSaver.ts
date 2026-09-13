export type SaveStatus = 'loading' | 'saved' | 'saving' | 'error'

/** Coalesce rapid edits and serialize writes so an old save cannot overwrite a new one. */
export function createStateSaver<T>(persist: (value: T) => Promise<unknown>, onStatus: (status: SaveStatus) => void, delay = 250) {
  let pending: { value: T } | undefined
  let running: Promise<void> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  const flush = (): Promise<void> => {
    clearTimeout(timer)
    timer = undefined
    if (running) return running
    if (!pending) return Promise.resolve()
    onStatus('saving')
    running = Promise.resolve().then(async () => {
      while (pending) {
        const next = pending
        pending = undefined
        try {
          const result = await persist(next.value)
          if (result === false) throw new Error('Не удалось сохранить изменения')
        } catch (error) {
          // Keep the latest snapshot for a retry after a disk/storage failure.
          pending ??= next
          onStatus('error')
          throw error
        }
      }
      onStatus('saved')
    }).finally(() => { running = undefined })
    return running
  }

  return {
    schedule(value: T) {
      pending = { value }
      onStatus('saving')
      clearTimeout(timer)
      timer = setTimeout(() => { void flush().catch(() => undefined) }, delay)
    },
    flush,
    cancelScheduled() {
      clearTimeout(timer)
      timer = undefined
    },
  }
}
