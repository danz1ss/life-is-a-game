import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { defaultCharacter } from '../lib/character'
import { CharacterStage } from './CharacterStage'

describe('shared hero and companion scene', () => {
  it('leaves substantial scene margins around both complete artwork frames', () => {
    for (const gender of ['boy', 'girl'] as const) {
      for (const pet of ['fox', 'owl', 'dragon'] as const) {
        const html = renderToStaticMarkup(createElement(CharacterStage, {
          appearance: { ...defaultCharacter, gender, pet }, level: 100,
        }))
        const [x, y, width, height] = html.match(/viewBox="([^"]+)"/)![1].split(' ').map(Number)
        expect(-x).toBeGreaterThanOrEqual(80)
        expect(-y).toBeGreaterThanOrEqual(60)
        expect(x + width - (925 + 445)).toBeGreaterThanOrEqual(80)
        expect(y + height - 1536).toBeGreaterThanOrEqual(80)
      }
    }
  })
})
