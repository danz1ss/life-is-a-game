import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStateSaver } from './stateSaver'

afterEach(() => vi.useRealTimers())

describe('state saving', () => {
  it('coalesces rapid edits into one write', async () => {
    vi.useFakeTimers()
    const persist = vi.fn().mockResolvedValue(true)
    const status = vi.fn()
    const saver = createStateSaver(persist, status)
    saver.schedule('first')
    saver.schedule('latest')
    await vi.advanceTimersByTimeAsync(250)
    expect(persist.mock.calls).toEqual([['latest']])
    expect(status).toHaveBeenLastCalledWith('saved')
  })

  it('flushes on close before the debounce expires and does not write twice', async () => {
    vi.useFakeTimers()
    const persist = vi.fn().mockResolvedValue(true)
    const saver = createStateSaver(persist, vi.fn())
    saver.schedule('last edit')
    await saver.flush()
    await vi.advanceTimersByTimeAsync(1000)
    expect(persist.mock.calls).toEqual([['last edit']])
  })

  it('serializes writes and waits for the latest pending snapshot', async () => {
    vi.useFakeTimers()
    let release!: () => void
    const persist = vi.fn().mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve })).mockResolvedValue(true)
    const status = vi.fn()
    const saver = createStateSaver(persist, status)
    saver.schedule('old')
    const saving = saver.flush()
    await Promise.resolve()
    saver.schedule('intermediate')
    saver.schedule('new')
    const closing = saver.flush()
    expect(persist).toHaveBeenCalledTimes(1)
    expect(status).not.toHaveBeenCalledWith('saved')
    release()
    await Promise.all([saving, closing])
    expect(persist.mock.calls).toEqual([['old'], ['new']])
    expect(status).toHaveBeenLastCalledWith('saved')
  })

  it.each([false, new Error('Disk full')])('retains failed data and permits an explicit retry: %s', async (failure) => {
    vi.useFakeTimers()
    const persist = vi.fn().mockImplementationOnce(() => failure instanceof Error ? Promise.reject(failure) : Promise.resolve(failure)).mockResolvedValue(true)
    const status = vi.fn()
    const saver = createStateSaver(persist, status)
    saver.schedule('data')
    await expect(saver.flush()).rejects.toThrow()
    expect(status).toHaveBeenLastCalledWith('error')
    await saver.flush()
    expect(persist.mock.calls).toEqual([['data'], ['data']])
    expect(status).toHaveBeenLastCalledWith('saved')
  })

  it('preserves newer edits if an in-flight write fails', async () => {
    vi.useFakeTimers()
    let reject!: (reason: Error) => void
    const persist = vi.fn().mockImplementationOnce(() => new Promise<void>((_, fail) => { reject = fail })).mockResolvedValue(true)
    const saver = createStateSaver(persist, vi.fn())
    saver.schedule('old')
    const failed = expect(saver.flush()).rejects.toThrow('Disk full')
    await Promise.resolve()
    saver.schedule('new')
    reject(new Error('Disk full'))
    await failed
    await saver.flush()
    expect(persist.mock.calls).toEqual([['old'], ['new']])
  })
})
