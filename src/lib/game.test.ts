import { describe, expect, it } from 'vitest'
import { createInitialState, isQuestComplete, isQuestForDate, isQuestOverdue, isQuestSkipped, levelProgress, migrateState, nextDateKey } from './game'
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
    order: 0,
    completedDates: [],
    skippedDates: [],
    archivedAt: null,
    createdAt: '2026-09-01T08:00:00.000Z',
    ...patch,
  }
}

describe('миграция локальных данных', () => {
  it.each([null, {}, [], { quests: [], skills: [] }])('rejects incomplete saves instead of replacing them with a new profile: %j', (value) => {
    expect(() => migrateState(value)).toThrow()
  })

  it.each([
    (state: Record<string, unknown>) => { state.profile = { name: 'Broken' } },
    (state: Record<string, unknown>) => { state.skills = [null] },
    (state: Record<string, unknown>) => { state.quests = [null] },
    (state: Record<string, unknown>) => { state.history = 'invalid' },
    (state: Record<string, unknown>) => { state.goals = 'invalid' },
    (state: Record<string, unknown>) => { state.version = 6 },
  ])('rejects malformed sections and unsupported versions', (corrupt) => {
    const state = structuredClone(createInitialState()) as unknown as Record<string, unknown>
    corrupt(state)
    expect(() => migrateState(state)).toThrow()
  })

  it('rejects invalid numbers, dates, difficulties and duplicate IDs', () => {
    const state = createInitialState()
    expect(() => migrateState({ ...state, profile: { ...state.profile, totalXp: Infinity } })).toThrow()
    expect(() => migrateState({ ...state, rewards: [{ ...state.rewards[0], cost: -10 }] })).toThrow()
    for (const patch of [{ difficulty: 'unknown' }, { dueDate: '2026-02-31' }, { repeatDays: null }, { skippedDates: 'invalid' }]) {
      expect(() => migrateState({ ...state, quests: [{ ...state.quests[0], ...patch }] })).toThrow()
    }
    expect(() => migrateState({ ...state, skills: [state.skills[0], state.skills[0]] })).toThrow()
    expect(() => migrateState({ ...state, dayPlans: undefined })).toThrow()
    expect(() => migrateState({ ...state, levelRewards: undefined })).toThrow()
  })

  it('добавляет цели и поля архива к состоянию MVP v1', () => {
    const legacy = structuredClone(createInitialState()) as unknown as Record<string, unknown>
    legacy.version = 1
    delete legacy.goals
    const quests = legacy.quests as Array<Record<string, unknown>>
    quests.forEach((quest) => {
      delete quest.archivedAt
      delete quest.skippedDates
      delete quest.order
    })

    const migrated = migrateState(legacy)

    expect(migrated.version).toBe(5)
    expect(migrated.goals).toEqual([])
    expect(migrated.quests.every((quest) => quest.archivedAt === null)).toBe(true)
    expect(migrated.quests.every((quest) => quest.skippedDates.length === 0)).toBe(true)
    expect(migrated.quests.map((quest) => quest.order)).toEqual(migrated.quests.map((_, index) => index))
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

  it('сохраняет пропущенный квест в итогах текущего дня после переноса', () => {
    const skipped = makeQuest({ dueDate: '2026-09-02', skippedDates: ['2026-09-01'] })
    expect(isQuestSkipped(skipped, '2026-09-01')).toBe(true)
    expect(isQuestForDate(skipped, '2026-09-01')).toBe(true)
    expect(isQuestForDate(skipped, '2026-09-02')).toBe(true)
  })

  it('вычисляет следующий локальный календарный день', () => {
    expect(nextDateKey('2026-12-31')).toBe('2027-01-01')
  })
})

describe('level progress', () => {
  it.each([[100, 35], [80, 30], [100, 0], [1, 100]])('preserves thresholds for base %s and growth %s', (base, growth) => {
    let threshold = 0
    for (let level = 1; level <= 1000; level++) {
      const needed = base + (level - 1) * growth
      expect(levelProgress(threshold, base, growth)).toEqual({ level, needed, current: 0, percent: 0 })
      expect(levelProgress(threshold + needed - 1, base, growth).level).toBe(level)
      threshold += needed
    }
  })

  it('handles large imported XP and invalid input without a long-running loop', () => {
    const progress = levelProgress(Number.MAX_SAFE_INTEGER)
    expect(progress.level).toBeGreaterThan(1_000_000)
    expect(progress.current).toBeGreaterThanOrEqual(0)
    expect(progress.current).toBeLessThan(progress.needed)
    expect(levelProgress(-1).current).toBe(0)
    expect(levelProgress(Infinity).level).toBe(1)
    expect(() => levelProgress(100, 0)).toThrow()
    expect(() => levelProgress(100, 100, -1)).toThrow()
  })
})
