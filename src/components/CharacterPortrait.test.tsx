import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { defaultCharacter } from '../lib/character'
import { CharacterPortrait } from './CharacterPortrait'
import { heroArtFile } from '../lib/characterVisual'

describe('full-body hero art', () => {
  it('never draws floating weapons over an existing portrait', () => {
    for (const weapon of ['shield', 'sword', 'staff', 'bow', 'twin'] as const) {
      const portrait = renderToStaticMarkup(createElement(CharacterPortrait, {
        appearance: { ...defaultCharacter, weapon }, level: 50,
      }))
      expect(portrait).not.toContain('translate(740 698)')
      expect(portrait).not.toContain('translate(744 780)')
      expect(portrait).not.toContain('translate(685 766)')
      expect(portrait).not.toContain('M803 331 L762 1299')
      expect(portrait).not.toContain('M822 267 Q983 749 804 1247')
    }
  })
  it('selects all six illustrated stages for both hero genders', () => {
    for (const gender of ['boy', 'girl'] as const) {
      for (const [level, stage] of [[1, 'child'], [10, 'teen'], [25, 'young'], [50, 'adult'], [75, 'veteran'], [100, 'legend']] as const) {
        const portrait = renderToStaticMarkup(createElement(CharacterPortrait, {
          appearance: { ...defaultCharacter, gender }, level,
        }))
        expect(portrait).toContain(`${gender}-${stage}.png`)
      }
    }
  })

  it('starts without a weapon and uses the illustrated crystal sword only at the final level', () => {
    const girl = { ...defaultCharacter, gender: 'girl' as const }
    const child = renderToStaticMarkup(createElement(CharacterPortrait, { appearance: girl, level: 1 }))
    expect(child).toContain('girl-child.png')
    expect(child).not.toContain('girl-legend-crystal.png')

    const finalHero = renderToStaticMarkup(createElement(CharacterPortrait, {
      appearance: { ...girl, weapon: 'crystal' }, level: 100,
    }))
    expect(finalHero).toContain('girl-legend-crystal.png')
    expect(finalHero).not.toContain('girl-child.png')
  })

  it('keeps illustrated armor clear of translucent outfit overlays for every hero', () => {
    for (const gender of ['boy', 'girl'] as const) {
      for (const [level] of [[1, 'child'], [10, 'teen'], [25, 'young'], [50, 'adult'], [75, 'veteran'], [100, 'legend']] as const) {
        for (const outfit of ['casual', 'traveler', 'guardian', 'mage', 'ranger', 'champion', 'celestial'] as const) {
          const portrait = renderToStaticMarkup(createElement(CharacterPortrait, {
            appearance: { ...defaultCharacter, gender, outfit }, level,
          }))
          expect(portrait).toContain(heroArtFile({ ...defaultCharacter, gender, outfit }, level))
          expect(portrait).not.toContain('data-outfit=')
          expect(portrait).not.toContain('-armor')
        }
      }
    }
  })
})
