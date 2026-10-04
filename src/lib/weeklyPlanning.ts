import type { AppState, DeletedWeeklyTask, WeeklyPlan, WeeklyTask } from './types'

export const weeklyTaskTitleLimit = 300
export const weeklyTaskLimit = 5

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const boundedId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 100
const taskTitle = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= weeklyTaskTitleLimit

function calendarDate(day: unknown): Date | null {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const date = new Date(`${day}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day ? date : null
}

/** A local calendar day is supplied as a date key, so DST never changes the week. */
export function weekMonday(day: string): string {
  const date = calendarDate(day)
  if (!date) throw new RangeError('Некорректная дата недели')
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
  const monday = date.toISOString().slice(0, 10)
  if (!calendarDate(monday)) throw new RangeError('Неделя выходит за пределы календаря')
  return monday
}

export function isWeekMonday(value: unknown): value is string {
  const date = calendarDate(value)
  return Boolean(date && date.getUTCDay() === 1)
}

export function shiftWeek(monday: string, offset = 1): string {
  const date = calendarDate(monday)
  if (!date || date.getUTCDay() !== 1 || !Number.isSafeInteger(offset)) throw new RangeError('Некорректная неделя')
  date.setUTCDate(date.getUTCDate() + offset * 7)
  if (!Number.isFinite(date.getTime())) throw new RangeError('Неделя выходит за пределы календаря')
  const shifted = date.toISOString().slice(0, 10)
  if (!calendarDate(shifted)) throw new RangeError('Неделя выходит за пределы календаря')
  return shifted
}

function isWeeklyTask(value: unknown): value is WeeklyTask {
  return record(value) && Object.keys(value).every((key) => ['id', 'title', 'done'].includes(key))
    && boundedId(value.id) && taskTitle(value.title) && typeof value.done === 'boolean'
}

function isReviewTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.toISOString() === value
}

export function isWeeklyPlan(value: unknown): value is WeeklyPlan {
  return record(value) && Object.keys(value).every((key) => ['tasks', 'reviewedAt'].includes(key))
    && Array.isArray(value.tasks) && value.tasks.length <= weeklyTaskLimit && value.tasks.every(isWeeklyTask)
    && new Set(value.tasks.map((task) => task.id)).size === value.tasks.length
    && (value.reviewedAt === null || isReviewTimestamp(value.reviewedAt))
}

export function weeklyPlanError(titles: string[]): string | null {
  if (titles.length < 3 || titles.length > weeklyTaskLimit) return 'Запишите от 3 до 5 главных задач на неделю.'
  if (titles.some((title) => !taskTitle(title))) return `Название каждой задачи должно содержать от 1 до ${weeklyTaskTitleLimit} символов.`
  return null
}

function writePlan(state: AppState, week: string, plan: WeeklyPlan): AppState {
  return { ...state, weeklyPlans: { ...state.weeklyPlans, [week]: plan } }
}

export function upsertWeeklyTask(state: AppState, week: string, id: string, title: string): AppState {
  const trimmed = title.trim()
  if (!isWeekMonday(week) || !boundedId(id) || !taskTitle(trimmed)) return state
  const plan = state.weeklyPlans[week] ?? { tasks: [], reviewedAt: null }
  const existing = plan.tasks.find((task) => task.id === id)
  if (existing?.title === trimmed || (!existing && plan.tasks.length >= weeklyTaskLimit)) return state
  const tasks = existing ? plan.tasks.map((task) => task.id === id ? { ...task, title: trimmed } : task)
    : [...plan.tasks, { id, title: trimmed, done: false }]
  return writePlan(state, week, { ...plan, tasks })
}

export function toggleWeeklyTaskCompletion(state: AppState, week: string, id: string): AppState {
  if (!isWeekMonday(week)) return state
  const plan = state.weeklyPlans[week]
  if (!plan?.tasks.some((task) => task.id === id)) return state
  return writePlan(state, week, { ...plan, tasks: plan.tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task) })
}

export function removeWeeklyTask(state: AppState, week: string, id: string): AppState {
  if (!isWeekMonday(week)) return state
  const plan = state.weeklyPlans[week]
  if (!plan?.tasks.some((task) => task.id === id)) return state
  return writePlan(state, week, { ...plan, tasks: plan.tasks.filter((task) => task.id !== id) })
}

export function restoreWeeklyTask(state: AppState, deleted: DeletedWeeklyTask): AppState {
  if (!isWeekMonday(deleted.week) || !isWeeklyTask(deleted.task)) return state
  const plan = state.weeklyPlans[deleted.week] ?? { tasks: [], reviewedAt: null }
  if (plan.tasks.length >= weeklyTaskLimit || plan.tasks.some((task) => task.id === deleted.task.id)) return state
  const tasks = [...plan.tasks]
  tasks.splice(Math.max(0, Math.min(tasks.length, deleted.index)), 0, { ...deleted.task })
  return writePlan(state, deleted.week, { ...plan, tasks })
}

/** Resuming a prepared plan keeps unchanged tasks; new lines start unchecked. */
export function replaceWeeklyPlan(state: AppState, week: string, tasks: WeeklyTask[]): AppState {
  const titles = tasks.map((task) => task.title.trim())
  const draft = { tasks: tasks.map((task, index) => ({ ...task, title: titles[index], done: false })), reviewedAt: null }
  if (!isWeekMonday(week) || weeklyPlanError(titles) || !isWeeklyPlan(draft)) return state
  const existing = state.weeklyPlans[week]
  const retainedIds = new Set<string>()
  const nextTasks = draft.tasks.map((task) => {
    const match = existing?.tasks.find((item) => item.title.trim() === task.title && !retainedIds.has(item.id))
    if (!match) return task
    retainedIds.add(match.id)
    return match
  })
  // Matching is by title because a multiline planning form has no task IDs.
  // Inline editing remains the path for changing a completed task's title.
  const plan = { tasks: nextTasks, reviewedAt: existing?.reviewedAt ?? null }
  if (!isWeeklyPlan(plan)) return state
  if (existing && existing.tasks.length === nextTasks.length && existing.tasks.every((task, index) => task === nextTasks[index])) return state
  return writePlan(state, week, plan)
}

export function reviewWeeklyPlan(state: AppState, week: string, reviewedAt: string): AppState {
  if (!isWeekMonday(week) || !isReviewTimestamp(reviewedAt)) return state
  const plan = state.weeklyPlans[week] ?? { tasks: [], reviewedAt: null }
  if (plan.reviewedAt === reviewedAt) return state
  return writePlan(state, week, { ...plan, reviewedAt })
}
