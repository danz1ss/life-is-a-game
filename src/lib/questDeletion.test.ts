import { describe, expect, it } from 'vitest'
import { createInitialState } from './game'
import { removeQuest, restoreDeletedQuest } from './questDeletion'

describe('удаление и восстановление квестов', () => {
  it('удаляет выполненный квест, сохраняя заработанные награды и историю', () => {
    const state = createInitialState()
    const quest = state.quests[0]
    quest.completedDates = ['2026-09-10']
    state.profile.totalXp = 100
    state.profile.gold = 25
    state.history = [{ id: 'event', type: 'quest', questId: quest.id, title: quest.title, date: '2026-09-10', createdAt: quest.createdAt, xp: 100, gold: 25 }]
    const deleted = removeQuest(state, quest.id)
    expect(deleted.quests.some((item) => item.id === quest.id)).toBe(false)
    expect(deleted.profile).toEqual(state.profile)
    expect(deleted.skills).toEqual(state.skills)
    expect(deleted.history).toEqual(state.history)
    expect(restoreDeletedQuest(deleted, quest)).toEqual(state)
  })

  it('восстанавливает повторения, пропуски и позицию, не откатывая другие изменения', () => {
    const state = createInitialState()
    const quest = state.quests[1]
    quest.repeatDays = [1, 3, 5]
    quest.skippedDates = ['2026-09-09']
    const deleted = removeQuest(state, quest.id)
    deleted.profile = { ...deleted.profile, gold: 99 }
    const restored = restoreDeletedQuest(deleted, quest)
    expect(restored.quests).toEqual(state.quests)
    expect(restored.profile.gold).toBe(99)
    expect(restoreDeletedQuest(restored, quest)).toBe(restored)
  })

  it('сохраняет новый главный квест при отмене удаления предыдущего', () => {
    const state = createInitialState()
    const quest = { ...state.quests[0], isMain: true }
    const deleted = removeQuest(state, quest.id)
    deleted.quests[0].isMain = true
    const restored = restoreDeletedQuest(deleted, quest)
    expect(restored.quests.filter((item) => item.isMain).map((item) => item.id)).toEqual([deleted.quests[0].id])
  })

  it('не восстанавливает ссылку на удалённый навык', () => {
    const state = createInitialState()
    const quest = state.quests[0]
    const deleted = removeQuest(state, quest.id)
    deleted.skills = deleted.skills.filter((skill) => skill.id !== quest.skillId)
    expect(restoreDeletedQuest(deleted, quest).quests.find((item) => item.id === quest.id)?.skillId).toBeNull()
  })
})
