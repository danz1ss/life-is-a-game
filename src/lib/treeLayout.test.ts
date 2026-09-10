import { describe, expect, it } from 'vitest'
import { createInitialState, migrateState } from './game'
import { descendantIds, fromTreePosition, nextSkillPosition, toTreePosition } from './treeLayout'

describe('дерево навыков', () => {
  it('создаёт три направления, у карьеры только программирование', () => {
    const { skills } = createInitialState()
    expect(skills.filter(skill => !skill.parentId).map(skill => skill.name)).toEqual(['Здоровье', 'Развитие', 'Карьера'])
    for (const parent of ['health', 'growth']) expect(skills.filter(skill => skill.parentId === parent)).toHaveLength(2)
    expect(skills.filter(skill => skill.parentId === 'career').map(skill => skill.id)).toEqual(['programming'])
    expect(skills.every(skill => skill.xp === 0)).toBe(true)
  })
  it('не возвращает удалённые навыки и не дублирует пользовательское дерево при загрузке', () => {
    const state = createInitialState()
    state.skills = state.skills.filter(skill => skill.id !== 'sleep')
    state.skills[0].name = 'Моё здоровье'
    state.skills[0].xp = 120
    expect(migrateState(state)).toEqual(state)
  })
  it('сохраняет логические координаты после перетаскивания увеличенного узла', () => {
    const position = { x: -283.75, y: 401.5 }
    const restored = fromTreePosition(toTreePosition(position))
    expect(restored.x).toBeCloseTo(position.x)
    expect(restored.y).toBeCloseTo(position.y)
  })
  it('добавляет поднавык ниже родителя в свободное место', () => {
    const { skills } = createInitialState()
    const position = nextSkillPosition(skills, 'health')
    expect(position.y).toBeGreaterThan(skills[0].position.y)
    expect(skills.every(skill => Math.abs(skill.position.x-position.x) >= 195 || Math.abs(skill.position.y-position.y) >= 150)).toBe(true)
  })
  it('исключает всю дочернюю цепочку из выбора родителя и выдерживает старые циклы', () => {
    const { skills } = createInitialState()
    skills.push({ ...skills[0], id: 'child', parentId: 'sport' })
    expect([...descendantIds(skills, 'health')].sort()).toEqual(['child', 'health', 'sleep', 'sport'])
    skills[0].parentId = 'child'
    expect(descendantIds(skills, 'health').size).toBe(4)
  })
})
