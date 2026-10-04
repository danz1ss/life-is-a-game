import { isQuestComplete, isQuestForDate, isQuestSkipped } from './game'
import type { AppState } from './types'

export function closeQuestDay(state: AppState, onDate: string) {
  let unresolved = 0
  let skippedRepeats = 0
  const quests = state.quests.map((quest) => {
    if (!isQuestForDate(quest, onDate) || isQuestComplete(quest, onDate)) return quest
    if (!quest.repeatDays.length) {
      unresolved++
      return quest
    }
    if (isQuestSkipped(quest, onDate)) return quest
    skippedRepeats++
    return { ...quest, skippedDates: [...quest.skippedDates, onDate] }
  })
  const plan = state.dayPlans[onDate] ?? { mainQuestId: null, questOrder: [] }
  return {
    state: { ...state, quests, dayPlans: { ...state.dayPlans, [onDate]: { ...plan, closed: true } } },
    unresolved,
    skippedRepeats,
  }
}
