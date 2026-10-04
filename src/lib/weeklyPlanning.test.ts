import { describe, expect, it } from 'vitest'
import { createInitialState, migrateState } from './game'
import type { AppState, WeeklyPlan, WeeklyTask } from './types'
import { isWeekMonday, removeWeeklyTask, replaceWeeklyPlan, restoreWeeklyTask, reviewWeeklyPlan, shiftWeek, toggleWeeklyTaskCompletion, upsertWeeklyTask, weekMonday, weeklyPlanError } from './weeklyPlanning'

const week = '2026-09-28'
const nextWeek = '2026-10-05'
const reviewTime = '2026-10-04T15:00:00.000Z'
const task = (id: string, done = false): WeeklyTask => ({ id, title: `Задача ${id}`, done })
const plan = (tasks = [task('first'), task('second'), task('third')], reviewedAt: string | null = null): WeeklyPlan => ({ tasks, reviewedAt })

function withPlans(): AppState {
  const state = createInitialState()
  return { ...state, profile: { ...state.profile, totalXp: 590, gold: 18 }, weeklyPlans: {
    '2026-09-21': plan([task('history', true)], '2026-09-27T15:00:00.000Z'),
    [week]: plan(), [nextWeek]: plan([task('future')]),
  } }
}

function expectOnlyWeeklyChanged(before: AppState, after: AppState) {
  const { weeklyPlans: beforePlans, ...beforeOther } = before
  const { weeklyPlans: afterPlans, ...afterOther } = after
  expect(afterOther).toEqual(beforeOther)
  expect(after.profile).toBe(before.profile)
  expect(after.skills).toBe(before.skills)
  expect(after.quests).toBe(before.quests)
  expect(after.history).toBe(before.history)
  expect(after.levelRewards).toBe(before.levelRewards)
  expect(afterPlans).not.toBe(beforePlans)
}

describe('Monday–Sunday weekly calendar', () => {
  it.each([
    ['2026-09-28', '2026-09-28', '2026-10-05'],
    ['2026-10-04', '2026-09-28', '2026-10-05'],
    ['2026-10-05', '2026-10-05', '2026-10-12'],
    ['2027-01-03', '2026-12-28', '2027-01-04'],
    ['2027-01-04', '2027-01-04', '2027-01-11'],
    ['2024-02-29', '2024-02-26', '2024-03-04'],
    ['2026-03-29', '2026-03-23', '2026-03-30'],
  ])('derives the week for local day %s across months, years, leap days and DST', (day, monday, following) => {
    expect(weekMonday(day)).toBe(monday)
    expect(shiftWeek(monday)).toBe(following)
    expect(shiftWeek(following, -1)).toBe(monday)
    expect(isWeekMonday(monday)).toBe(true)
  })

  it.each(['2026-02-30', '2026-13-01', '26-10-04', '2026-10-04T00:00:00Z', 'invalid'])('rejects an invalid calendar day %s', (day) => {
    expect(() => weekMonday(day)).toThrow(RangeError)
    expect(isWeekMonday(day)).toBe(false)
  })

  it('rejects invalid week offsets and non-Mondays', () => {
    expect(() => shiftWeek('2026-10-04')).toThrow(RangeError)
    expect(() => shiftWeek(week, 0.5)).toThrow(RangeError)
    expect(() => shiftWeek(week, Number.MAX_SAFE_INTEGER)).toThrow(RangeError)
  })
})

