import type { AppState, Skill } from './types'

export function focusableSkills(skills: Skill[]) {
  const parentIds = new Set(skills.map(skill => skill.parentId))
  const ids = new Set(skills.map(skill => skill.id))
  return skills.filter(skill => !skill.isArea && skill.parentId !== null
    && ids.has(skill.parentId) && !parentIds.has(skill.id))
}

export function withFocusSkills(state: AppState, skills: Skill[]): AppState {
  const focusId = state.profile.focusSkillId
  const profile = focusId && !focusableSkills(skills).some(skill => skill.id === focusId)
    ? { ...state.profile, focusSkillId: null }
    : state.profile
  return { ...state, skills, profile }
}
