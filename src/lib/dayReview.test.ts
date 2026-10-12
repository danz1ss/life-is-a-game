import { describe, expect, it } from 'vitest'
import { createInitialState, isQuestOverdue } from './game'
import { closeQuestDay } from './dayReview'

describe('closing a day', () => {
  it('keeps unfinished one-off quests on their planned day for review', () => {
    const state = createInitialState()
    state.quests = [
      { ...state.quests[0], dueDate: '2026-09-13' },
      { ...state.quests[1], dueDate: '2026-09-13', repeatDays: [0] },
    ]
    const result = closeQuestDay(state, '2026-09-13')
    expect(result.unresolved).toBe(1)
    expect(result.skippedRepeats).toBe(1)
    expect(result.state.quests[0].dueDate).toBe('2026-09-13')
    expect(result.state.quests[0].skippedDates).toEqual([])
    expect(result.state.dayPlans['2026-09-13'].closed).toBe(true)
    expect(isQuestOverdue(result.state.quests[0], '2026-09-13', result.state.dayPlans['2026-09-13'].closed)).toBe(true)
    expect(isQuestOverdue(result.state.quests[0], '2026-09-14')).toBe(true)
    expect(result.state.quests[1].skippedDates).toEqual(['2026-09-13'])
    expect(state.quests[1].skippedDates).toEqual([])
  })

  it('counts a marked but unfinished one-off quest as requiring a decision', () => {
    const state = createInitialState()
    const today = state.quests[0].dueDate!
    state.quests = [{ ...state.quests[0], skippedDates: [today] }]
    const result = closeQuestDay(state, today)
    expect(result.unresolved).toBe(1)
    expect(result.state.dayPlans[today].closed).toBe(true)
    expect(isQuestOverdue(result.state.quests[0], today, true)).toBe(true)
  })
})
