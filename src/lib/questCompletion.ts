import { difficultyConfig, isQuestComplete, isQuestSkipped } from './game'
import type { AppState, HistoryEvent } from './types'

// Undo the recorded award: a quest's difficulty and skill can change after completion.
function undoCompletion(state: AppState, id: string, onDate: string): AppState {
  const quest = state.quests.find((item) => item.id === id)
  if (!quest) return state
  const completionDate = quest.repeatDays.length ? onDate : quest.completedDates[0]
  const eventIndex = state.history.findIndex((event) => event.type === 'quest' && event.questId === id && event.date === completionDate)
  const event = state.history[eventIndex]
  const history = event ? state.history.filter((_, index) => index !== eventIndex) : state.history
  return {
    ...state,
    profile: event ? {
      ...state.profile,
      totalXp: Math.max(0, state.profile.totalXp - event.xp),
      gold: Math.max(0, state.profile.gold - event.gold),
      activeDays: activeDays(history),
    } : state.profile,
    skills: event ? state.skills.map((skill) => skill.id === event.skillId
      ? { ...skill, xp: Math.max(0, skill.xp - event.xp) } : skill) : state.skills,
    quests: state.quests.map((item) => item.id === id ? {
      ...item,
      completedDates: item.repeatDays.length ? item.completedDates.filter((date) => date !== completionDate) : [],
    } : item),
    history,
  }
}

function activeDays(history: HistoryEvent[]) {
  return [...new Set(history.filter((event) => event.type === 'quest').map((event) => event.date))].sort()
}

export function toggleQuestCompletion(state: AppState, id: string, onDate: string, eventId: string, createdAt: string): AppState {
  const quest = state.quests.find((item) => item.id === id)
  if (!quest) return state
  if (isQuestComplete(quest, onDate)) return undoCompletion(state, id, onDate)
  const reward = difficultyConfig[quest.difficulty]
  const history: HistoryEvent[] = [...state.history, {
    id: eventId, type: 'quest', date: onDate, createdAt, title: quest.title,
    questId: id, skillId: quest.skillId, xp: reward.xp, gold: reward.gold,
  }]
  return {
    ...state,
    profile: { ...state.profile, totalXp: state.profile.totalXp + reward.xp, gold: state.profile.gold + reward.gold, activeDays: activeDays(history) },
    skills: state.skills.map((skill) => skill.id === quest.skillId ? { ...skill, xp: skill.xp + reward.xp } : skill),
    quests: state.quests.map((item) => item.id === id ? {
      ...item,
      dueDate: item.repeatDays.length ? item.dueDate : onDate,
      completedDates: item.repeatDays.length ? [...item.completedDates, onDate] : [onDate],
      skippedDates: item.skippedDates.filter((date) => date !== onDate),
    } : item),
    history,
  }
}

export function toggleQuestSkipped(state: AppState, id: string, onDate: string): AppState {
  const quest = state.quests.find((item) => item.id === id)
  if (!quest) return state
  const skipped = isQuestSkipped(quest, onDate)
  const next = isQuestComplete(quest, onDate) ? undoCompletion(state, id, onDate) : state
  return {
    ...next,
    quests: next.quests.map((item) => item.id === id ? {
      ...item,
      skippedDates: skipped ? item.skippedDates.filter((date) => date !== onDate) : [...item.skippedDates, onDate],
    } : item),
  }
}
