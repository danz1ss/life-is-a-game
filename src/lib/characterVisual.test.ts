import { describe, expect, it } from 'vitest'
import { defaultCharacter, heroStages } from './character'
import { companionArt, companionArtFile, evolutionBetween, heroArtFile, stageOutfitLabel } from './characterVisual'

const artwork = { ...import.meta.glob('/public/heroes/**/*.png'), ...import.meta.glob('/public/companions/*.png') }
const exists = (file: string) => `/public/${file}` in artwork

describe('existing artwork progression', () => {
  it('uses real repository files for every hero, companion and crystal portrait', () => {
    for (const gender of ['boy', 'girl'] as const) {
      for (const stage of heroStages) expect(exists(`${heroArtFile({ ...defaultCharacter, gender }, stage.level)}`)).toBe(true)
      expect(exists(`${heroArtFile({ ...defaultCharacter, gender, weapon: 'crystal' }, 100)}`)).toBe(true)
    }
    for (const files of Object.values(companionArt)) for (const file of files) expect(exists(`companions/${file}`)).toBe(true)
  })
  it.each([[9,10],[24,25],[49,50],[74,75],[99,100]])('detects automatic hero growth at %i → %i', (from,to) => {
    expect(evolutionBetween(from,to,defaultCharacter)).toMatchObject({heroChanged:true,changed:true})
  })
  it('does not stage a transformation on ordinary levels or reverse previously earned growth', () => {
    expect(evolutionBetween(6,7,defaultCharacter).changed).toBe(false)
    expect(evolutionBetween(25,24,defaultCharacter)).toMatchObject({from:25,to:25,changed:false})
    expect(evolutionBetween(100,101,defaultCharacter).changed).toBe(false)
  })
  it('consolidates a multi-stage jump into one from/to scene', () => {
    const result=evolutionBetween(9,76,defaultCharacter)
    expect(result).toMatchObject({from:9,to:76,heroChanged:true})
    expect(result.files).toContain('heroes/boy-child.png')
    expect(result.files).toContain('heroes/boy-veteran.png')
    expect(result.files).not.toContain('heroes/boy-teen.png')
  })
  it('animates actual companion art changes without inventing missing stages', () => {
    expect(evolutionBetween(4,5,defaultCharacter)).toMatchObject({heroChanged:false,petChanged:true})
    expect(evolutionBetween(14,15,defaultCharacter).changed).toBe(false)
    expect(companionArtFile('owl',15)).toBe(companionArtFile('owl',5))
  })
  it('keeps locked final gear unavailable and preserves the selected companion', () => {
    const appearance={...defaultCharacter,weapon:'crystal' as const,pet:'dragon' as const}
    expect(heroArtFile(appearance,99)).toBe('heroes/boy-veteran.png')
    expect(heroArtFile(appearance,100)).toBe('heroes/boy-legend-crystal.png')
    expect(evolutionBetween(99,100,appearance).files).toContain('companions/dragon-legend.png')
    expect(evolutionBetween(99,100,defaultCharacter).files).not.toContain('companions/dragon-legend.png')
  })
  it('describes the clothing baked into each stage rather than an unsupported costume', () => {
    expect(stageOutfitLabel(1,'boy')).toBe('Куртка новичка')
    expect(stageOutfitLabel(100,'girl')).toBe('Легендарные доспехи')
  })
})
