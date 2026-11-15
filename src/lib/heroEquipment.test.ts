import { describe, expect, it } from 'vitest'
import { characterMilestones, characterOptions, defaultCharacter, heroStages } from './character'
import { equipmentArtFile, equipmentForAppearance, equipmentSets, exactHeroArt, hasEquipmentArt, heroEquipmentPortrait, renderedOutfitLabel, selectEquipment, tryHeroEquipment } from './heroEquipment'

const actualArtwork = import.meta.glob('/public/heroes/equipment/*.png')
const allHeroArtwork = import.meta.glob('/public/heroes/**/*.png')

it('lets both heroes wear every unlocked ordinary outfit and weapon together', () => {
  for (const gender of ['boy', 'girl'] as const) {
    for (let level = 1; level <= 100; level++) {
      for (const { id: outfit } of characterOptions.outfit.filter(item => item.level <= level)) {
        for (const { id: weapon } of characterOptions.weapon.filter(item => item.id !== 'crystal' && item.level <= level)) {
          const appearance = { ...defaultCharacter, gender, outfit, weapon }
          const pairing = `${gender} / level ${level} / ${outfit} / ${weapon}`
          expect(tryHeroEquipment({ ...appearance, outfit: 'casual' }, { outfit }, level), pairing).toEqual(appearance)
          expect(tryHeroEquipment({ ...appearance, weapon: 'none' }, { weapon }, level), pairing).toEqual(appearance)
          const portrait = heroEquipmentPortrait(appearance, level)
          expect(`/public/${portrait}` in allHeroArtwork, pairing).toBe(true)
          if (outfit !== 'casual' || weapon !== 'none') {
            expect(portrait, pairing).toMatch(new RegExp(`^heroes/equipment/${gender}-[^-]+-${outfit}-${weapon}\\.png$`))
          }
        }
      }
    }
  }
})

it('lets the hero change outfits after equipping the crystal sword', () => {
  const crystal = { ...defaultCharacter, gender: 'girl', outfit: 'celestial', weapon: 'crystal' } as const
  expect(tryHeroEquipment(crystal, { outfit: 'traveler' }, 100)).toEqual({ ...crystal, outfit: 'traveler' })
  expect(tryHeroEquipment(crystal, { outfit: 'ranger' }, 100)).toEqual({ ...crystal, outfit: 'ranger', weapon: 'none' })
})

it('offers every ordinary weapon for each level-100 outfit', () => {
  for (const gender of ['boy', 'girl'] as const) {
    for (const { id: outfit } of characterOptions.outfit) {
      for (const { id: weapon } of characterOptions.weapon.filter(item => item.id !== 'crystal')) {
        const appearance = { ...defaultCharacter, gender, outfit }
        const selected = tryHeroEquipment(appearance, { weapon }, 100)
        expect(selected, `${gender} / ${outfit} / ${weapon}`).toEqual({ ...appearance, weapon })
        if (outfit === 'casual' && weapon === 'none') continue
        const path = `heroes/equipment/${gender}-legend-${outfit}-${weapon}.png`
        expect(heroEquipmentPortrait(selected!, 100)).toBe(path)
        expect(`/public/${path}` in actualArtwork).toBe(true)
      }
    }
  }
})
it('equips the final crystal portrait directly from the weapon list', () => {
  for (const gender of ['boy', 'girl'] as const) {
    const ranger = { ...defaultCharacter, gender, outfit: 'ranger' } as const
    expect(tryHeroEquipment(ranger, { weapon: 'crystal' }, 99)).toBeUndefined()
    const equipped = tryHeroEquipment(ranger, { weapon: 'crystal' }, 100)
    expect(equipped).toEqual({ ...ranger, outfit: 'celestial', weapon: 'crystal' })
    expect(heroEquipmentPortrait(equipped!, 100)).toBe(`heroes/${gender}-legend-crystal.png`)
  }
})
it('uses separate final-stage portraits for the requested equipment', () => {
  for (const gender of ['boy', 'girl'] as const) {
    for (const [outfit, weapon] of [['champion', 'shield'], ['champion', 'staff'], ['mage', 'twin'], ['guardian', 'twin']] as const) {
      const appearance = { ...defaultCharacter, gender, outfit, weapon }
      expect(heroEquipmentPortrait(appearance, 100)).toBe(`heroes/equipment/${gender}-legend-${outfit}-${weapon}.png`)
      expect(tryHeroEquipment(appearance, { weapon }, 100)).toEqual(appearance)
    }
  }
})

