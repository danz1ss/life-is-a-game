import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { levelProgress } from '../../lib/game'
import { HeroSummary } from './HeroSummary'

describe('compact hero summary', () => {
  it.each([0, 145, 100000000])('preserves level and XP calculations for %i XP', totalXp => {
    const level = levelProgress(totalXp)
    const html = renderToStaticMarkup(<HeroSummary totalXp={totalXp} gold={987654321} onRewards={() => {}} />)
    expect(html).toContain(`<strong>${level.level}</strong><span>Уровень</span>`)
    expect(html).toContain(`${level.current} / ${level.needed} XP`)
    expect(html).toContain(`До уровня ${level.level + 1} — ${level.needed - level.current} XP`)
    expect(html).toContain('Баланс: 987654321 монет. Открыть награды')
    expect(html).toContain('type="button"')
    expect(html).not.toContain('Уровень героя')
  })
})
