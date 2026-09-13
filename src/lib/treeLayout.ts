import type { Skill } from './types'

// Keep saved map coordinates stable while giving larger nodes more room.
export const treeNodeWidth = 240
export const treeHeroWidth = 320
export const toTreePosition = (position: Skill['position']) => ({ x: position.x * 1.4, y: position.y * 1.15 })
export const fromTreePosition = (position: Skill['position']) => ({ x: position.x / 1.4, y: position.y / 1.15 })

export function descendantIds(skills: Skill[], id: string): Set<string> {
  const children = new Map<string, string[]>()
  for (const skill of skills) {
    if (!skill.parentId) continue
    const siblings = children.get(skill.parentId)
    if (siblings) siblings.push(skill.id)
    else children.set(skill.parentId, [skill.id])
  }
  const result = new Set([id])
  const pending = [id]
  while (pending.length) {
    for (const child of children.get(pending.pop()!) ?? []) {
      if (result.has(child)) continue
      result.add(child)
      pending.push(child)
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
