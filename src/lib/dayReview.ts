import { isQuestComplete, isQuestForDate, isQuestSkipped, nextDateKey } from './game'
import type { AppState, Quest } from './types'

export type DayReviewDecision = { kind: 'transfer'; batchId: string } | { kind: 'decline'; at: string }

export function isUnmarkedQuest(quest: Quest, onDate: string) {
  return isQuestForDate(quest, onDate) && !isQuestComplete(quest, onDate) && !isQuestSkipped(quest, onDate)
}

export function closeQuestDay(state: AppState, onDate: string, decision?: DayReviewDecision) {
  const pending = new Set(state.quests.filter(quest => isUnmarkedQuest(quest, onDate)).map(quest => quest.id))
  if (pending.size && !decision) return { state }
  const tomorrow = nextDateKey(onDate)
  const removed = new Set<string>()
  const transfers: Quest[] = []
  const quests = decision && pending.size ? state.quests.map(quest => {
    if (!pending.has(quest.id)) return quest
    const recurring = quest.repeatDays.length > 0
    if (decision.kind === 'decline') {
      if (recurring) return { ...quest, skippedDates: [...quest.skippedDates, onDate] }
      removed.add(quest.id)
      return { ...quest, archivedAt: decision.at, isMain: false }
    }
    removed.add(quest.id)
    if (!recurring) return { ...quest, dueDate: tomorrow, isMain: false, skippedDates: quest.skippedDates.filter(date => date !== tomorrow) }
    // A scheduled repeat tomorrow is a separate occurrence, so keep both.
    transfers.push({
      ...quest, id: `${decision.batchId}:${quest.id}`, dueDate: tomorrow, repeatDays: [],
      isMain: false, completedDates: [], skippedDates: [], transferredDates: undefined, transferredFrom: onDate,
    })
    return { ...quest, transferredDates: [...(quest.transferredDates ?? []), onDate] }
  }) : state.quests

  const plan = state.dayPlans[onDate] ?? { mainQuestId: null, questOrder: [] }
  const dayPlans = { ...state.dayPlans, [onDate]: {
    ...plan, closed: true,
    mainQuestId: plan.mainQuestId && removed.has(plan.mainQuestId) ? null : plan.mainQuestId,
    questOrder: plan.questOrder.filter(id => !removed.has(id)),
  } }
  if (decision?.kind === 'transfer' && pending.size && dayPlans[tomorrow]?.closed) {
    dayPlans[tomorrow] = { ...dayPlans[tomorrow], closed: false }
  }
  return { state: { ...state, quests: transfers.length ? [...quests, ...transfers] : quests, dayPlans } }
}
