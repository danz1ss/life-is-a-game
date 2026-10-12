import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createInitialState } from '../lib/game'
import { QuestCard } from './QuestCard'

const state = createInitialState()
const quest = { ...state.quests[0], difficulty: 'medium' as const, description: 'Описание задачи' }
const props = { quest, date: quest.dueDate!, skill: state.skills.find(skill => skill.id === quest.skillId) }

describe('quest card reward placement', () => {
  it('shows Today skill, time and rewards in the footer without a separate duration row', () => {
    const html = renderToStaticMarkup(<QuestCard {...props} rewardsInFooter footer={<span>09:00 — 10:30</span>} />)
    expect(html).not.toContain('class="quest-meta"')
    expect(html).not.toContain('lucide-clock')
    const footer = html.split('class="quest-card__footer"')[1]
    expect(footer).toContain('09:00 — 10:30')
    expect(footer).toContain('+25 XP')
    expect(footer).toContain('5 монет')
    expect(footer).toContain(props.skill!.name)
    expect(html).not.toContain('lucide-star')
    expect(html).toContain('g-main-label')
    expect(html.match(/lucide-coins/g)).toHaveLength(1)
    expect(html.match(/lucide-zap/g)).toHaveLength(1)
  })

  it('keeps the existing metadata rewards for planner and archive cards by default', () => {
    const html = renderToStaticMarkup(<QuestCard {...props} />)
    expect(html).not.toContain('quest-card--today')
    expect(html).not.toContain('quest-card__footer')
    expect(html.split('class="quest-meta"')[1]).toContain('25 XP')
    expect(html.split('class="quest-meta"')[1]).toContain('lucide-coins')
  })
})
