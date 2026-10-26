import { describe, expect, it } from 'vitest'
import { characterMilestones, defaultCharacter, heroStages } from './character'
import { equipmentArtFile, equipmentForAppearance, equipmentSets, hasEquipmentArt, renderedOutfitLabel, selectEquipment } from './heroEquipment'

const actualArtwork = import.meta.glob('/public/heroes/equipment/*.png')

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
