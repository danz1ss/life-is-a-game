import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { OverdueQuestNotice, overdueQuestLabel } from './OverdueQuestNotice'
import { createInitialState, isQuestOverdue } from '../../lib/game'
import { closeQuestDay } from '../../lib/dayReview'

const render = (count: number) => renderToStaticMarkup(<OverdueQuestNotice count={count} onResolve={() => {}} />)

describe('overdue quest notice', () => {
  it('disappears when no quests need a decision', () => {
    expect(render(0)).toBe('')
  })
  it.each([
    [1, '1 квест требует решения'], [2, '2 квеста требуют решения'],
    [3, '3 квеста требуют решения'], [5, '5 квестов требуют решения'],
    [11, '11 квестов требуют решения'], [14, '14 квестов требуют решения'],
    [21, '21 квест требует решения'], [22, '22 квеста требуют решения'],
    [111, '111 квестов требуют решения'],
  ])('uses a correct label for %i', (count, label) => expect(overdueQuestLabel(count)).toBe(label))
  it('has an announced count and a visible action without a tertiary button style', () => {
    const html = render(3)
    expect(html).toContain('3 квеста требуют решения')
    expect(html).toContain('role="status"')
    expect(html).toContain('Разобрать квесты')
    expect(html).not.toContain('button--tertiary')
  })
  it('appears immediately after closing the planned day, without moving quests or changing rewards', () => {
    const state = createInitialState()
    const today = state.quests[0].dueDate!
    state.quests = [{ ...state.quests[0], repeatDays: [], completedDates: [], skippedDates: [] }]
    const count = (value: typeof state) => value.quests.filter(q => isQuestOverdue(q, today, Boolean(q.dueDate && value.dayPlans[q.dueDate]?.closed))).length
    expect(render(count(state))).toBe('')
    const { state: closed } = closeQuestDay(state, today)
    expect(render(count(closed))).toContain('1 квест требует решения')
    expect(closed.quests[0].dueDate).toBe(today)
    expect(closed.profile.totalXp).toBe(state.profile.totalXp)
    expect(closed.profile.gold).toBe(state.profile.gold)
    expect(closed.history).toEqual(state.history)
  })
})
