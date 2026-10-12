import { describe, expect, it } from 'vitest'
import { createInitialState, levelProgress, migrateState } from './game'
import { awardNewLevels, claimLevelReward } from './levelRewards'
import { toggleQuestCompletion } from './questCompletion'

const date = '2026-09-12'
const now = `${date}T12:00:00.000Z`

describe('level rewards', () => {
  it('records a new level without changing XP or the existing wallet', () => {
    const state = createInitialState()
    state.profile.totalXp = 100
    state.profile.gold = 77
    const next = awardNewLevels(state, date, now)
    expect(next.profile).toBe(state.profile)
    expect(next.profile.gold).toBe(77)
    expect(next.levelRewards.highestLevel).toBe(2)
    expect(next.levelRewards.acknowledgedLevel).toBe(1)
    expect(next.history.at(-1)).toMatchObject({ type: 'level', gold: 0, xp: 0 })
    expect(awardNewLevels(next, date, now)).toBe(next)
    expect(state.history).toHaveLength(0)
  })

  it.each([610, 2160, Number.MAX_SAFE_INTEGER])('retains all crossed milestones without any level or fifth-level coin bonus at %s XP', (totalXp) => {
    const state = createInitialState()
    state.profile.totalXp = totalXp
    state.profile.gold = 18
    const next = awardNewLevels(state, date, now)
    expect(next.levelRewards.highestLevel).toBe(levelProgress(totalXp).level)
    expect(next.levelRewards.acknowledgedLevel).toBe(1)
    expect(next.profile.gold).toBe(18)
    expect(next.history).toHaveLength(1)
    expect(next.history[0]).toMatchObject({ type: 'level', gold: 0, xp: 0 })
  })

  it('never re-awards a level after undo, save/reload and recompletion', () => {
    const state = createInitialState()
    state.profile.totalXp = 50
    const completed = awardNewLevels(toggleQuestCompletion(state, 'quest-project', date, 'first', now), date, now)
    expect(completed.profile.gold).toBe(10)
    const undone = toggleQuestCompletion(completed, 'quest-project', date, 'unused', now)
    expect(undone.profile.gold).toBe(0)
    const reloaded = migrateState(JSON.parse(JSON.stringify(undone)))
    const repeated = awardNewLevels(toggleQuestCompletion(reloaded, 'quest-project', date, 'again', now), date, now)
    expect(repeated.profile.gold).toBe(10)
    expect(repeated.history.filter((event) => event.type === 'level')).toHaveLength(1)
  })

  it('only lets an unlocked personal reward be claimed once, without a gold charge', () => {
    const state = createInitialState()
    state.levelRewards.personal = [{ id: 'book', title: 'Книга', level: 5, claimedAt: null }]
    state.profile.gold = 42
    expect(claimLevelReward(state, 'book', date, now)).toBe(state)
    state.profile.totalXp = 610
    const unlocked = awardNewLevels(state, date, now)
    unlocked.profile.totalXp = 0 // Reaching the milestone permanently unlocks its gift.
    const claimed = claimLevelReward(unlocked, 'book', date, now)
    expect(claimed.profile.gold).toBe(42)
    expect(claimed.levelRewards.personal[0].claimedAt).toBe(now)
    expect(claimLevelReward(claimed, 'book', date, now)).toBe(claimed)
    expect(migrateState(JSON.parse(JSON.stringify(claimed))).levelRewards).toEqual(claimed.levelRewards)
  })

  it('starts legacy profiles at their existing level without retroactive gold', () => {
    const state = createInitialState()
    state.profile.totalXp = 610
    state.profile.gold = 15
    const migrated = migrateState({ ...state, version: 4, dayPlans: undefined, levelRewards: undefined })
    expect(migrated.levelRewards).toEqual({ highestLevel: 5, acknowledgedLevel: 5, personal: [] })
    expect(awardNewLevels(migrated, date, now).profile.gold).toBe(15)
  })

  it('preserves historical level coins and balance while new milestones record zero coins', () => {
    const state = createInitialState()
    state.profile.totalXp = 850 // Level 6.
    state.profile.gold = 65
    state.levelRewards = { highestLevel: 5, acknowledgedLevel: 5, personal: [] }
    state.history = [{ id: 'old-levels', type: 'level', date, createdAt: now, title: 'Достигнуты уровни 2–5', xp: 0, gold: 65 }]
    const snapshot = structuredClone(state)
    const migrated = migrateState(JSON.parse(JSON.stringify(state)))
    expect(migrated.profile.gold).toBe(65)
    expect(migrated.history).toEqual(state.history)
    const next = awardNewLevels(migrated, date, now)
    expect(next.profile.gold).toBe(65)
    expect(next.levelRewards.highestLevel).toBe(6)
    expect(next.history[0]).toBe(migrated.history[0])
    expect(next.history[1]).toMatchObject({ type: 'level', title: 'Достигнут уровень 6', xp: 0, gold: 0 })
    expect(state).toEqual(snapshot)
    expect(migrateState(JSON.parse(JSON.stringify(next)))).toEqual(next)
  })
})
