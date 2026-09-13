import type { Skill } from './types'
import { descendantIds } from './treeLayout'

export const skillColorFamilies = [
  { name: 'Зелёная', legacy: '#53d6a1', colors: ['#62bf91', '#b1d88c', '#7ad3b3', '#87ba77', '#b1e2bb', '#59ac83'] },
  { name: 'Фиолетовая', legacy: '#9b8cff', colors: ['#a88bde', '#d0b8ed', '#bc83da', '#b5a0ef', '#e0b6e9', '#aa75ba'] },
  { name: 'Янтарная', legacy: '#ffb45e', colors: ['#eab354', '#f8d98a', '#efa475', '#d7bd8b', '#f2c5a1', '#d5a068'] },
  { name: 'Голубая', legacy: '#5bbcf6', colors: ['#8bc9f0', '#b1e1f5', '#8eb4e6', '#91d9d8', '#c3d4f1', '#7fb6cb'] },
  { name: 'Розовая', legacy: '#ff758f', colors: ['#df99ad', '#f2c3cf', '#e9abc7', '#cc98b7', '#f0b8af', '#d2899c'] },
  { name: 'Жёлтая', legacy: '#e6d36a', colors: ['#d6cb7e', '#ece1a4', '#c3ce89', '#e8ca8d', '#d4be86', '#efe6bb'] },
]

export const defaultSkillColors: Record<string, string> = {
  health: '#62bf91', sport: '#b1d88c', sleep: '#7ad3b3',
  growth: '#a88bde', reading: '#d0b8ed', english: '#bc83da',
  career: '#eab354', programming: '#f8d98a',
}

export function skillRoot(skill: Skill, skills: Skill[]): Skill {
  let current = skill
  const visited = new Set([current.id])
  while (current.parentId) {
    const parent = skills.find((item) => item.id === current.parentId)
    if (!parent || visited.has(parent.id)) break
    visited.add(parent.id)
    current = parent
  }
  return current
}

export function skillFamilyColors(color: string): string[] {
  const family = skillColorFamilies.find((item) => item.legacy === color.toLowerCase() || item.colors.includes(color.toLowerCase()))
  if (family) return family.colors
  // Imported custom colours retain their own hue; offer lighter related shades.
  if (!/^#[\da-f]{6}$/i.test(color)) return skillColorFamilies[0].colors
  const channels = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16))
  return [color, ...[.2, .4, .55, .7].map((amount) => '#' + channels.map((channel) => Math.round(channel + (255 - channel) * amount).toString(16).padStart(2, '0')).join(''))]
}

export function suggestSkillColor(parentId: string | null, skills: Skill[], excludedId?: string): string {
  const parent = skills.find((skill) => skill.id === parentId)
  if (!parent) return skillColorFamilies[0].colors[0]
  const root = skillRoot(parent, skills)
  const palette = skillFamilyColors(root.color)
  const used = skills.filter((skill) => skill.id !== excludedId && skillRoot(skill, skills).id === root.id).map((skill) => skill.color.toLowerCase())
  return palette.slice(1).find((color) => !used.includes(color.toLowerCase())) ?? palette.find((color) => !used.includes(color.toLowerCase())) ?? palette[1]
}

export function updateSkillColors(skills: Skill[], id: string, patch: Partial<Skill>): Skill[] {
  const original = skills.find((skill) => skill.id === id)
  if (!original) return skills
  const updated = skills.map((skill) => skill.id === id ? { ...skill, ...patch } : skill)
  const oldPalette = skillFamilyColors(skillRoot(original, skills).color)
  const newPalette = skillFamilyColors(skillRoot(updated.find((skill) => skill.id === id)!, updated).color)
  if (oldPalette[0] === newPalette[0]) return updated
  const descendants = descendantIds(updated, id)
  const indexes = new Map(updated.map((skill, index) => [skill.id, index]))
  for (const skill of updated.filter((item) => item.id !== id && descendants.has(item.id) && oldPalette.includes(item.color)).sort((a, b) => a.id.localeCompare(b.id))) {
    updated[indexes.get(skill.id)!] = { ...skill, color: suggestSkillColor(skill.parentId, updated, skill.id) }
  }
  return updated
}

/** Upgrade only the old inherited colours, retaining custom choices and all game data. */
export function migrateSkillColors(skills: Skill[]): Skill[] {
  const result = skills.map((skill) => ({ ...skill }))
  for (const root of result.filter((skill) => !skill.parentId)) {
    const family = skillColorFamilies.find((item) => item.legacy === root.color.toLowerCase())
    if (!family) continue
    root.color = family.colors[0]
    const inherited = result.filter((skill) => skill.parentId && skillRoot(skill, result).id === root.id && skill.color.toLowerCase() === family.legacy)
    // Assign the built-in skills first, so added skills receive the remaining shades.
    for (const skill of inherited.filter((item) => defaultSkillColors[item.id])) skill.color = defaultSkillColors[skill.id]
    for (const skill of inherited.filter((item) => !defaultSkillColors[item.id]).sort((a, b) => a.id.localeCompare(b.id))) {
      skill.color = suggestSkillColor(skill.parentId, result, skill.id)
    }
  }
  return result
}