describe('complete illustrated equipment sets', () => {
  it('announces the same complete sets at their actual unlock levels', () => {
    for (const set of equipmentSets.filter(item => item.id !== 'casual' && item.id !== 'crystal')) {
      expect(characterMilestones.find(item => item.title === `Комплект «${set.label}»`)?.level).toBe(set.level)
    }
    expect(characterMilestones.some(item => ['Первый щит', 'Первый меч', 'Посох путешественника', 'Два клинка'].includes(item.title))).toBe(false)
    expect(characterMilestones.find(item => item.title === 'Кристальный меч')?.level).toBe(equipmentSets.find(set => set.id === 'crystal')?.level)
  })
  it('equips clothing and held weapon atomically without changing other choices', () => {
    const before = { ...defaultCharacter, pet: 'owl' as const, skin: 'dark' as const, accent: 'violet' as const }
    expect(selectEquipment(before, 'mage', 8)).toEqual({ ...before, outfit: 'mage', weapon: 'staff' })
    expect(before).toMatchObject({ outfit: 'casual', weapon: 'none' })
  })
  it('does not equip a locked set or grant final equipment early', () => {
    expect(selectEquipment(defaultCharacter, 'mage', 7)).toEqual(defaultCharacter)
    expect(selectEquipment(defaultCharacter, 'crystal', 99)).toEqual(defaultCharacter)
    expect(selectEquipment(defaultCharacter, 'crystal', 100)).toMatchObject({ weapon: 'crystal', pet: 'fox' })
  })
  it('resolves only an actual whole set rather than arbitrary legacy combinations', () => {
    expect(equipmentForAppearance({ ...defaultCharacter, outfit: 'mage', weapon: 'sword' }, 100)).toBeUndefined()
    expect(equipmentForAppearance({ ...defaultCharacter, outfit: 'mage', weapon: 'staff' }, 25)?.id).toBe('mage')
    expect(equipmentForAppearance({ ...defaultCharacter, outfit: 'mage', weapon: 'staff' }, 7)).toBeUndefined()
  })
  it('uses the current age and gender for every set', () => {
    for (const gender of ['boy', 'girl'] as const) {
      for (const stage of heroStages) {
        for (const set of equipmentSets.filter(item => item.id !== 'casual' && item.id !== 'crystal')) {
          expect(equipmentArtFile(set.id, gender, stage.level)).toBe(`heroes/equipment/${gender}-${stage.id}-${set.outfit}-${set.weapon}.png`)
          expect(hasEquipmentArt(set.id, gender, stage.level)).toBe(true)
          expect(`/public/${equipmentArtFile(set.id, gender, stage.level)}` in actualArtwork).toBe(true)
        }
      }
      expect(equipmentArtFile('crystal', gender, 100)).toBe(`heroes/${gender}-legend-crystal.png`)
      expect(equipmentArtFile('casual', gender, 50)).toBe(`heroes/${gender}-adult.png`)
    }
  })
  it('describes the selected illustrated set and keeps legacy clothes honest', () => {
    expect(renderedOutfitLabel({ ...defaultCharacter, outfit: 'mage', weapon: 'staff' }, 8)).toContain('Маг')
    expect(renderedOutfitLabel({ ...defaultCharacter, outfit: 'mage', weapon: 'sword' }, 1)).toBe('Куртка новичка')
  })
})
it('changes one equipment slot while retaining the other', () => {
  const mage = { ...defaultCharacter, outfit: 'mage', weapon: 'staff' } as const
  const shield = tryHeroEquipment(mage, { weapon: 'shield' }, 8)
  expect(shield).toMatchObject({ outfit: 'mage', weapon: 'shield' })
  expect(tryHeroEquipment(shield!, { outfit: 'guardian' }, 8)).toMatchObject({ outfit: 'guardian', weapon: 'shield' })
  expect(tryHeroEquipment(mage, { weapon: 'crystal' }, 8)).toBeUndefined()
})
it('has every illustrated mage and guardian pairing for both heroes', () => {
  for (const gender of ['boy', 'girl'] as const) {
    for (const outfit of ['mage', 'guardian'] as const) {
      for (const weapon of ['none', 'shield', 'staff'] as const) {
        const appearance = { ...defaultCharacter, gender, outfit, weapon }
        const file = exactHeroArt(appearance, 8)
        expect(file).toBe(`heroes/equipment/${gender}-child-${outfit}-${weapon}.png`)
        expect(`/public/${file}` in actualArtwork).toBe(true)
        expect(tryHeroEquipment(appearance, {}, 10)).toEqual(appearance)
      }
    }
  }
})
