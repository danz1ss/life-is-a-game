import type { AppState, Quest } from './types'

export function removeQuest(state: AppState, id: string): AppState {
  return { ...state, quests: state.quests.filter((quest) => quest.id !== id) }
}

export function restoreDeletedQuest(state: AppState, quest: Quest): AppState {
  if (state.quests.some((item) => item.id === quest.id)) return state
  return {
    ...state,
    quests: [...state.quests, {
      ...quest,
      isMain: quest.isMain && !state.quests.some((item) => item.isMain),
      skillId: state.skills.some((skill) => skill.id === quest.skillId) ? quest.skillId : null,
    }].sort((a, b) => a.order - b.order),
  }
}
