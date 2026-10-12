import { describe, expect, it } from 'vitest'
import { createInitialState, migrateState } from './game'

describe('background preference compatibility', () => {
  it('keeps the current graphite appearance and all data when opening an older profile', () => {
    const current = createInitialState()
    const older = { ...current, preferences: { todayMode: 'timeline' } }
    const migrated = migrateState(older)
    expect(migrated).toEqual({ ...current, preferences: { todayMode: 'timeline', background: 'minimalism' } })
  })

  it('preserves an exported background selection on import', () => {
    const state = createInitialState()
    state.preferences.background = 'night-sky'
    expect(migrateState(JSON.parse(JSON.stringify(state)))).toEqual(state)
  })

  it('falls back safely when an imported background is unavailable', () => {
    const state = createInitialState()
    const imported = { ...state, preferences: { todayMode: 'timeline', background: 'unknown-theme' } }
    expect(migrateState(imported).preferences).toEqual({ todayMode: 'timeline', background: 'minimalism' })
  })
})
