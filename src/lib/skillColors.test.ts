import { describe, expect, it } from 'vitest'
import { createInitialState, migrateState } from './game'
import { migrateSkillColors, skillColorFamilies, suggestSkillColor, updateSkillColors } from './skillColors'

function legacyState() {
  const state = createInitialState()
  for (const skill of state.skills) {
    const root = skill.parentId ?? skill.id
    skill.color = root === 'health' ? '#53d6a1' : root === 'growth' ? '#9b8cff' : '#ffb45e'
  }
  state.skills.push({ ...state.skills.find((skill) => skill.id === 'programming')!, id: 'user-tutor', name: 'Репетиторство', xp: 75 })
  state.profile.totalXp = 650
  state.profile.gold = 15
  state.profile.activeDays = ['2026-09-09', '2026-09-10']
  return { ...state, version: 3 }
}

describe('persistent skill colour families', () => {
  it('migrates inherited colours without changing progress, tasks or skill data', () => {
    const old = legacyState()
    const next = migrateState(old)
    expect(next.version).toBe(5)
    expect({ ...next, skills: undefined, version: undefined }).toEqual({ ...old, skills: undefined, version: undefined })
    expect(next.skills.map(({ color: _, ...skill }) => skill)).toEqual(old.skills.map(({ color: _, ...skill }) => skill))
    expect(next.skills.find((skill) => skill.id === 'career')?.color).toBe('#eab354')
    expect(next.skills.find((skill) => skill.id === 'programming')?.color).toBe('#f8d98a')
    expect(next.skills.find((skill) => skill.id === 'user-tutor')?.color).toBe('#efa475')
    expect(new Set(next.skills.map((skill) => skill.color)).size).toBe(next.skills.length)
  })

  it('is stable after reload, importing v4 and reordering skills', () => {
    const old = legacyState()
    const next = migrateState(old)
    expect(migrateState(next)).toEqual(next)
    expect(migrateSkillColors([...old.skills].reverse()).sort((a, b) => a.id.localeCompare(b.id)))
      .toEqual([...next.skills].sort((a, b) => a.id.localeCompare(b.id)))
  })

  it('preserves explicitly customised colours', () => {
    const old = legacyState()
    old.skills.find((skill) => skill.id === 'user-tutor')!.color = '#cdaabc'
    expect(migrateState(old).skills.find((skill) => skill.id === 'user-tutor')?.color).toBe('#cdaabc')
  })

  it('offers a free shade from the root family for children and grandchildren', () => {
    const skills = migrateState(legacyState()).skills
    const color = suggestSkillColor('programming', skills)
    expect(skillColorFamilies[2].colors).toContain(color)
    expect(skills.map((skill) => skill.color)).not.toContain(color)
  })

  it('updates child shades when changing a direction, keeping unrelated skills intact', () => {
    const skills = migrateState(legacyState()).skills
    const snapshot = structuredClone(skills)
    const updated = updateSkillColors(skills, 'career', { color: '#a88bde' })
    for (const skill of updated.filter((item) => item.parentId === 'career')) {
      expect(skillColorFamilies[1].colors).toContain(skill.color)
    }
    expect(updated.find((skill) => skill.id === 'sport')).toEqual(skills.find((skill) => skill.id === 'sport'))
    expect(new Set(updated.filter((skill) => skill.parentId === 'career' || skill.id === 'career').map((skill) => skill.color)).size).toBe(3)
    expect(skills).toEqual(snapshot)
    expect(updated.find((skill) => skill.id === 'sport')).toBe(skills.find((skill) => skill.id === 'sport'))
  })
})
