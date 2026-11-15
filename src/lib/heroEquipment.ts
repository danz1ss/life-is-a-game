import { availableCharacter, characterOptions, heroStageForLevel, heroStages } from './character'
import type { CharacterAppearance } from './types'
import { equipmentSets } from './equipmentSets'
import { heroArtworkFiles } from './heroArtwork'
export { equipmentSets, type EquipmentSet } from './equipmentSets'

const artwork = new Set(heroArtworkFiles)

export function exactHeroArt(character: CharacterAppearance, level: number) {
  const stage = heroStageForLevel(level)
  const { gender, outfit, weapon } = character
  if (outfit === 'casual' && weapon === 'none') return `heroes/${gender}-${stage.id}.png`
  if ((outfit === 'celestial' || outfit === 'casual') && weapon === 'crystal' && stage.id === 'legend') {
    return `heroes/${gender}-legend-crystal.png`
  }
  const file = `heroes/equipment/${gender}-${stage.id}-${outfit}-${weapon}.png`
  if (artwork.has(file)) return file
  // Keep a complete earlier illustration when a pairing has no art for this stage.
  for (let index = heroStages.length - 1; index >= 0; index--) {
    const earlier = heroStages[index]
    if (earlier.level >= stage.level) continue
    const previous = `heroes/equipment/${gender}-${earlier.id}-${outfit}-${weapon}.png`
    if (artwork.has(previous)) return previous
  }
}

export function heroEquipmentPortrait(character: CharacterAppearance, level: number) {
  const exact = exactHeroArt(character, level)
  if (exact) return exact
  // Equipment unlocks and portrait stages are independent. Use the first
  // later illustration of the same pairing if there is no current or earlier one.
  const { gender, outfit, weapon } = character
  const stage = heroStageForLevel(level)
  for (const later of heroStages) {
    if (later.level <= stage.level) continue
    const file = `heroes/equipment/${gender}-${later.id}-${outfit}-${weapon}.png`
    if (artwork.has(file)) return file
  }
}

export function tryHeroEquipment(
  appearance: CharacterAppearance,
  change: Partial<Pick<CharacterAppearance, 'outfit' | 'weapon'>>,
  level: number,
) {
  const next = { ...appearance, ...change }
  if (change.weapon === 'crystal' && change.outfit === undefined) {
    next.outfit = 'celestial'
  }
  if (!characterOptions.outfit.some(item => item.id === next.outfit && item.level <= level)
    || !characterOptions.weapon.some(item => item.id === next.weapon && item.level <= level)) return
  if (heroEquipmentPortrait(next, level)) return next
  if (change.outfit !== undefined && change.weapon === undefined && next.weapon === 'crystal') {
    const unarmed = { ...next, weapon: 'none' as const }
    if (heroEquipmentPortrait(unarmed, level)) return unarmed
  }
}

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
  if (character.outfit !== 'casual' && set?.id !== 'crystal'
    && (!set || !hasEquipmentArt(set.id, character.gender, level))
    && heroEquipmentPortrait({ ...character, weapon: 'none' }, level)) {
    return characterOptions.outfit.find(item => item.id === character.outfit)?.label ?? stageOutfitLabel(level, character.gender)
  }
  return set && set.id !== 'casual' && hasEquipmentArt(set.id, character.gender, level)
    ? set.label : stageOutfitLabel(level, character.gender)
}
