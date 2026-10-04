import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode, type SetStateAction } from 'react'
import { createInitialState, dateKey, difficultyConfig, goalCompletionReward, isQuestComplete, isQuestSkipped, migrateState } from './game'
import type { AppState, DeletedWeeklyTask, Profile, Quest, QuestDraft, Reward, RewardDraft, Skill, SkillDraft, SkillGoal, SkillGoalDraft } from './types'
import { removeQuest, restoreDeletedQuest } from './questDeletion'
import { updateSkillColors } from './skillColors'
import type { BackgroundTheme } from './appearance'
import { nextSkillPosition } from './treeLayout'
import { createStateSaver, type SaveStatus } from './stateSaver'
import { toggleQuestCompletion, toggleQuestSkipped } from './questCompletion'
import { assignMainQuest, patchPlannedQuest, reorderDayQuest, rescheduleOneTimeQuest } from './planning'
import { awardNewLevels, claimLevelReward } from './levelRewards'
import { useToday } from './useToday'
import { closeQuestDay } from './dayReview'
import { isWeekMonday, removeWeeklyTask, replaceWeeklyPlan, restoreWeeklyTask, reviewWeeklyPlan, toggleWeeklyTaskCompletion, upsertWeeklyTask, weeklyPlanError, weeklyTaskLimit } from './weeklyPlanning'

interface StoreValue {
  state: AppState
  today: string
  saveStatus: SaveStatus
  toast: string | null
  dismissToast: () => void
  addQuest: (draft: QuestDraft, onDate?: string) => void
  updateQuest: (id: string, patch: Partial<Quest>, onDate?: string) => void
  rescheduleQuest: (id: string, targetDate: string) => void
  deleteQuest: (id: string) => void
  deletedQuest: Quest | null
  undoDeleteQuest: () => void
  dismissDeletedQuests: () => void
  archiveQuest: (id: string) => void
  restoreQuest: (id: string) => void
  toggleQuest: (id: string, onDate?: string) => void
  skipQuest: (id: string, onDate?: string) => void
  closeDay: (onDate?: string) => void
  reorderQuest: (sourceId: string, targetId: string, placement: 'before' | 'after', onDate?: string) => void
  setMainQuest: (id: string, onDate?: string) => void
  saveWeeklyTask: (week: string, title: string, id?: string) => void
  deleteWeeklyTask: (week: string, id: string) => void
  toggleWeeklyTask: (week: string, id: string) => void
  planWeek: (week: string, titles: string[]) => void
  reviewWeek: (week: string) => void
  deletedWeeklyTask: DeletedWeeklyTask | null
  undoDeleteWeeklyTask: () => void
  dismissDeletedWeeklyTasks: () => void
  acknowledgeLevelRewards: () => void
  savePersonalLevelReward: (title: string, level: number, id?: string) => void
  deletePersonalLevelReward: (id: string) => void
  claimPersonalLevelReward: (id: string) => void
  addSkill: (draft: SkillDraft) => void
  updateSkill: (id: string, patch: Partial<Skill>) => void
  deleteSkill: (id: string) => void
  moveSkill: (id: string, position: { x: number; y: number }) => void
  addGoal: (draft: SkillGoalDraft) => void
  updateGoal: (id: string, patch: Partial<SkillGoal>) => void
  deleteGoal: (id: string) => void
  completeGoal: (id: string) => void
  addReward: (draft: RewardDraft) => void
  updateReward: (id: string, patch: Partial<Reward>) => void
  deleteReward: (id: string) => void
  redeemReward: (id: string) => boolean
  usePurchasedReward: (id: string) => void
  updateProfile: (patch: Partial<Profile>) => void
  setTodayMode: (mode: 'list' | 'timeline') => void
  setBackground: (theme: BackgroundTheme) => void
  exportBackup: () => Promise<string | null>
  importBackup: () => Promise<boolean>
}

const StoreContext = createContext<StoreValue | null>(null)

function uuid() {
  return crypto.randomUUID()
}

async function loadPersistedState() {
  if (window.lifeGame) return window.lifeGame.loadState()
  const raw = localStorage.getItem('life-is-a-game-state')
  if (raw === null) return null
  const stored: unknown = JSON.parse(raw)
  if (stored === null) throw new Error('Некорректный файл сохранения')
  return stored
}

