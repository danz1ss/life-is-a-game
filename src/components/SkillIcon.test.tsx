import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { canonicalSkillIcon, searchSkillIcons, SkillIcon, skillIcons } from './SkillIcon'

const existingIds = ['❤', '⚡', '☾', 'bike', 'walk', 'apple', 'water', 'rest', '✦', '▤', 'A', 'brain', 'science', 'math', 'puzzle', 'globe', '◆', '</>', '♟', 'laptop', 'chart', 'wallet', 'handshake', 'presentation', 'camera', 'music', 'palette', 'pen', 'headphones', 'cooking', '◈', 'target', 'trophy', 'swords', 'users', 'plane', 'mountain', 'leaf', 'sun', 'coffee']

describe('skill icon catalogue compatibility and search', () => {
  it('keeps all existing ids and the heart alias renderable', () => {
    for (const id of existingIds) {
      expect(skillIcons.some(icon => icon.id === id)).toBe(true)
      expect(renderToStaticMarkup(<SkillIcon icon={id} />)).toContain('<svg')
      expect(canonicalSkillIcon(id)).toBe(id)
    }
    expect(canonicalSkillIcon('❤️')).toBe('❤')
    expect(renderToStaticMarkup(<SkillIcon icon="❤️" />)).toBe(renderToStaticMarkup(<SkillIcon icon="❤" />))
  })

  it('has 100–150 distinct meaningful options with unique stable ids and Russian names', () => {
    expect(skillIcons.length).toBeGreaterThanOrEqual(100)
    expect(skillIcons.length).toBeLessThanOrEqual(150)
    expect(new Set(skillIcons.map(icon => icon.id)).size).toBe(skillIcons.length)
    expect(new Set(skillIcons.map(icon => icon.component)).size).toBe(skillIcons.length)
    for (const icon of skillIcons) expect(icon.name).toMatch(/[А-Яа-яЁё]/)
  })

  it('searches Russian names and synonyms without case or surrounding-space sensitivity', () => {
    expect(searchSkillIcons('  чТеНиЕ  ').map(icon => icon.id)).toContain('▤')
    expect(searchSkillIcons('код').map(icon => icon.id)).toContain('</>')
    expect(searchSkillIcons('спорт').map(icon => icon.id)).toEqual(expect.arrayContaining(['⚡', 'bike', 'volleyball']))
    expect(searchSkillIcons('самолет').map(icon => icon.id)).toContain('plane')
    expect(searchSkillIcons('самолёт')).toEqual(searchSkillIcons('самолет'))
    expect(searchSkillIcons('')).toEqual(skillIcons)
    expect(searchSkillIcons('zzzz-no-match')).toEqual([])
  })

  it('preserves a custom or unknown icon without changing its value', () => {
    for (const custom of ['🐙', 'Мой знак', 'unknown-icon']) {
      expect(canonicalSkillIcon(custom)).toBe(custom)
      expect(renderToStaticMarkup(<SkillIcon icon={custom} />)).toContain(custom)
    }
  })
})