describe('weekly checklist state', () => {
  it('edits the title while keeping completion and unrelated plans', () => {
    const original = withPlans()
    const completed = toggleWeeklyTaskCompletion(original, week, 'second')
    const edited = upsertWeeklyTask(completed, week, 'second', '  Закончить первый экран  ')
    expect(edited.weeklyPlans[week].tasks[1]).toEqual({ id: 'second', title: 'Закончить первый экран', done: true })
    expect(original.weeklyPlans[week].tasks[1].done).toBe(false)
    expectOnlyWeeklyChanged(original, completed)
    expectOnlyWeeklyChanged(completed, edited)
    expect(edited.weeklyPlans[nextWeek]).toBe(original.weeklyPlans[nextWeek])
    expect(edited.weeklyPlans['2026-09-21']).toBe(original.weeklyPlans['2026-09-21'])
  })

  it('adds tasks up to five, validates titles, and leaves no-op writes untouched', () => {
    const original = withPlans()
    const four = upsertWeeklyTask(original, week, 'fourth', 'Четвёртая')
    const five = upsertWeeklyTask(four, week, 'fifth', 'Пятая')
    expect(five.weeklyPlans[week].tasks).toHaveLength(5)
    expect(five.weeklyPlans[week].tasks[4].done).toBe(false)
    expect(upsertWeeklyTask(five, week, 'sixth', 'Шестая')).toBe(five)
    expect(upsertWeeklyTask(original, week, 'blank', '  ')).toBe(original)
    expect(upsertWeeklyTask(original, week, 'long', 'x'.repeat(301))).toBe(original)
    expect(upsertWeeklyTask(original, week, 'x'.repeat(101), 'Длинный ID')).toBe(original)
    expect(upsertWeeklyTask(original, '2026-09-29', 'new', 'Вторник')).toBe(original)
    expect(upsertWeeklyTask(original, week, 'first', original.weeklyPlans[week].tasks[0].title)).toBe(original)
    expect(toggleWeeklyTaskCompletion(original, week, 'missing')).toBe(original)
    expect(removeWeeklyTask(original, week, 'missing')).toBe(original)
  })

  it('deletes and restores a completed task in place without awarding XP or coins', () => {
    const original = toggleWeeklyTaskCompletion(withPlans(), week, 'second')
    const removed = removeWeeklyTask(original, week, 'second')
    const restored = restoreWeeklyTask(removed, { week, task: original.weeklyPlans[week].tasks[1], index: 1 })
    expect(restored.weeklyPlans[week]).toEqual(original.weeklyPlans[week])
    expectOnlyWeeklyChanged(original, removed)
    expectOnlyWeeklyChanged(removed, restored)
    expect(restoreWeeklyTask(restored, { week, task: original.weeklyPlans[week].tasks[1], index: 1 })).toBe(restored)
  })

  it('retains undo data when a full week cannot accept the deleted task', () => {
    let original = withPlans()
    original = upsertWeeklyTask(original, week, 'fourth', 'Четвёртая')
    original = upsertWeeklyTask(original, week, 'fifth', 'Пятая')
    expect(restoreWeeklyTask(original, { week, task: task('deleted', true), index: 1 })).toBe(original)
    const freed = removeWeeklyTask(original, week, 'fifth')
    expect(restoreWeeklyTask(freed, { week, task: task('deleted', true), index: 1 }).weeklyPlans[week].tasks[1]).toEqual(task('deleted', true))
  })

  it('plans a clean future checklist and reviews the current week independently', () => {
    const original = withPlans()
    const futureTasks = [task('future-a', true), task('future-b'), task('future-c')]
    const planned = replaceWeeklyPlan(original, nextWeek, futureTasks)
    const reviewed = reviewWeeklyPlan(planned, week, reviewTime)
    expect(reviewed.weeklyPlans[nextWeek].tasks.every((item) => !item.done)).toBe(true)
    expect(reviewed.weeklyPlans[nextWeek].reviewedAt).toBeNull()
    expect(reviewed.weeklyPlans[week].reviewedAt).toBe(reviewTime)
    expect(reviewed.weeklyPlans[week].tasks).toBe(original.weeklyPlans[week].tasks)
    expectOnlyWeeklyChanged(original, planned)
    expectOnlyWeeklyChanged(planned, reviewed)
    expect(futureTasks[0].done).toBe(true)
  })

  it('allows review and incremental drafting of an empty week', () => {
    const empty = createInitialState()
    const reviewed = reviewWeeklyPlan(empty, week, reviewTime)
    expect(reviewed.weeklyPlans[week]).toEqual({ tasks: [], reviewedAt: reviewTime })
    const added = upsertWeeklyTask(reviewed, week, 'first', 'Первая задача')
    expect(added.weeklyPlans[week].reviewedAt).toBe(reviewTime)
    expect(added.weeklyPlans[week].tasks).toHaveLength(1)
  })

  it('resumes a prepared plan without clearing checkmarks, IDs or its review', () => {
    const original = reviewWeeklyPlan(toggleWeeklyTaskCompletion(withPlans(), week, 'second'), week, reviewTime)
    const resubmitted = original.weeklyPlans[week].tasks.map((item, index) => ({ id: `new-${index}`, title: ` ${item.title} `, done: false }))
    expect(replaceWeeklyPlan(original, week, resubmitted)).toBe(original)
    const edited = replaceWeeklyPlan(original, week, [...resubmitted.slice(0, 2), { id: 'replacement', title: 'Новый результат', done: true }])
    expect(edited.weeklyPlans[week].tasks[0]).toBe(original.weeklyPlans[week].tasks[0])
    expect(edited.weeklyPlans[week].tasks[1]).toBe(original.weeklyPlans[week].tasks[1])
    expect(edited.weeklyPlans[week].tasks[1].done).toBe(true)
    expect(edited.weeklyPlans[week].tasks[2]).toEqual({ id: 'replacement', title: 'Новый результат', done: false })
    expect(edited.weeklyPlans[week].reviewedAt).toBe(reviewTime)
    expectOnlyWeeklyChanged(original, edited)
  })

  it('keeps task identity when reordering equal titles in the multiline plan', () => {
    const original = { ...createInitialState(), weeklyPlans: { [week]: plan([
      { id: 'equal-a', title: 'Общая задача', done: true },
      { id: 'distinct', title: 'Другая задача', done: false },
      { id: 'equal-b', title: 'Общая задача', done: false },
    ]) } }
    const edited = replaceWeeklyPlan(original, week, [
      { id: 'draft-a', title: 'Общая задача', done: false },
      { id: 'draft-b', title: 'Общая задача', done: false },
      { id: 'draft-c', title: 'Другая задача', done: false },
    ])
    expect(edited.weeklyPlans[week].tasks.map((item) => [item.id, item.done])).toEqual([
      ['equal-a', true], ['equal-b', false], ['distinct', false],
    ])
  })

  it('requires three to five valid titles for full planning', () => {
    const original = withPlans()
    expect(weeklyPlanError(['a', 'b'])).not.toBeNull()
    expect(weeklyPlanError(['a', 'b', 'c', 'd', 'e', 'f'])).not.toBeNull()
    expect(weeklyPlanError(['a', ' ', 'c'])).not.toBeNull()
    expect(weeklyPlanError(['a', 'b', 'x'.repeat(301)])).not.toBeNull()
    expect(weeklyPlanError(['a', 'b', 'c'])).toBeNull()
    expect(replaceWeeklyPlan(original, nextWeek, [task('a'), task('b')])).toBe(original)
    expect(replaceWeeklyPlan(original, nextWeek, [task('a'), task('a'), task('b')])).toBe(original)
    expect(reviewWeeklyPlan(original, week, '2026-02-30T00:00:00.000Z')).toBe(original)
  })
})

