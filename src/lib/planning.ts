import { isQuestForDate } from './game'
import type { AppState, Quest } from './types'

export function questsForDay(state: AppState, date: string): Quest[] {
  const plan = state.dayPlans[date]
  const order = new Map(plan?.questOrder.map((id, index) => [id, index]) ?? [])
  return state.quests.filter((quest) => isQuestForDate(quest, date))
    .map((quest) => ({ ...quest, isMain: plan?.mainQuestId === quest.id }))
    .sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity) || a.order - b.order)
}

export function upcomingQuests(quests: Quest[], tomorrow: string): Quest[] {
  return quests.filter((quest) => !quest.archivedAt && !quest.repeatDays.length && !quest.completedDates.length && (!quest.dueDate || quest.dueDate > tomorrow))
    .sort((a, b) => a.dueDate && b.dueDate ? a.dueDate.localeCompare(b.dueDate) || a.order - b.order
      : a.dueDate ? -1 : b.dueDate ? 1 : a.order - b.order)
}

export function assignMainQuest(state: AppState, id: string | null, date: string): AppState {
  if (id && !state.quests.some((quest) => quest.id === id && isQuestForDate(quest, date))) return state
  return { ...state, dayPlans: { ...state.dayPlans, [date]: { ...(state.dayPlans[date] ?? { questOrder: [] }), mainQuestId: id } } }
}

export function reorderDayQuest(state: AppState, source: string, target: string, placement: 'before' | 'after', date: string): AppState {
  if (source === target) return state
  const ids = questsForDay(state, date).map((quest) => quest.id)
  if (!ids.includes(source) || !ids.includes(target)) return state
  ids.splice(ids.indexOf(source), 1)
  ids.splice(ids.indexOf(target) + (placement === 'after' ? 1 : 0), 0, source)
  return { ...state, dayPlans: { ...state.dayPlans, [date]: { ...(state.dayPlans[date] ?? { mainQuestId: null }), questOrder: ids } } }
}

export function patchPlannedQuest(state: AppState, id: string, patch: Partial<Quest>, contextDate: string): AppState {
  const original = state.quests.find((quest) => quest.id === id)
  if (!original) return state
  const updated = { ...original, ...patch, isMain: false }
  let next = { ...state, quests: state.quests.map((quest) => quest.id === id ? updated : quest) }
  // Changing a date or recurrence invalidates only selections that no longer apply.
  for (const [date, plan] of Object.entries(next.dayPlans)) {
    if (plan.mainQuestId === id && !isQuestForDate(updated, date)) next = assignMainQuest(next, null, date)
  }
  const date = updated.repeatDays.length ? contextDate : updated.dueDate
  if (date && patch.isMain === true) next = assignMainQuest(next, id, date)
  if (patch.isMain === false && next.dayPlans[contextDate]?.mainQuestId === id) next = assignMainQuest(next, null, contextDate)
  return next
}
