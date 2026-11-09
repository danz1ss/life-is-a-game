import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../lib/game'
import { QuickTime, questEnd } from './QuickTime'

describe('compact quest time and duration', () => {
  it.each([
    ['10:00', 90, '10:00 – 11:30', '1 ч 30 мин', '11:30'],
    [null, 30, 'Без времени', '30 мин', null],
    ['23:45', 30, '23:45 – 00:15', '30 мин', '00:15 (+1 день)'],
  ])('keeps one clock and a working time button for %s', (scheduledTime, durationMinutes, time, duration, end) => {
    const quest = { ...createInitialState().quests[0], scheduledTime, durationMinutes }
    const html = renderToStaticMarkup(<QuickTime quest={quest} suggestedTime={null} onChange={() => {}} />)
    expect(html).toContain(time)
    expect(html).toContain(`aria-hidden="true">·</span>${duration}</span>`)
    expect(html.match(/<button/g)).toHaveLength(1)
    expect(html.match(/lucide-clock3/g)).toHaveLength(1)
    expect(questEnd(quest)).toBe(end)
    if (scheduledTime === '23:45') expect(html).toContain('до следующего дня')
  })
})
