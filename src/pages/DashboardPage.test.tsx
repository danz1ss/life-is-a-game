import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialState } from '../lib/game'
import { closeQuestDay } from '../lib/dayReview'
import { DashboardPage } from './DashboardPage'

let state = createInitialState()
const today = '2026-10-12'
vi.mock('../lib/store', () => ({ useStore: () => ({ state, today }) }))

const render = () => renderToStaticMarkup(<DashboardPage onNavigate={() => {}} onOpenSkill={() => {}} />)

describe('dashboard unresolved quests', () => {
  beforeEach(() => {
    state = createInitialState()
    state.quests = [{ ...state.quests[0], dueDate: today, repeatDays: [], completedDates: [], skippedDates: [], archivedAt: null }]
  })

  it('shows a prominent notice immediately after closing a day with an unfinished quest', () => {
    expect(render()).not.toContain('Разобрать квесты')
    state = closeQuestDay(state, today).state
    expect(render()).toContain('1 квест требует решения')
    expect(render()).toContain('Разобрать квесты')
  })

  it('counts unfinished quests from several past days and hides the notice once resolved', () => {
    state.quests = [
      { ...state.quests[0], id: 'yesterday', dueDate: '2026-10-11' },
      { ...state.quests[0], id: 'older', dueDate: '2026-10-09' },
    ]
    expect(render()).toContain('2 квеста требуют решения')
    state.quests[0].completedDates = ['2026-10-11']
    state.quests[1].dueDate = '2026-10-13'
    expect(render()).not.toContain('Разобрать квесты')
  })
})
