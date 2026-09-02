import { describe, expect, it } from 'vitest'
import { createInitialState, isQuestComplete, isQuestForDate, isQuestOverdue, migrateState } from './game'
import type { Quest } from './types'

function makeQuest(patch: Partial<Quest> = {}): Quest {
  return {
    id: 'quest-test',
    title: 'Тестовый квест',
    description: '',
    difficulty: 'medium',
    skillId: null,
    dueDate: '2026-09-01',
    scheduledTime: null,
    durationMinutes: 30,
    repeatDays: [],
    isMain: false,
    completedDates: [],
    archivedAt: null,
    createdAt: '2026-09-01T08:00:00.000Z',
    ...patch,
  }
}

describe('миграция локальных данных', () => {
  it('добавляет цели и поля архива к состоянию MVP v1', () => {
    const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>
    legacy.version = 1
    delete legacy.goals
    const quests = legacy.quests as Array<Record<string, unknown>>
    quests.forEach((quest) => delete quest.archivedAt)

    const migrated = migrateState(legacy)

    expect(migrated.version).toBe(2)
    expect(migrated.goals).toEqual([])
    expect(migrated.quests.every((quest) => quest.archivedAt === null)).toBe(true)
    expect(migrated.skills).toHaveLength(8)
  })
})

describe('планирование квестов', () => {
  it('считает пропущенным только незавершённый одноразовый квест', () => {
    expect(isQuestOverdue(makeQuest(), '2026-09-02')).toBe(true)
    expect(isQuestOverdue(makeQuest({ repeatDays: [1] }), '2026-09-02')).toBe(false)
    expect(isQuestOverdue(makeQuest({ completedDates: ['2026-09-01'] }), '2026-09-02')).toBe(false)
    expect(isQuestOverdue(makeQuest({ archivedAt: '2026-09-02T08:00:00.000Z' }), '2026-09-02')).toBe(false)
  })

  it('не переносит квест без даты на экран Сегодня', () => {
    expect(isQuestForDate(makeQuest({ dueDate: null }), '2026-09-02')).toBe(false)
  })

  it('считает одноразовый квест завершённым независимо от дня просмотра', () => {
    const completed = makeQuest({ completedDates: ['2026-09-01'] })
    expect(isQuestComplete(completed, '2026-09-20')).toBe(true)
  })

  it('не показывает архивный квест на экране Сегодня', () => {
    const archived = makeQuest({ dueDate: '2026-09-02', archivedAt: '2026-09-02T08:00:00.000Z' })
    expect(isQuestForDate(archived, '2026-09-02')).toBe(false)
  })
})
