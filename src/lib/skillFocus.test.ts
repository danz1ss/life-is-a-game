import { expect, it } from 'vitest'
import { createInitialState, migrateState } from './game'
import { focusableSkills, withFocusSkills } from './skillFocus'

it('offers only terminal subskills and treats the built-in Sleep node as an area', () => {
  const state = createInitialState()
  const child = { ...state.skills.find(skill => skill.id === 'sleep')!, id: 'sleep-routine', parentId: 'sleep', isArea: false }
  expect(focusableSkills([...state.skills, child]).map(skill => skill.id))
    .toEqual(['sport', 'reading', 'english', 'programming', 'sleep-routine'])
})

it('marks Sleep as an area in old saves and preserves a later explicit choice', () => {
  const state = createInitialState()
  delete state.skills.find(skill => skill.id === 'sleep')!.isArea
  const migrated = migrateState(state)
  expect(migrated.skills.find(skill => skill.id === 'sleep')?.isArea).toBe(true)
  migrated.skills.find(skill => skill.id === 'sleep')!.isArea = false
  migrated.profile.focusSkillId = 'sleep'
  expect(migrateState(migrated).profile.focusSkillId).toBe('sleep')
})

it('clears focus when the skill becomes ineligible', () => {
  const state = createInitialState()
  state.profile.focusSkillId = 'sport'
  expect(withFocusSkills(state, state.skills).profile.focusSkillId).toBe('sport')
  expect(withFocusSkills(state, state.skills.filter(skill => skill.id !== 'sport')).profile.focusSkillId).toBeNull()
  const changed = state.skills.map(skill => skill.id === 'sport' ? { ...skill, isArea: true } : skill)
  expect(withFocusSkills(state, changed).profile.focusSkillId).toBeNull()
})
