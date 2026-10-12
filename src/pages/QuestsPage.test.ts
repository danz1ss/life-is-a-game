import { describe, expect, it } from 'vitest'
import { createInitialState } from '../lib/game'
import { groupArchivedQuests } from '../lib/questArchive'
import { archiveBadgeForQuest } from './QuestsPage'

describe('archive quest badges', () => {
  it('does not present an archived recurring quest as completed on its archive day', () => {
    const state = createInitialState()
    const recurring = {
      ...state.quests[0],
      repeatDays: [1],
      completedDates: ['2026-09-14'],
      archivedAt: '2026-09-18T12:00:00.000Z',
    }
    const [group] = groupArchivedQuests([recurring], [])

    expect(group.date).toBe('2026-09-18')
    expect(archiveBadgeForQuest(group.quests[0])).toEqual({ label: 'Архивирован', tone: 'muted' })
    expect(archiveBadgeForQuest({ ...recurring, repeatDays: [], archivedAt: null })).toEqual({ label: 'Выполнен', tone: 'success' })
  })
})
