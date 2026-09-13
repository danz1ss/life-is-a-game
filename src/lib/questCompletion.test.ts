import { describe, expect, it } from 'vitest'
import { createInitialState } from './game'
import { toggleQuestCompletion, toggleQuestSkipped } from './questCompletion'

const date = '2026-09-12'
const now = `${date}T12:00:00.000Z`
const toggle = (state: ReturnType<typeof createInitialState>, onDate = date) => toggleQuestCompletion(state, 'quest-project', onDate, `event-${onDate}`, now)

describe('quest awards', () => {
  it('round-trips completion without mutating the previous state', () => {
    const state = createInitialState()
    const snapshot = structuredClone(state)
    const completed = toggle(state)
    expect(completed.profile.totalXp).toBe(50)
    expect(completed.profile.gold).toBe(10)
    expect(completed.skills.find((skill) => skill.id === 'programming')?.xp).toBe(50)
    expect(toggle(completed).profile).toEqual(state.profile)
    expect(toggle(completed).skills).toEqual(state.skills)
    expect(state).toEqual(snapshot)
  })

  it.each(['undo', 'skip'])('uses the original award and skill when edited after completion: %s', (action) => {
    const state = createInitialState()
    state.profile.totalXp = 100
    state.profile.gold = 100
    const completed = toggle(state)
    completed.quests[0] = { ...completed.quests[0], difficulty: 'easy', skillId: 'reading' }
    const next = action === 'undo' ? toggle(completed, '2026-09-13') : toggleQuestSkipped(completed, 'quest-project', '2026-09-13')
    expect(next.profile.totalXp).toBe(100)
    expect(next.profile.gold).toBe(100)
    expect(next.skills).toEqual(state.skills)
    expect(next.history).toEqual([])
    expect(next.quests[0].completedDates).toEqual([])
  })

  it('does not deduct an unrelated balance when the historical award is missing', () => {
    const state = createInitialState()
    state.profile.totalXp = 500
    state.profile.gold = 100
    state.quests[0].completedDates = [date]
    expect(toggle(state).profile).toEqual(state.profile)
    expect(toggle(state).quests[0].completedDates).toEqual([])
  })

  it('only undoes the selected recurrence and keeps the other active day', () => {
    const state = createInitialState()
    state.quests[0].repeatDays = [6, 0]
    const completed = toggle(toggle(state), '2026-09-13')
    const next = toggleQuestSkipped(completed, 'quest-project', date)
    expect(next.profile.totalXp).toBe(50)
    expect(next.profile.activeDays).toEqual(['2026-09-13'])
    expect(next.quests[0].completedDates).toEqual(['2026-09-13'])
    expect(next.quests[0].skippedDates).toEqual([date])
    expect(next.history).toHaveLength(1)
  })

  it('uses the current completion when skipping immediately after completing', () => {
    const next = toggleQuestSkipped(toggle(createInitialState()), 'quest-project', date)
    expect(next.profile.totalXp).toBe(0)
    expect(next.history).toEqual([])
    expect(toggleQuestSkipped(next, 'quest-project', date).quests[0].skippedDates).toEqual([])
  })

  it('does not reassign XP when the original skill was deleted', () => {
    const completed = toggle(createInitialState())
    completed.skills = completed.skills.filter((skill) => skill.id !== 'programming')
    completed.quests[0].skillId = 'reading'
    expect(toggle(completed).skills).toEqual(completed.skills)
    expect(toggle(completed).profile.totalXp).toBe(0)
  })

  it('clears a skipped mark when completing and never produces negative gold', () => {
    const completed = toggle(toggleQuestSkipped(createInitialState(), 'quest-project', date))
    expect(completed.quests[0].skippedDates).toEqual([])
    completed.profile.gold = 0
    expect(toggle(completed).profile.gold).toBe(0)
  })
})
