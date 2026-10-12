import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../lib/game'
import { QuickTime, questEnd } from './QuickTime'

describe('compact quest time and duration', () => {
  it.each([
    ['10:00', 90, '10:00–11:30', '1 ч 30 мин'],
    [null, 30, 'Назначить время', '30 мин'],
    ['23:45', 30, '23:45–00:15 (+1 день)', '30 мин'],
  ])('keeps one clock and a working time button for %s', (scheduledTime, durationMinutes, time, duration) => {
    const quest = { ...createInitialState().quests[0], scheduledTime, durationMinutes }
    const html = renderToStaticMarkup(<QuickTime quest={quest} suggestedTime={null} onChange={() => {}} />)
    expect(html).toContain(time)
    expect(html).toContain(`<span>· ${duration}</span>`)
    expect(html.match(/<button/g)).toHaveLength(1)
    expect(html.match(/lucide-clock3/g)).toHaveLength(1)
    expect(questEnd(quest)).toBe(scheduledTime ? time.split('–')[1] : null)
  })
})