async function persistState(state: AppState) {
  if (window.lifeGame) return window.lifeGame.saveState(state)
  localStorage.setItem('life-is-a-game-state', JSON.stringify(state))
  return true
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setStoredState] = useState<AppState | null>(null)
  const today = useToday()
  const setState = useCallback((update: SetStateAction<AppState | null>) => {
    const now = new Date()
    setStoredState((current) => {
      const next = typeof update === 'function' ? update(current) : update
      return current && next && next.profile.totalXp > current.profile.totalXp ? awardNewLevels(next, dateKey(now), now.toISOString()) : next
    })
  }, [])
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading')
  const [toast, setToast] = useState<string | null>(null)
  const [deletedQuests, setDeletedQuests] = useState<Quest[]>([])
  const [deletedWeeklyTasks, setDeletedWeeklyTasks] = useState<DeletedWeeklyTask[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saver] = useState(() => createStateSaver(persistState, setSaveStatus))
  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let active = true
    setLoadError(null)
    loadPersistedState()
      .then((stored) => {
        if (!active) return
        const next = stored === null ? createInitialState() : migrateState(stored)
        setState(next)
        setSaveStatus('saved')
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoadError(error instanceof Error ? error.message : 'Не удалось прочитать сохранение')
        setSaveStatus('error')
      })
    return () => { active = false }
  }, [loadAttempt])

  useLayoutEffect(() => {
    if (!state) return
    saver.schedule(state)
    return () => saver.cancelScheduled()
  }, [saver, state])

  useEffect(() => window.lifeGame?.onBeforeClose(async () => {
    try {
      await saver.flush()
      return true
    } catch {
      setToast('Не удалось сохранить изменения. Повторите закрытие для повторной попытки.')
      return false
    }
  }), [saver])

  useEffect(() => {
    const saveOnPageHide = () => {
      // localStorage writes synchronously; an unloading browser cannot await a promise.
      if (state && !window.lifeGame) {
        try { localStorage.setItem('life-is-a-game-state', JSON.stringify(state)) } catch { /* The save indicator reports storage failures. */ }
      }
    }
    window.addEventListener('pagehide', saveOnPageHide)
    return () => window.removeEventListener('pagehide', saveOnPageHide)
  }, [state])

  const value = useMemo<StoreValue | null>(() => {
    if (!state) return null

    const addQuest = (draft: QuestDraft, onDate = dateKey()) => {
      const id = uuid()
      setState((current) => {
        if (!current) return current
        const next = {
          ...current,
          quests: [
            ...current.quests,
            { ...draft, isMain: false, id, order: current.quests.reduce((max, quest) => Math.max(max, quest.order), -1) + 1, completedDates: [], skippedDates: [], archivedAt: null, createdAt: new Date().toISOString() },
          ],
        }
        return draft.isMain ? assignMainQuest(next, id, draft.repeatDays.length ? onDate : draft.dueDate ?? onDate) : next
      })
    }

    const updateQuest = (id: string, patch: Partial<Quest>, onDate = dateKey()) => {
      setState((current) => current && patchPlannedQuest(current, id, patch, onDate))
    }

    const rescheduleQuest = (id: string, targetDate: string) => {
      const reopensDay = Boolean(state.dayPlans[targetDate]?.closed)
      setState((current) => current && rescheduleOneTimeQuest(current, id, targetDate))
      setToast(reopensDay ? 'День снова открыт · задачи вернулись в план' : 'Квест запланирован на выбранный день')
    }

    const deleteQuest = (id: string) => {
      const quest = state.quests.find((item) => item.id === id)
      if (!quest) return
      setDeletedQuests((items) => [...items, quest])
      setState((current) => current && removeQuest(current, id))
    }

    const undoDeleteQuest = () => {
      const quest = deletedQuests.at(-1)
      if (!quest) return
      setState((current) => current && restoreDeletedQuest(current, quest))
      setDeletedQuests((items) => items.slice(0, -1))
    }

    const archiveQuest = (id: string) => {
      setState((current) => current && ({
        ...current,
        quests: current.quests.map((quest) => quest.id === id
          ? { ...quest, archivedAt: new Date().toISOString(), isMain: false }
          : quest),
      }))
      setToast('Квест отправлен в архив')
    }

    const restoreQuest = (id: string) => {
      setState((current) => current && ({
        ...current,
        quests: current.quests.map((quest) => quest.id === id
          ? { ...quest, archivedAt: null, dueDate: quest.repeatDays.length > 0 ? null : dateKey() }
          : quest),
      }))
      setToast('Квест возвращён на сегодня')
    }

    const toggleQuest = (id: string, onDate = dateKey()) => {
      const quest = state.quests.find((item) => item.id === id)
      if (!quest) return
      const eventId = uuid()
      const createdAt = new Date().toISOString()
      setState((current) => current && toggleQuestCompletion(current, id, onDate, eventId, createdAt))
      if (!isQuestComplete(quest, onDate)) {
        const reward = difficultyConfig[quest.difficulty]
        setToast(`Выполнено · +${reward.xp} XP · +${reward.gold} монет`)
      }
    }

    const skipQuest = (id: string, onDate = dateKey()) => {
      const quest = state.quests.find((item) => item.id === id)
      if (!quest) return
      setState((current) => current && toggleQuestSkipped(current, id, onDate))
      setToast(isQuestSkipped(quest, onDate) ? 'Квест снова ожидает отметки' : 'Не выполнено · не печалься, всё будет хорошо')
    }

    const closeDay = (onDate = dateKey()) => {
      const review = closeQuestDay(state, onDate)
      setState((current) => current && closeQuestDay(current, onDate).state)
      if (review.unresolved + review.skippedRepeats === 0) {
        setToast('День закрыт · все квесты разобраны')
        return
      }
      setToast(`День закрыт · требуют решения: ${review.unresolved} · пропущено повторов: ${review.skippedRepeats}`)
    }

    const reorderQuest = (sourceId: string, targetId: string, placement: 'before' | 'after', onDate = dateKey()) => {
      if (sourceId === targetId) return
      setState((current) => {
        if (!current) return current
        return reorderDayQuest(current, sourceId, targetId, placement, onDate)
      })
    }

    const setMainQuest = (id: string, onDate = dateKey()) => {
      setState((current) => current && assignMainQuest(current, id, onDate))
      setToast('Главный квест дня выбран')
    }

    const saveWeeklyTask = (week: string, title: string, existingId?: string) => {
      const id = existingId ?? uuid()
      setState((current) => current && upsertWeeklyTask(current, week, id, title))
    }

    const deleteWeeklyTask = (week: string, id: string) => {
      if (!isWeekMonday(week)) return
      const tasks = state.weeklyPlans[week]?.tasks ?? []
      const index = tasks.findIndex((task) => task.id === id)
      if (index < 0) return
      setDeletedWeeklyTasks((items) => [...items, { week, task: tasks[index], index }])
      setState((current) => current && removeWeeklyTask(current, week, id))
    }

    const undoDeleteWeeklyTask = () => {
      const deleted = deletedWeeklyTasks.at(-1)
      if (!deleted) return
      const plan = state.weeklyPlans[deleted.week]
      if (plan && plan.tasks.length >= weeklyTaskLimit && !plan.tasks.some((task) => task.id === deleted.task.id)) {
        setToast('В неделе уже 5 задач. Освободите место, чтобы вернуть удалённую.')
        return
      }
      setState((current) => current && restoreWeeklyTask(current, deleted))
      setDeletedWeeklyTasks((items) => items.slice(0, -1))
    }

    const toggleWeeklyTask = (week: string, id: string) => {
      setState((current) => current && toggleWeeklyTaskCompletion(current, week, id))
    }

    const planWeek = (week: string, titles: string[]) => {
      if (!isWeekMonday(week) || weeklyPlanError(titles.map((title) => title.trim()))) return
      const tasks = titles.map((title) => ({ id: uuid(), title, done: false }))
      setState((current) => current && replaceWeeklyPlan(current, week, tasks))
      setToast('Главные задачи недели сохранены')
    }

    const reviewWeek = (week: string) => {
      const reviewedAt = new Date().toISOString()
      setState((current) => current && reviewWeeklyPlan(current, week, reviewedAt))
    }

    const addSkill = (draft: SkillDraft) => {
      setState((current) => {
        if (!current) return current
        return {
          ...current,
          skills: [...current.skills, {
            ...draft,
            id: uuid(),
            xp: 0,
            position: draft.position ?? nextSkillPosition(current.skills, draft.parentId),
            createdAt: new Date().toISOString(),
          }],
        }
      })
    }

    const updateSkill = (id: string, patch: Partial<Skill>) => {
      setState((current) => current && ({
        ...current,
        skills: updateSkillColors(current.skills, id, patch),
      }))
    }

    const deleteSkill = (id: string) => {
      setState((current) => current && ({
        ...current,
        skills: current.skills.filter((skill) => skill.id !== id).map((skill) => skill.parentId === id ? { ...skill, parentId: null } : skill),
        quests: current.quests.map((quest) => quest.skillId === id ? { ...quest, skillId: null } : quest),
        goals: current.goals.filter((goal) => goal.skillId !== id),
      }))
    }

    const moveSkill = (id: string, position: { x: number; y: number }) => {
      setState((current) => current && ({
        ...current,
        skills: current.skills.map((skill) => skill.id === id ? { ...skill, position } : skill),
      }))
    }

    const addGoal = (draft: SkillGoalDraft) => {
      setState((current) => {
        if (!current || current.goals.some((goal) => goal.skillId === draft.skillId && goal.status !== 'completed')) return current
        return {
          ...current,
          goals: [...current.goals, {
            ...draft,
            progress: Math.max(0, Math.min(100, draft.progress)),
            id: uuid(), status: 'active', createdAt: new Date().toISOString(), completedAt: null,
          }],
        }
      })
      setToast('Главная цель навыка создана')
    }

    const updateGoal = (id: string, patch: Partial<SkillGoal>) => {
      setState((current) => current && ({
        ...current,
        goals: current.goals.map((goal) => goal.id === id
          ? { ...goal, ...patch, progress: patch.progress === undefined ? goal.progress : Math.max(0, Math.min(100, patch.progress)) }
          : goal),
      }))
    }

    const deleteGoal = (id: string) => {
      setState((current) => current && ({
        ...current,
        goals: current.goals.filter((goal) => goal.id !== id || goal.status === 'completed'),
      }))
    }

    const completeGoal = (id: string) => {
      const goal = state.goals.find((item) => item.id === id && item.status !== 'completed')
      if (!goal) return
      setState((current) => {
        if (!current) return current
        const currentGoal = current.goals.find((item) => item.id === id && item.status !== 'completed')
        if (!currentGoal) return current
        const now = new Date().toISOString()
        return {
          ...current,
          profile: {
            ...current.profile,
            totalXp: current.profile.totalXp + goalCompletionReward.xp,
            gold: current.profile.gold + goalCompletionReward.gold,
          },
          skills: current.skills.map((skill) => skill.id === currentGoal.skillId
            ? { ...skill, xp: skill.xp + goalCompletionReward.xp }
            : skill),
          goals: current.goals.map((item) => item.id === id
            ? { ...item, progress: 100, status: 'completed', completedAt: now }
            : item),
          history: [...current.history, {
            id: uuid(), type: 'goal', goalId: currentGoal.id, skillId: currentGoal.skillId,
            date: dateKey(), createdAt: now, title: currentGoal.title,
            xp: goalCompletionReward.xp, gold: goalCompletionReward.gold,
          }],
        }
      })
      setToast(`Цель достигнута · +${goalCompletionReward.xp} XP · +${goalCompletionReward.gold} монет`)
    }

    const addReward = (draft: RewardDraft) => {
      setState((current) => current && ({
        ...current,
        rewards: [...current.rewards, { ...draft, id: uuid(), createdAt: new Date().toISOString() }],
      }))
    }

    const updateReward = (id: string, patch: Partial<Reward>) => {
      setState((current) => current && ({
        ...current,
        rewards: current.rewards.map((reward) => reward.id === id ? { ...reward, ...patch } : reward),
      }))
    }

    const deleteReward = (id: string) => {
      setState((current) => current && ({ ...current, rewards: current.rewards.filter((reward) => reward.id !== id) }))
    }

    const redeemReward = (id: string) => {
      const reward = state.rewards.find((item) => item.id === id)
      if (!reward || state.profile.gold < reward.cost) return false
      setState((current) => {
        if (!current) return current
        const currentReward = current.rewards.find((item) => item.id === id)
        if (!currentReward || current.profile.gold < currentReward.cost) return current
        return {
          ...current,
          profile: { ...current.profile, gold: current.profile.gold - currentReward.cost },
          purchasedRewards: currentReward.useImmediately ? current.purchasedRewards : [...current.purchasedRewards, {
            id: uuid(), rewardId: currentReward.id, title: currentReward.title, icon: currentReward.icon, purchasedAt: new Date().toISOString(),
          }],
          history: [...current.history, {
            id: uuid(), type: 'reward', date: dateKey(), createdAt: new Date().toISOString(), title: currentReward.title,
            rewardId: currentReward.id, xp: 0, gold: -currentReward.cost,
          }],
        }
      })
      setToast(reward.useImmediately ? `Награда использована: ${reward.title}` : `Награда куплена: ${reward.title}`)
      return true
    }

    const usePurchasedReward = (id: string) => {
      setState((current) => current && ({ ...current, purchasedRewards: current.purchasedRewards.filter((item) => item.id !== id) }))
    }

    const updateProfile = (patch: Partial<Profile>) => {
      setState((current) => current && ({ ...current, profile: { ...current.profile, ...patch } }))
    }

    const setTodayMode = (mode: 'list' | 'timeline') => {
      setState((current) => current && ({ ...current, preferences: { ...current.preferences, todayMode: mode } }))
    }

    const setBackground = (background: BackgroundTheme) => {
      setState((current) => current && ({ ...current, preferences: { ...current.preferences, background } }))
    }

    const exportBackup = async () => {
      if (!window.lifeGame) {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `life-is-a-game-backup-${dateKey()}.json`
        link.click()
        URL.revokeObjectURL(url)
        return link.download
      }
      const result = await window.lifeGame.exportBackup(state)
      return result.canceled ? null : result.filePath ?? null
    }

    const importBackup = async () => {
      if (!window.lifeGame) return false
      const result = await window.lifeGame.importBackup()
      if (result.canceled || !result.state) return false
      setStoredState(migrateState(result.state))
      setDeletedQuests([])
      setDeletedWeeklyTasks([])
      setToast('Резервная копия восстановлена')
      return true
    }

    return {
      state, today, saveStatus, toast, dismissToast,
      acknowledgeLevelRewards: () => setState((current) => current && ({ ...current, levelRewards: { ...current.levelRewards, acknowledgedLevel: current.levelRewards.highestLevel } })),
      savePersonalLevelReward: (title, level, existingId) => {
        const id = existingId ?? uuid()
        setState((current) => {
          if (!current || !title.trim() || !Number.isSafeInteger(level) || level <= current.levelRewards.highestLevel) return current
          const existing = current.levelRewards.personal.find((reward) => reward.id === id)
          if (existing && existing.level <= current.levelRewards.highestLevel) return current
          const reward = { id, title: title.trim(), level, claimedAt: null }
          return { ...current, levelRewards: { ...current.levelRewards, personal: existing
            ? current.levelRewards.personal.map((item) => item.id === id ? reward : item) : [...current.levelRewards.personal, reward] } }
        })
      },
      deletePersonalLevelReward: (id) => setState((current) => current && ({ ...current, levelRewards: { ...current.levelRewards,
        personal: current.levelRewards.personal.filter((reward) => reward.id !== id || reward.level <= current.levelRewards.highestLevel) } })),
      claimPersonalLevelReward: (id) => setState((current) => current && claimLevelReward(current, id, dateKey(), new Date().toISOString())),
      deletedQuest: deletedQuests.at(-1) ?? null, undoDeleteQuest, dismissDeletedQuests: () => setDeletedQuests([]),
      addQuest, updateQuest, rescheduleQuest, deleteQuest, archiveQuest, restoreQuest, toggleQuest, skipQuest, closeDay, reorderQuest, setMainQuest,
      saveWeeklyTask, deleteWeeklyTask, toggleWeeklyTask, planWeek, reviewWeek,
      deletedWeeklyTask: deletedWeeklyTasks.at(-1) ?? null, undoDeleteWeeklyTask, dismissDeletedWeeklyTasks: () => setDeletedWeeklyTasks([]),
      addSkill, updateSkill, deleteSkill, moveSkill,
      addGoal, updateGoal, deleteGoal, completeGoal,
      addReward, updateReward, deleteReward, redeemReward, usePurchasedReward,
      updateProfile, setTodayMode, setBackground, exportBackup, importBackup,
    }
  }, [state, today, saveStatus, toast, deletedQuests, deletedWeeklyTasks, dismissToast, setState])

  if (loadError) return <div className="app-loading" role="alert"><p>Не удалось загрузить данные. Сохранение не изменено.</p><p>{loadError}</p><button className="button button--primary" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Повторить загрузку</button></div>
  if (!value) return <div className="app-loading"><div className="loading-rune">✦</div><p>Загружаем приключение…</p></div>
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore должен использоваться внутри StoreProvider')
  return context
}
