import { availableCharacter, heroStageForLevel } from './character'
import type { CharacterAppearance } from './types'
import { equipmentSets } from './equipmentSets'
import { heroArtworkFiles } from './heroArtwork'
export { equipmentSets, type EquipmentSet } from './equipmentSets'

const artwork = new Set(heroArtworkFiles)

export function equipmentArtFile(setId: string, gender: CharacterAppearance['gender'], level: number) {
  const set = equipmentSets.find(item => item.id === setId)
  if (!set) throw new RangeError('Неизвестный комплект героя')
  const stage = heroStageForLevel(level).id
  if (set.id === 'casual') return `heroes/${gender}-${stage}.png`
  if (set.id === 'crystal') return `heroes/${gender}-legend-crystal.png`
  return `heroes/equipment/${gender}-${stage}-${set.outfit}-${set.weapon}.png`
}

export function hasEquipmentArt(setId: string, gender: CharacterAppearance['gender'], level: number) {
  return artwork.has(equipmentArtFile(setId, gender, level))
}

export function equipmentForAppearance(appearance: CharacterAppearance | undefined, level: number) {
  const current = availableCharacter(appearance, level)
  // Old profiles may have chosen crystal with any legacy costume. Keep the
  // existing final portrait, rather than silently rewriting their saved data.
  if (current.weapon === 'crystal' && level >= 100) return equipmentSets.find(item => item.id === 'crystal')
  return equipmentSets.find(item => item.level <= level && item.outfit === current.outfit && item.weapon === current.weapon)
}

export function selectEquipment(appearance: CharacterAppearance, setId: string, level: number): CharacterAppearance {
  const set = equipmentSets.find(item => item.id === setId)
  if (!set || set.level > level || !hasEquipmentArt(setId, appearance.gender, level)) return appearance
  return { ...appearance, outfit: set.outfit, weapon: set.weapon }
}

export const stageOutfits = {
  boy: { child: 'Куртка новичка', teen: 'Куртка путешественника', young: 'Дорожный жилет', adult: 'Плащ героя', veteran: 'Плащ опытного героя', legend: 'Легендарные доспехи' },
  girl: { child: 'Наряд новичка', teen: 'Наряд искательницы', young: 'Наряд молодой героини', adult: 'Доспехи героини', veteran: 'Доспехи опытной героини', legend: 'Легендарные доспехи' },
} as const

export function stageOutfitLabel(level: number, gender: CharacterAppearance['gender']) {
  return stageOutfits[gender][heroStageForLevel(level).id]
}

export function renderedOutfitLabel(appearance: CharacterAppearance | undefined, level: number) {
  const character = availableCharacter(appearance, level)
  const set = equipmentForAppearance(character, level)
  return set && set.id !== 'casual' && hasEquipmentArt(set.id, character.gender, level)
    ? set.label : stageOutfitLabel(level, character.gender)
}
