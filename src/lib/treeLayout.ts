import type { Skill } from './types'

// Keep saved map coordinates stable while giving larger nodes more room.
export const treeNodeWidth = 240
export const treeHeroWidth = 320
export const toTreePosition = (position: Skill['position']) => ({ x: position.x * 1.4, y: position.y * 1.15 })
export const fromTreePosition = (position: Skill['position']) => ({ x: position.x / 1.4, y: position.y / 1.15 })

export function descendantIds(skills: Skill[], id: string): Set<string> {
  const result = new Set([id])
  let changed = true
  while (changed) {
    changed = false
    for (const skill of skills) if (skill.parentId && result.has(skill.parentId) && !result.has(skill.id)) {
      result.add(skill.id)
      changed = true
    }
  }
  return result
}

export function nextSkillPosition(skills: Skill[], parentId: string | null): Skill['position'] {
  const parent = skills.find((skill) => skill.id === parentId)
  const start = parent ? { x: parent.position.x, y: parent.position.y + 220 } : { x: -410, y: 150 }
  for (let index = 0; ; index++) {
    const position = { x: start.x + index * 210, y: start.y }
    if (!skills.some((skill) => Math.abs(skill.position.x - position.x) < 195 && Math.abs(skill.position.y - position.y) < 150)) return position
  }
}
