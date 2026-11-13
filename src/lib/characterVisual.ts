import { availableCharacter, heroStageForLevel, petStageForLevel, petStages } from './character'
import type { CharacterAppearance } from './types'
import { equipmentArtFile, equipmentForAppearance, heroEquipmentPortrait, hasEquipmentArt } from './heroEquipment'
export { stageOutfits, stageOutfitLabel } from './heroEquipment'

type Species = NonNullable<CharacterAppearance['pet']>
export const companionArt: Record<Species, readonly string[]> = {
  fox: ['fox-cub.png', 'fox-explorer.png', 'fox-explorer.png', 'fox-guardian.png', 'fox-guardian.png', 'fox-guardian.png'],
  owl: ['owl-chick.png', 'owl-chick.png', 'owl-chick.png', 'owl-guardian.png', 'owl-guardian.png', 'owl-guardian.png'],
  dragon: Array(6).fill('dragon-legend.png'),
}

export function heroArtFile(appearance: CharacterAppearance | undefined, level: number) {
  const character = availableCharacter(appearance, level)
  const stage = heroStageForLevel(level)
  const portrait = heroEquipmentPortrait(character, level)
  if (portrait) return portrait
  const set = equipmentForAppearance(character, level)
  if (set && hasEquipmentArt(set.id, character.gender, level)) return equipmentArtFile(set.id, character.gender, level)
  const crystal = stage.id === 'legend' && character.weapon === 'crystal'
  return heroEquipmentPortrait({ ...character, weapon: 'none' }, level)
    ?? `heroes/${character.gender}-${stage.id}${crystal ? '-crystal' : ''}.png`
}

export function companionArtFile(species: Species, level: number) {
  const index = petStages.findIndex(item => item.level === petStageForLevel(level).level)
  return `companions/${companionArt[species][index]}`
}

export function sceneArtFiles(appearance: CharacterAppearance | undefined, level: number) {
  const character = availableCharacter(appearance, level)
  return [heroArtFile(character, level), companionArtFile(character.pet ?? 'fox', level)]
}

// A new logical pet milestone may share existing art: never promise a new picture.
export function evolutionBetween(fromLevel: number, toLevel: number, appearance?: CharacterAppearance) {
  const from = Math.max(1, Math.floor(fromLevel))
  const to = Math.max(from, Math.floor(toLevel))
  const oldArt = sceneArtFiles(appearance, from), newArt = sceneArtFiles(appearance, to)
  const heroChanged = oldArt[0] !== newArt[0]
  const petChanged = oldArt[1] !== newArt[1]
  return { from, to, heroChanged, petChanged, changed: heroChanged || petChanged, files: [...new Set([...oldArt, ...newArt])] }
}
