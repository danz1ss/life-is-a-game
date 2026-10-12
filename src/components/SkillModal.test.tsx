import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createInitialState } from '../lib/game'
import { SkillModal } from './SkillModal'

describe('skill icon picker initial state', () => {
  it('starts collapsed with a button, without search, categories or a grid', () => {
    const state = createInitialState()
    const html = renderToStaticMarkup(<SkillModal skills={state.skills} onSave={() => {}} onClose={() => {}} />)
    expect(html).toContain('skill-icon-trigger')
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('type="search"')
    expect(html).not.toContain('skill-icon-picker')
    expect(html).not.toContain('Категории иконок')
    expect(html).not.toContain('вариантов')
  })
})
