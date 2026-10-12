import type { Skill } from './types'

// Keep saved map coordinates stable while giving larger nodes more room.
export const treeNodeWidth = 240
export const treeHeroWidth = 320
export const toTreePosition = (position: Skill['position']) => ({ x: position.x * 1.4, y: position.y * 1.15 })
export const fromTreePosition = (position: Skill['position']) => ({ x: position.x / 1.4, y: position.y / 1.15 })

export function selectionForBranch(skills: Skill[], selectedId: string | null, branchId: string | null): string | null {
  if (!selectedId || !skills.some(skill => skill.id === selectedId)) return null
  return !branchId || descendantIds(skills, branchId).has(selectedId) ? selectedId : null
}

export function skillAncestorPath(skills: Skill[], selectedId: string | null, branchId: string | null): string[] {
  if (!selectedId) return []
  const byId = new Map(skills.map(skill => [skill.id, skill]))
  const path: string[] = []
  const visited = new Set<string>()
  let id: string | null = selectedId
  while (id) {
    const skill = byId.get(id)
    if (!skill || visited.has(id)) return []
    visited.add(id); path.push(id)
    if (id === branchId) return path.reverse()
    id = skill.parentId
  }
  return branchId ? [] : ['player-root', ...path.reverse()]
}

type ScreenBounds = { left: number; top: number; right: number; bottom: number }
type Viewport = { x: number; y: number; zoom: number }
export function viewportForVisibleNode(node: ScreenBounds, free: ScreenBounds, viewport: Viewport): Viewport {
  const shift = (start: number, end: number, min: number, max: number) => {
    if (end - start > max - min) return min - start
    if (start < min) return min - start
    if (end > max) return max - end
    return 0
  }
  const dx = shift(node.left, node.right, free.left, free.right)
  const dy = shift(node.top, node.bottom, free.top, free.bottom)
  return Math.abs(dx) < .5 && Math.abs(dy) < .5 ? viewport : { ...viewport, x: viewport.x + dx, y: viewport.y + dy }
}

export function moveSkillWithKey(position: Skill['position'], key: string): Skill['position'] | null {
  const offset: Record<string, [number, number]> = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }
  const delta = offset[key]
  if (!delta) return null
  const flow = toTreePosition(position)
  return fromTreePosition({ x: flow.x + delta[0], y: flow.y + delta[1] })
}

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