describe('weekly save migration and validation', () => {
  it.each([1, 2, 3, 4, 5])('upgrades schema %s without inventing weekly demo tasks or changing prior data', (version) => {
    const state = withPlans()
    const { weeklyPlans: _unused, ...withoutWeekly } = state
    const legacy = { ...withoutWeekly, version }
    const snapshot = structuredClone(legacy)
    expect(migrateState(legacy)).toEqual({ ...withoutWeekly, version: 6, weeklyPlans: {} })
    expect(legacy).toEqual(snapshot)
  })

  it('adds an empty weekly map to a versionless legacy save', () => {
    const { weeklyPlans: _weekly, version: _version, ...legacy } = createInitialState()
    expect(migrateState(legacy).weeklyPlans).toEqual({})
  })

  it('round-trips current, future and historical checklists through JSON with review intact', () => {
    const completed = toggleWeeklyTaskCompletion(withPlans(), week, 'second')
    const reviewed = reviewWeeklyPlan(completed, week, reviewTime)
    const restored = migrateState(JSON.parse(JSON.stringify(reviewed)))
    expect(restored).toEqual(reviewed)
    expect(migrateState(restored)).toEqual(restored)
    expect(restored.profile).toEqual(reviewed.profile)
    expect(restored.weeklyPlans['2026-09-21'].tasks[0].done).toBe(true)
  })

  it.each([
    undefined, null, [],
    { '2026-02-30': plan() },
    { '2026-09-29': plan() },
    { '2026-09-28': null },
    { '2026-09-28': { tasks: [] } },
    { '2026-09-28': { tasks: [], reviewedAt: 'yesterday' } },
    { '2026-09-28': { tasks: [], reviewedAt: '2026-02-30T00:00:00.000Z' } },
    { '2026-09-28': plan([task('duplicate'), task('duplicate')]) },
    { '2026-09-28': plan(Array.from({ length: 6 }, (_, index) => task(String(index)))) },
    { '2026-09-28': plan([{ ...task('one'), title: '  ' }]) },
    { '2026-09-28': plan([{ ...task('one'), title: 'x'.repeat(301) }]) },
    { '2026-09-28': plan([{ ...task('one'), id: 'x'.repeat(101) }]) },
    { '2026-09-28': plan([{ ...task('one'), done: 'yes' } as unknown as WeeklyTask]) },
    { '2026-09-28': plan([{ ...task('one'), dueDate: '2026-10-04' } as WeeklyTask]) },
  ])('rejects malformed schema-6 weekly state without modifying the source: %j', (weeklyPlans) => {
    const malformed = { ...createInitialState(), weeklyPlans }
    const snapshot = structuredClone(malformed)
    expect(() => migrateState(malformed)).toThrow(/weeklyPlans/)
    expect(malformed).toEqual(snapshot)
  })

  it('preserves customized v5 profile, inventory, goals, plan, progress and history', () => {
    const state = createInitialState()
    const current = {
      ...state,
      profile: { ...state.profile, name: 'Алекс', totalXp: 590, gold: 18, activeDays: ['2026-10-04'] },
      skills: state.skills.map((skill) => ({ ...skill, xp: skill.id === 'programming' ? 185 : skill.xp, color: skill.id === 'programming' ? '#abcdef' : skill.color })),
      purchasedRewards: [{ id: 'purchase', rewardId: state.rewards[0].id, title: 'Вечер с игрой', icon: '🎮', purchasedAt: reviewTime }],
      goals: [{ id: 'goal', skillId: 'programming', title: 'Первое приложение', purpose: 'Учиться', successCriteria: 'Запуск', targetDate: null, progress: 40, status: 'active' as const, createdAt: reviewTime, completedAt: null }],
      levelRewards: { highestLevel: 4, acknowledgedLevel: 4, personal: [{ id: 'gift', title: 'Вечер с игрой', level: 5, claimedAt: null }] },
      history: [{ id: 'completed', type: 'quest' as const, questId: state.quests[0].id, skillId: 'programming', date: '2026-10-04', createdAt: reviewTime, title: 'Работа', xp: 50, gold: 10 }],
    }
    const { weeklyPlans: _weekly, ...legacy } = current
    expect(migrateState({ ...legacy, version: 5 })).toEqual({ ...current, weeklyPlans: {} })
  })
})
