import type { AppState } from './types'

type Check = (value: unknown) => boolean
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const string: Check = (value) => typeof value === 'string'
const id: Check = (value) => typeof value === 'string' && value.length > 0
const number: Check = (value) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER
const positive: Check = (value) => number(value) && (value as number) > 0
const nonnegative: Check = (value) => number(value) && (value as number) >= 0
const level: Check = (value) => positive(value) && Number.isInteger(value)
const nullable = (check: Check): Check => (value) => value === null || check(value)
const optional = (check: Check): Check => (value) => value === undefined || check(value)
const array = (check: Check): Check => (value) => Array.isArray(value) && value.every(check)
const oneOf = (...values: unknown[]): Check => (value) => values.includes(value)
const object = (fields: Record<string, Check>): Check => (value) => record(value) && Object.entries(fields).every(([key, check]) => check(value[key]))
const timestamp: Check = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value))
const date: Check = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}
const time: Check = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
const entities = (fields: Record<string, Check>): Check => (value) => {
  if (!array(object({ id, ...fields }))(value)) return false
  const items = value as Array<{ id: string }>
  return new Set(items.map((item) => item.id)).size === items.length
}

// Validate migrated data before rendering it or replacing a user's saved profile.
export function assertValidState(value: unknown): asserts value is AppState {
  const sections: Record<string, Check> = {
    profile: object({ name: string, avatar: string, totalXp: nonnegative, gold: nonnegative, activeDays: array(date) }),
    skills: entities({
      name: string, description: string, icon: string, color: string, parentId: nullable(id), xp: nonnegative,
      position: object({ x: number, y: number }), requiredParentLevel: positive, createdAt: timestamp,
    }),
    quests: entities({
      title: string, description: string, difficulty: oneOf('easy', 'medium', 'hard'), skillId: nullable(id),
      dueDate: nullable(date), scheduledTime: nullable(time), durationMinutes: positive,
      repeatDays: array(oneOf(0, 1, 2, 3, 4, 5, 6)), isMain: oneOf(true, false), order: number,
      completedDates: array(date), skippedDates: array(date), archivedAt: nullable(timestamp), createdAt: timestamp,
    }),
    goals: entities({
      skillId: id, title: string, purpose: string, successCriteria: string, targetDate: nullable(date),
      progress: (value) => nonnegative(value) && (value as number) <= 100,
      status: oneOf('active', 'paused', 'completed'), createdAt: timestamp, completedAt: nullable(timestamp),
    }),
    rewards: entities({ title: string, description: string, icon: string, cost: nonnegative, createdAt: timestamp }),
    history: entities({
      type: oneOf('quest', 'reward', 'goal', 'level', 'level-reward'), date, createdAt: timestamp, title: string,
      questId: optional(id), rewardId: optional(id), goalId: optional(id), skillId: optional(nullable(id)), xp: nonnegative, gold: number,
    }),
    dayPlans: (value) => record(value) && Object.entries(value).every(([key, plan]) => date(key) && object({ mainQuestId: nullable(id), questOrder: array(id) })(plan)),
    levelRewards: (value) => object({
      highestLevel: level, acknowledgedLevel: level,
      personal: entities({ title: id, level, claimedAt: nullable(timestamp) }),
    })(value) && record(value) && (value.acknowledgedLevel as number) <= (value.highestLevel as number),
  }
  for (const [section, check] of Object.entries(sections)) {
    if (!record(value) || !check(value[section])) throw new Error(`Некорректные данные в разделе «${section}». Сохранение не изменено.`)
  }
}
