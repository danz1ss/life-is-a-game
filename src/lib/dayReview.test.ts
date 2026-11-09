import { describe, expect, it } from 'vitest'
import { createInitialState, isQuestForDate, migrateState } from './game'
import { closeQuestDay } from './dayReview'

const today = '2026-11-08'
const tomorrow = '2026-11-09'
const at = '2026-11-08T16:00:00.000Z'

function fixture() {
  const state = createInitialState()
  const [quest] = state.quests
  state.quests = [
    { ...quest, id: 'one', dueDate: today, scheduledTime: '08:00' },
    { ...quest, id: 'repeat', dueDate: today, repeatDays: [0, 1], completedDates: ['2026-11-01'] },
    { ...quest, id: 'done', dueDate: today, completedDates: [today] },
    { ...quest, id: 'skipped', dueDate: today, skippedDates: [today] },
    { ...quest, id: 'overdue', dueDate: '2026-11-07' },
  ]
  state.dayPlans = {
    [today]: { mainQuestId: 'one', questOrder: ['one', 'repeat', 'done'] },
    [tomorrow]: { mainQuestId: 'repeat', questOrder: ['repeat'], closed: true },
  }
  return state
}

describe('closing a day', () => {
  it('moves one-offs and the current occurrence of repeats without removing future occurrences', () => {
    const state = fixture()
    const result = closeQuestDay(state, today, { kind: 'transfer', batchId: 'review' })
    const saved = migrateState(JSON.parse(JSON.stringify(result.state)))
    const [one, repeat, done, skipped, overdue, transfer] = saved.quests
    expect(one).toMatchObject({ id: 'one', dueDate: tomorrow, scheduledTime: '08:00' })
    expect(repeat).toMatchObject({ repeatDays: [0, 1], completedDates: ['2026-11-01'], skippedDates: [] })
    expect(isQuestForDate(repeat, today)).toBe(false)
    expect(isQuestForDate(repeat, tomorrow)).toBe(true)
    expect(isQuestForDate(repeat, '2026-11-15')).toBe(true)
    expect(transfer).toMatchObject({ title: repeat.title, dueDate: tomorrow, repeatDays: [], completedDates: [], skippedDates: [], transferredFrom: today })
    expect(transfer.id).not.toBe(repeat.id)
    expect([done, skipped, overdue]).toEqual(state.quests.slice(2))
    expect(saved.dayPlans[today]).toEqual({ mainQuestId: null, questOrder: ['done'], closed: true })
    expect(saved.dayPlans[tomorrow]).toEqual({ mainQuestId: 'repeat', questOrder: ['repeat'], closed: false })
    expect(saved.profile).toEqual(state.profile)
    expect(saved.history).toEqual(state.history)
    expect(closeQuestDay(saved, today, { kind: 'transfer', batchId: 'other' }).state).toEqual(saved)
  })

  it('archives one-offs and skips only the current repeat when declining', () => {
    const state = fixture()
    const { state: closed } = closeQuestDay(state, today, { kind: 'decline', at })
    expect(closed.quests[0].archivedAt).toBe(at)
    expect(closed.quests[1]).toMatchObject({ archivedAt: null, skippedDates: [today], completedDates: ['2026-11-01'] })
    expect(isQuestForDate(closed.quests[1], tomorrow)).toBe(true)
    expect(closed.quests.slice(2)).toEqual(state.quests.slice(2))
    expect(closed.dayPlans[today].closed).toBe(true)
    expect(closed.dayPlans[tomorrow]).toBe(state.dayPlans[tomorrow])
    expect(closed.profile).toBe(state.profile)
    expect(closed.history).toBe(state.history)
  })

  it('requires a decision for unmarked quests and closes directly when all are marked', () => {
    const state = fixture()
    expect(closeQuestDay(state, today).state).toBe(state)
    state.quests = state.quests.slice(2)
    const { state: closed } = closeQuestDay(state, today)
    expect(closed.quests).toEqual(state.quests)
    expect(closed.dayPlans[today].closed).toBe(true)
  })
})
