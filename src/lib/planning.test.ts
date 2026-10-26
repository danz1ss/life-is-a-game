import { describe, expect, it } from 'vitest'
import { createInitialState, isQuestOverdue, isQuestSkipped, migrateState, nextDateKey } from './game'
import { closeQuestDay } from './dayReview'
import { assignMainQuest, patchPlannedQuest, questsForDay, reorderDayQuest, rescheduleOneTimeQuest, upcomingQuests } from './planning'

const today = '2026-09-12'
const tomorrow = nextDateKey(today)

function fixture() {
  const state = createInitialState()
  state.dayPlans = { [today]: { mainQuestId: 'quest-project', questOrder: [] } }
  state.quests = state.quests.map((quest) => ({ ...quest, dueDate: today }))
  state.quests.push(
    { ...state.quests[1], id: 'tomorrow', dueDate: tomorrow },
    { ...state.quests[1], id: 'idea', dueDate: null },
    { ...state.quests[1], id: 'later', dueDate: '2026-09-20' },
    { ...state.quests[1], id: 'day-after', dueDate: '2026-09-14' },
    { ...state.quests[1], id: 'daily', dueDate: null, repeatDays: [0, 1, 2, 3, 4, 5, 6] },
  )
  return state
}

describe('tomorrow planning', () => {
  it('sorts execution times first while retaining saved order for ties and untimed quests', () => {
    const state = fixture()
    const base = { ...state.quests[1], dueDate: today, repeatDays: [] }
    state.quests = [
      { ...base, id: 'untimed-a', scheduledTime: null, order: 0 },
      { ...base, id: 'late', scheduledTime: '17:00', order: 1 },
      { ...base, id: 'tie-a', scheduledTime: '09:00', order: 2 },
      { ...base, id: 'midnight', scheduledTime: '00:00', order: 3 },
      { ...base, id: 'tie-b', scheduledTime: '09:00', order: 4 },
      { ...base, id: 'untimed-b', scheduledTime: null, order: 5 },
    ]
    state.dayPlans[today].questOrder = ['untimed-b', 'tie-b', 'late', 'tie-a', 'untimed-a', 'midnight']
    const snapshot = JSON.stringify(state)
    expect(questsForDay(state, today).map(q => q.id)).toEqual(['midnight', 'tie-b', 'tie-a', 'late', 'untimed-b', 'untimed-a'])
    expect(JSON.stringify(state)).toBe(snapshot)
  })

  it('recalculates when execution time is assigned, edited and removed without mixing days', () => {
    let state = fixture()
    const ids = () => questsForDay(state, tomorrow).map(q => q.id)
    state = patchPlannedQuest(state, 'daily', { scheduledTime: '12:30' }, tomorrow)
    expect(ids()).toEqual(['daily', 'tomorrow'])
    state = patchPlannedQuest(state, 'tomorrow', { scheduledTime: '09:00' }, tomorrow)
    expect(ids()).toEqual(['tomorrow', 'daily'])
    state = patchPlannedQuest(state, 'tomorrow', { scheduledTime: '17:00' }, tomorrow)
    expect(ids()).toEqual(['daily', 'tomorrow'])
    state = patchPlannedQuest(state, 'daily', { scheduledTime: null }, tomorrow)
    expect(ids()).toEqual(['tomorrow', 'daily'])
    expect(ids()).not.toContain('day-after')
  })

  it('sorts upcoming tasks by date then execution time, preserving ties and undated ideas', () => {
    const state = fixture()
    const base = { ...state.quests[1], repeatDays: [] }
    const quests = [
      { ...base, id: 'no-time', dueDate: '2026-09-14', scheduledTime: null, order: 0 },
      { ...base, id: 'later-day', dueDate: '2026-09-15', scheduledTime: '00:00', order: 1 },
      { ...base, id: 'tie-b', dueDate: '2026-09-14', scheduledTime: '09:00', order: 2 },
      { ...base, id: 'tie-a', dueDate: '2026-09-14', scheduledTime: '09:00', order: 3 },
      { ...base, id: 'idea-a', dueDate: null, scheduledTime: null, order: 4 },
      { ...base, id: 'idea-b', dueDate: null, scheduledTime: null, order: 5 },
    ]
    expect(upcomingQuests(quests, tomorrow).map(q => q.id)).toEqual(['tie-b', 'tie-a', 'no-time', 'later-day', 'idea-a', 'idea-b'])
  })

  it('includes tomorrow and its recurrences; sorts later dates before ideas', () => {
    const state = fixture()
    expect(questsForDay(state, tomorrow).map((quest) => quest.id)).toEqual(['tomorrow', 'daily'])
    expect(upcomingQuests(state.quests, tomorrow).map((quest) => quest.id)).toEqual(['day-after', 'later', 'idea'])
  })

  it('does not show a new tomorrow recurrence before its start date', () => {
    const state = fixture()
    state.quests.find((quest) => quest.id === 'daily')!.dueDate = tomorrow
    expect(questsForDay(state, today).some((quest) => quest.id === 'daily')).toBe(false)
    expect(questsForDay(state, tomorrow).some((quest) => quest.id === 'daily')).toBe(true)
  })

  it('keeps main quests and ordering independent between dates', () => {
    const state = fixture()
    const selected = assignMainQuest(state, 'daily', tomorrow)
    const reordered = reorderDayQuest(selected, 'daily', 'tomorrow', 'before', tomorrow)
    expect(questsForDay(reordered, today)).toEqual(questsForDay(state, today))
    expect(questsForDay(reordered, tomorrow).map((quest) => [quest.id, quest.isMain])).toEqual([['daily', true], ['tomorrow', false]])
    expect(reordered.quests).toBe(state.quests)
    expect(migrateState(JSON.parse(JSON.stringify(reordered))).dayPlans).toEqual(reordered.dayPlans)
  })

  it('moves an idea onto tomorrow and removes it from upcoming', () => {
    const state = patchPlannedQuest(fixture(), 'idea', { dueDate: tomorrow }, today)
    expect(questsForDay(state, tomorrow).some((quest) => quest.id === 'idea')).toBe(true)
    expect(upcomingQuests(state.quests, tomorrow).some((quest) => quest.id === 'idea')).toBe(false)
  })

  it('reopens a closed today plan when an unresolved quest is moved onto today', () => {
    const state = fixture()
    state.quests = [{ ...state.quests[0], skippedDates: [today] }]
    const closed = closeQuestDay(state, today).state
    const pending = closed.quests[0]
    expect(isQuestOverdue(pending, today, closed.dayPlans[today].closed)).toBe(true)

    const moved = rescheduleOneTimeQuest(closed, pending.id, today)
    expect(moved.quests[0].dueDate).toBe(today)
    expect(moved.dayPlans[today].closed).toBe(false)
    expect(isQuestSkipped(moved.quests[0], today)).toBe(false)
    expect(isQuestOverdue(moved.quests[0], today, moved.dayPlans[today].closed)).toBe(false)
    expect(questsForDay(moved, today).map((quest) => quest.id)).toEqual([pending.id])
  })

  it('moves a selected main quest to its new date without clearing today', () => {
    const selected = assignMainQuest(fixture(), 'tomorrow', tomorrow)
    const moved = patchPlannedQuest(selected, 'tomorrow', { dueDate: '2026-09-14', isMain: true }, tomorrow)
    expect(moved.dayPlans[tomorrow].mainQuestId).toBeNull()
    expect(moved.dayPlans['2026-09-14'].mainQuestId).toBe('tomorrow')
    expect(moved.dayPlans[today].mainQuestId).toBe('quest-project')
  })

  it('does not allow an unavailable quest to become main and ignores invalid reorders', () => {
    const state = fixture()
    expect(assignMainQuest(state, 'idea', tomorrow)).toBe(state)
    expect(reorderDayQuest(state, 'idea', 'tomorrow', 'before', tomorrow)).toBe(state)
  })

  it('preserves the prepared plan when tomorrow becomes today', () => {
    const state = assignMainQuest(fixture(), 'tomorrow', tomorrow)
    const reloaded = migrateState(JSON.parse(JSON.stringify(state)))
    expect(questsForDay(reloaded, '2026-09-13').find((quest) => quest.isMain)?.id).toBe('tomorrow')
    expect(questsForDay(reloaded, nextDateKey(tomorrow)).map((quest) => quest.id)).toEqual(['day-after', 'daily'])
  })

  it('migrates the legacy main quest without altering progress or task dates', () => {
    const state = fixture()
    const legacy = { ...state, version: 4, dayPlans: undefined, levelRewards: undefined }
    const migrated = migrateState(legacy)
    expect(migrated.dayPlans[today].mainQuestId).toBe('quest-project')
    expect(migrated.quests).toEqual(state.quests)
    expect(migrated.profile).toEqual(state.profile)
  })
})
