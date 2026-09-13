import { describe, expect, it } from 'vitest'
import { createInitialState, levelProgress, migrateState } from './game'
import { awardNewLevels, claimLevelReward, levelGold } from './levelRewards'
import { toggleQuestCompletion } from './questCompletion'

const date = '2026-09-12'
const now = `${date}T12:00:00.000Z`

describe('level rewards', () => {
  it('grants gold once and records an award without changing XP', () => {
    const state = createInitialState()
    state.profile.totalXp = 100
    const next = awardNewLevels(state, date, now)
    expect(next.profile).toEqual({ ...state.profile, gold: 10 })
    expect(next.levelRewards.highestLevel).toBe(2)
    expect(next.levelRewards.acknowledgedLevel).toBe(1)
    expect(next.history.at(-1)).toMatchObject({ type: 'level', gold: 10, xp: 0 })
    expect(awardNewLevels(next, date, now)).toBe(next)
    expect(state.history).toHaveLength(0)
  })

  it('awards all crossed levels, including the fifth-level bonus', () => {
    const state = createInitialState()
    state.profile.totalXp = 610 // Level 5: 100 + 135 + 170 + 205.
    const next = awardNewLevels(state, date, now)
    expect(levelProgress(next.profile.totalXp).level).toBe(5)
    expect(next.profile.gold).toBe(65)
    expect(levelGold(5)).toBe(35)
    expect(levelGold(6)).toBe(10)
  })

  it('never re-awards a level after undo, save/reload and recompletion', () => {
    const state = createInitialState()
    state.profile.totalXp = 50
    const completed = awardNewLevels(toggleQuestCompletion(state, 'quest-project', date, 'first', now), date, now)
    expect(completed.profile.gold).toBe(20)
    const undone = toggleQuestCompletion(completed, 'quest-project', date, 'unused', now)
    expect(undone.profile.gold).toBe(10)
    const reloaded = migrateState(JSON.parse(JSON.stringify(undone)))
    const repeated = awardNewLevels(toggleQuestCompletion(reloaded, 'quest-project', date, 'again', now), date, now)
    expect(repeated.profile.gold).toBe(20)
    expect(repeated.history.filter((event) => event.type === 'level')).toHaveLength(1)
  })

  it('only lets an unlocked personal reward be claimed once, without a gold charge', () => {
    const state = createInitialState()
    state.levelRewards.personal = [{ id: 'book', title: 'Книга', level: 5, claimedAt: null }]
    expect(claimLevelReward(state, 'book', date, now)).toBe(state)
    state.profile.totalXp = 610
    const unlocked = awardNewLevels(state, date, now)
    unlocked.profile.totalXp = 0 // Reaching the milestone permanently unlocks its gift.
    const claimed = claimLevelReward(unlocked, 'book', date, now)
    expect(claimed.profile.gold).toBe(65)
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
})
