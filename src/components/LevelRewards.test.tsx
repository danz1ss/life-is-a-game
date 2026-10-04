import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { createInitialState } from '../lib/game'
import { useStore } from '../lib/store'
import { LevelRewardsPanel, LevelUpModal } from './LevelRewards'

vi.mock('../lib/store', () => ({ useStore: vi.fn() }))

describe('level milestones without coin rewards', () => {
  it('shows earned unlocks and personal gifts without a coin award banner', () => {
    const state = createInitialState()
    state.profile.totalXp = 650
    state.profile.gold = 18
    state.levelRewards = { highestLevel: 5, acknowledgedLevel: 4, personal: [{ id: 'book', title: 'Книга', level: 5, claimedAt: null }] }
    vi.mocked(useStore).mockReturnValue({ state, acknowledgeLevelRewards: () => undefined } as unknown as ReturnType<typeof useStore>)
    const markup = renderToStaticMarkup(createElement(LevelUpModal))
    expect(markup).toContain('Новый уровень: 5!')
    expect(markup).toContain('Новые образы и этапы')
    expect(markup).toContain('Открылись личные поощрения')
    expect(markup).toContain('Книга')
    expect(markup).not.toContain('level-up__gold')
    expect(markup).not.toContain('монет')
  })

  it('describes badges and free personal gifts instead of per-level coins', () => {
    const state = createInitialState()
    vi.mocked(useStore).mockReturnValue({ state, savePersonalLevelReward: () => undefined, deletePersonalLevelReward: () => undefined, claimPersonalLevelReward: () => undefined } as unknown as ReturnType<typeof useStore>)
    const markup = renderToStaticMarkup(createElement(LevelRewardsPanel))
    expect(markup).toContain('памятный значок')
    expect(markup).toContain('доступно бесплатно')
    expect(markup).toContain('Уровень 5')
    expect(markup).not.toContain('монет')
  })
})
