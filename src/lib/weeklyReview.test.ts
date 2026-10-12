import { describe, expect, it } from 'vitest'
import { createInitialState, migrateState } from './game'
import { reviewWeeks, resolveReviewWeek, reviewWeekLabel, toggleWeeklyTaskCompletion } from './weeklyPlanning'
import type { WeeklyPlan } from './types'

const plan = (done = false): WeeklyPlan => ({ tasks: [{ id: 'task', title: 'Задача недели', done }], reviewedAt: '2026-10-04T15:00:00.000Z' })
const plans = {
  '2026-10-19': plan(), '2026-10-12': plan(), '2026-10-05': plan(),
  '2026-09-28': plan(), '2026-09-21': plan(), '2026-09-14': plan(),
}

describe('weekly review calendar window', () => {
  it('offers the current calendar week and exactly three previous weeks, newest first', () => {
    expect(reviewWeeks(plans, '2026-10-12')).toEqual(['2026-10-12', '2026-10-05', '2026-09-28', '2026-09-21'])
    expect(reviewWeeks(plans, '2026-10-18')).toEqual(reviewWeeks(plans, '2026-10-12'))
  })

  it('always offers the current week; skips empty past weeks without backfilling older ones', () => {
    expect(reviewWeeks({ '2026-09-28': { tasks: [], reviewedAt: null }, '2026-09-14': plan(), '2026-10-05': plan() }, '2026-10-12')).toEqual(['2026-10-12', '2026-10-05'])
    expect(reviewWeeks({}, '2026-10-12')).toEqual(['2026-10-12'])
  })

  it('keeps an available selection on Monday and falls back to current when it expires', () => {
    const available = reviewWeeks(plans, '2026-10-19')
    expect(resolveReviewWeek('2026-10-05', available)).toBe('2026-10-05')
    expect(resolveReviewWeek('2026-09-21', available)).toBe('2026-10-19')
    expect(resolveReviewWeek('2026-10-26', available)).toBe('2026-10-19')
    expect(resolveReviewWeek(null, available)).toBe('2026-10-19')
  })

  it('uses Monday–Sunday across the year boundary', () => {
    const history = { '2027-01-04': plan(), '2026-12-28': plan(), '2026-12-21': plan(), '2026-12-14': plan(), '2026-12-07': plan() }
    expect(reviewWeeks(history, '2027-01-03')).toEqual(['2026-12-28', '2026-12-21', '2026-12-14', '2026-12-07'])
    expect(reviewWeeks(history, '2027-01-04')).toEqual(['2027-01-04', '2026-12-28', '2026-12-21', '2026-12-14'])
  })

  it.each([
    ['2026-10-12', '2026-10-12', 'Текущая · 12–18 окт.'],
    ['2026-10-05', '2026-10-12', 'Прошлая · 5–11 окт.'],
    ['2026-09-28', '2026-10-12', '28 сент. – 4 окт.'],
    ['2026-09-21', '2026-10-12', '21–27 сент.'],
    ['2026-12-28', '2027-01-04', 'Прошлая · 28 дек. 2026 – 3 янв. 2027'],
    ['2026-12-21', '2027-01-04', '21–27 дек. 2026'],
    ['2027-01-04', '2027-01-04', 'Текущая · 4–10 янв.'],
  ])('labels %s relative to %s', (week, current, label) => {
    expect(reviewWeekLabel(week, current)).toBe(label)
  })

  it('only changes the selected reviewed week and round-trips hidden old plans in the backup', () => {
    const original = { ...createInitialState(), weeklyPlans: plans }
    const snapshot = structuredClone(original)
    const toggled = toggleWeeklyTaskCompletion(original, '2026-10-05', 'task')
    expect(toggled.weeklyPlans['2026-10-05'].tasks[0].done).toBe(true)
    expect(toggled.weeklyPlans['2026-10-05'].reviewedAt).toBe(plans['2026-10-05'].reviewedAt)
    for (const week of Object.keys(plans).filter(week => week !== '2026-10-05')) {
      expect(toggled.weeklyPlans[week]).toBe(original.weeklyPlans[week as keyof typeof plans])
    }
    const { weeklyPlans: _before, ...beforeOther } = original
    const { weeklyPlans: _after, ...afterOther } = toggled
    expect(afterOther).toEqual(beforeOther)
    expect(toggleWeeklyTaskCompletion(toggled, '2026-10-05', 'task')).toEqual(original)
    reviewWeeks(toggled.weeklyPlans, '2026-10-12')
    expect(migrateState(JSON.parse(JSON.stringify(toggled)))).toEqual(toggled)
    expect(toggled.weeklyPlans['2026-09-14']).toEqual(plans['2026-09-14'])
    expect(original).toEqual(snapshot)
  })
})
