import { describe, expect, it } from 'vitest'
import { createInitialState } from './game'
import { groupArchivedQuests } from './questArchive'

describe('quest archive', () => {
  it('groups by result day, newest first, rather than quest order', () => {
    const state = createInitialState()
    state.quests = [
      { ...state.quests[0], id: 'old', order: 0, completedDates: ['2026-09-12'] },
      { ...state.quests[0], id: 'new', order: 1, completedDates: ['2026-09-14'] },
      { ...state.quests[0], id: 'cancelled', order: 2, archivedAt: '2026-09-14T12:00:00.000Z' },
      { ...state.quests[0], id: 'early', order: 3, completedDates: ['2026-09-14'] },
    ]
    state.history = [
      { id: 'new-event', type: 'quest', questId: 'new', date: '2026-09-14', createdAt: '2026-09-15T10:00:00.000Z', title: 'New', xp: 10, gold: 2 },
      { id: 'early-event', type: 'quest', questId: 'early', date: '2026-09-14', createdAt: '2026-09-14T08:00:00.000Z', title: 'Early', xp: 10, gold: 2 },
    ]
    expect(groupArchivedQuests(state.quests, state.history).map((group) => [group.date, group.quests.map((quest) => quest.id)]))
      .toEqual([['2026-09-14', ['new', 'cancelled', 'early']], ['2026-09-12', ['old']]])
  })
})
