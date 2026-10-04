import { describe, expect, it } from 'vitest'
import { availableCharacter, characterMilestones, characterMilestonesForGender, characterOptions, characterOptionsForGender, defaultCharacter, genderOptions, heroStageForGender, heroStageForLevel, petStageForLevel } from './character'

describe('hero and companion progression', () => {
  it('keeps companion stages at earned milestones and opens new species later', () => {
    expect([1, 4, 5, 14, 15, 29, 30, 49, 50, 99, 100].map((level) => petStageForLevel(level).label))
      .toEqual(['Малыш', 'Малыш', 'Искатель', 'Искатель', 'Смельчак', 'Смельчак', 'Хранитель', 'Хранитель', 'Мифический', 'Мифический', 'Легенда'])
    expect(characterOptions.pet.find((pet) => pet.id === 'owl')?.level).toBe(12)
    expect(characterOptions.pet.find((pet) => pet.id === 'dragon')?.level).toBe(100)
    expect(characterOptions.weapon.find((weapon) => weapon.id === 'crystal')?.level).toBe(100)
    expect(characterMilestones.filter((milestone) => milestone.level === 100).map((milestone) => milestone.title))
      .toEqual(['Дракончик', 'Кристальный меч'])
  })

  it('keeps previously selected final rewards locked until level 100', () => {
    const appearance = { ...defaultCharacter, weapon: 'crystal', pet: 'dragon' } as const
    expect(availableCharacter(appearance, 99)).toMatchObject({ weapon: 'none', pet: 'fox' })
    expect(availableCharacter(appearance, 100)).toMatchObject({ weapon: 'crystal', pet: 'dragon' })
  })

  it('starts both heroes as children without armor or a sword', () => {
    expect(genderOptions.map((gender) => gender.id)).toEqual(['boy', 'girl'])
    expect(defaultCharacter).toMatchObject({ gender: 'boy', outfit: 'casual', weapon: 'none' })
    for (const gender of genderOptions) {
      expect(availableCharacter({ ...defaultCharacter, gender: gender.id, outfit: 'guardian', weapon: 'sword' }, 1))
        .toMatchObject({ gender: gender.id, outfit: 'casual', weapon: 'none' })
    }
    expect(characterOptions.outfit.find((option) => option.id === 'guardian')?.level).toBe(3)
    expect(characterOptions.weapon.find((option) => option.id === 'sword')?.level).toBe(4)
    expect(availableCharacter({ ...defaultCharacter, outfit: 'guardian', weapon: 'sword' }, 4))
      .toMatchObject({ outfit: 'guardian', weapon: 'sword' })
  })

  it('ages gradually on every level and ends as a mature adult', () => {
    expect(heroStageForLevel(1)).toMatchObject({ id: 'child', visualAge: 8, maturity: 0, nextLevel: 10 })
    expect(heroStageForLevel(100)).toMatchObject({ id: 'legend', visualAge: 39, maturity: 1, nextLevel: null })
    expect([1, 10, 25, 50, 75, 100].map((level) => heroStageForLevel(level).id))
      .toEqual(['child', 'teen', 'young', 'adult', 'veteran', 'legend'])
    for (let level = 2; level <= 100; level++) {
      expect(heroStageForLevel(level).maturity).toBeGreaterThan(heroStageForLevel(level - 1).maturity)
      expect(heroStageForLevel(level).visualAge).toBeGreaterThan(heroStageForLevel(level - 1).visualAge)
    }
    expect(heroStageForLevel(-10)).toEqual(heroStageForLevel(1))
    expect(heroStageForLevel(101)).toEqual(heroStageForLevel(100))
  })

  it('shows matching boy and girl rewards with distinct outfit and stage names', () => {
    const boy = characterOptionsForGender('boy')
    const girl = characterOptionsForGender('girl')
    for (const slot of Object.keys(characterOptions) as Array<keyof typeof characterOptions>) {
      expect(boy[slot].map(({ id, level }) => ({ id, level })))
        .toEqual(girl[slot].map(({ id, level }) => ({ id, level })))
    }
    expect(boy.outfit[0]).toMatchObject({ id: 'casual', label: 'Куртка новичка', level: 1 })
    expect(girl.outfit[0]).toMatchObject({ id: 'casual', label: 'Туника путешественницы', level: 1 })
    expect(boy.outfit.find((option) => option.id === 'guardian')?.label).toBe('Доспех стража')
    expect(girl.outfit.find((option) => option.id === 'guardian')?.label).toBe('Доспех стражницы')
    expect(girl.weapon.find((option) => option.id === 'crystal')).toMatchObject({ label: 'Кристальный меч', level: 100 })
    expect(girl.pet.find((option) => option.id === 'dragon')?.level).toBe(100)
    expect(heroStageForGender(1, 'boy').label).toBe('Малыш')
    expect(heroStageForGender(1, 'girl').label).toBe('Малышка')
    expect(heroStageForGender(25, 'girl').label).toBe('Юная героиня')
    expect(heroStageForGender(100, 'girl')).toMatchObject({ id: 'legend', label: 'Зрелая героиня', maturity: 1 })
    expect(characterMilestonesForGender('girl').map((milestone) => milestone.level))
      .toEqual(characterMilestonesForGender('boy').map((milestone) => milestone.level))
    expect(characterMilestonesForGender('girl').find((milestone) => milestone.level === 25)?.title).toBe('Юная героиня')
    expect(characterMilestonesForGender('girl').find((milestone) => milestone.title === 'Кристальный меч')?.detail)
      .toContain('Зрелая героиня')
  })
})
