import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createInitialState, dateKey, difficultyConfig, goalCompletionReward, isQuestComplete, isQuestForDate, isQuestSkipped, migrateState, nextDateKey } from './game'
import type { AppState, Profile, Quest, QuestDraft, Reward, RewardDraft, Skill, SkillDraft, SkillGoal, SkillGoalDraft } from './types'

type SaveStatus = 'loading' | 'saved' | 'saving' | 'error'

interface StoreValue {
  state: AppState
  saveStatus: SaveStatus
  toast: string | null
  dismissToast: () => void
  addQuest: (draft: QuestDraft) => void
  updateQuest: (id: string, patch: Partial<Quest>) => void
  deleteQuest: (id: string) => void
  archiveQuest: (id: string) => void
  restoreQuest: (id: string) => void
  toggleQuest: (id: string, onDate?: string) => void
  skipQuest: (id: string, onDate?: string) => void
  closeDay: (onDate?: string) => void
  reorderQuest: (sourceId: string, targetId: string, placement: 'before' | 'after') => void
  setMainQuest: (id: string) => void
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
  updateProfile: (patch: Partial<Profile>) => void
  setTodayMode: (mode: 'list' | 'timeline') => void
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
  return raw ? (JSON.parse(raw) as AppState) : null
}

async function persistState(state: AppState) {
  if (window.lifeGame) return window.lifeGame.saveState(state)
  localStorage.setItem('life-is-a-game-state', JSON.stringify(state))
  return true
}

function activeDaysFromHistory(history: AppState['history']) {
  return [...new Set(history.filter((event) => event.type === 'quest').map((event) => event.date))].sort()
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading')
  const [toast, setToast] = useState<string | null>(null)
  const hydrated = useRef(false)
  const previousLevel = useRef(1)

  useEffect(() => {
    let active = true
    loadPersistedState()
      .then((stored) => {
        if (!active) return
        const next = stored ? migrateState(stored) : createInitialState()
        previousLevel.current = getProfileLevel(next.profile.totalXp)
        setState(next)
        hydrated.current = true
        setSaveStatus('saved')
      })
      .catch(() => {
        if (!active) return
        setState(createInitialState())
        hydrated.current = true
        setSaveStatus('error')
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!state || !hydrated.current) return
    setSaveStatus('saving')
    const timer = window.setTimeout(() => {
      persistState(state)
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [state])

  useEffect(() => {
    if (!state) return
    const level = getProfileLevel(state.profile.totalXp)
    if (level > previousLevel.current) setToast(`Новый уровень: ${level}!`)
    previousLevel.current = level
  }, [state?.profile.totalXp, state])

  const value = useMemo<StoreValue | null>(() => {
    if (!state) return null

    const addQuest = (draft: QuestDraft) => {
      setState((current) => current && ({
        ...current,
        quests: [
          ...current.quests.map((quest) => draft.isMain ? { ...quest, isMain: false } : quest),
          { ...draft, id: uuid(), order: Math.max(-1, ...current.quests.map((quest) => quest.order)) + 1, completedDates: [], skippedDates: [], archivedAt: null, createdAt: new Date().toISOString() },
        ],
      }))
    }

    const updateQuest = (id: string, patch: Partial<Quest>) => {
      setState((current) => current && ({
        ...current,
        quests: current.quests.map((quest) => quest.id === id
          ? { ...quest, ...patch }
          : patch.isMain ? { ...quest, isMain: false } : quest),
      }))
    }

    const deleteQuest = (id: string) => {
      setState((current) => current && ({ ...current, quests: current.quests.filter((quest) => quest.id !== id) }))
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
      setState((current) => {
        if (!current) return current
        const quest = current.quests.find((item) => item.id === id)
        if (!quest) return current
        const complete = !isQuestComplete(quest, onDate)
        const reward = difficultyConfig[quest.difficulty]
        const completionDate = quest.repeatDays.length > 0 ? onDate : (quest.completedDates[0] ?? onDate)
        const eventIndex = current.history.findIndex((event) => event.type === 'quest' && event.questId === id && event.date === completionDate)

        let history = [...current.history]
        if (complete) {
          history.push({
            id: uuid(), type: 'quest', date: onDate, createdAt: new Date().toISOString(), title: quest.title,
            questId: quest.id, skillId: quest.skillId, xp: reward.xp, gold: reward.gold,
          })
          setToast(`+${reward.xp} XP · +${reward.gold} золота`)
        } else if (eventIndex >= 0) {
          history.splice(eventIndex, 1)
        }

        return {
          ...current,
          profile: {
            ...current.profile,
            totalXp: Math.max(0, current.profile.totalXp + (complete ? reward.xp : -reward.xp)),
            gold: Math.max(0, current.profile.gold + (complete ? reward.gold : -reward.gold)),
            activeDays: activeDaysFromHistory(history),
          },
          skills: current.skills.map((skill) => skill.id === quest.skillId
            ? { ...skill, xp: Math.max(0, skill.xp + (complete ? reward.xp : -reward.xp)) }
            : skill),
          quests: current.quests.map((item) => item.id === id
            ? {
              ...item,
              dueDate: complete && item.repeatDays.length === 0 ? onDate : item.dueDate,
              completedDates: complete
                ? (item.repeatDays.length > 0 ? [...item.completedDates, onDate] : [onDate])
                : (item.repeatDays.length > 0 ? item.completedDates.filter((date) => date !== completionDate) : []),
              skippedDates: complete ? item.skippedDates.filter((date) => date !== onDate) : item.skippedDates,
            }
            : item),
          history,
        }
      })
    }

    const skipQuest = (id: string, onDate = dateKey()) => {
      const quest = state.quests.find((item) => item.id === id)
      if (!quest) return
      const skipped = isQuestSkipped(quest, onDate)
      const complete = isQuestComplete(quest, onDate)
      const tomorrow = nextDateKey(onDate)

      setState((current) => {
        if (!current) return current
        const currentQuest = current.quests.find((item) => item.id === id)
        if (!currentQuest) return current

        let history = current.history
        let profile = current.profile
        let skills = current.skills
        if (complete) {
          const completionDate = currentQuest.repeatDays.length > 0 ? onDate : (currentQuest.completedDates[0] ?? onDate)
          const eventIndex = current.history.findIndex((event) => event.type === 'quest' && event.questId === id && event.date === completionDate)
          history = eventIndex < 0 ? current.history : current.history.filter((_, index) => index !== eventIndex)
          const reward = difficultyConfig[currentQuest.difficulty]
          profile = {
            ...current.profile,
            totalXp: Math.max(0, current.profile.totalXp - reward.xp),
            gold: Math.max(0, current.profile.gold - reward.gold),
            activeDays: activeDaysFromHistory(history),
          }
          skills = current.skills.map((skill) => skill.id === currentQuest.skillId
            ? { ...skill, xp: Math.max(0, skill.xp - reward.xp) }
            : skill)
        }

        return {
          ...current,
          profile,
          skills,
          history,
          quests: current.quests.map((item) => item.id === id
            ? {
              ...item,
              dueDate: item.repeatDays.length > 0 ? item.dueDate : (skipped ? onDate : tomorrow),
              completedDates: complete
                ? (item.repeatDays.length > 0 ? item.completedDates.filter((date) => date !== onDate) : [])
                : item.completedDates,
              skippedDates: skipped
                ? item.skippedDates.filter((date) => date !== onDate)
                : [...item.skippedDates.filter((date) => date !== onDate), onDate],
            }
            : item),
        }
      })

      if (skipped) setToast('Квест снова ожидает отметки')
      else if (quest.repeatDays.length > 0) setToast('Повтор отмечен как пропущенный')
      else setToast(`Не выполнено · квест перенесён на ${nextDateKey(onDate).split('-').reverse().slice(0, 2).join('.')}`)
    }

    const closeDay = (onDate = dateKey()) => {
      const pending = state.quests.filter((quest) => isQuestForDate(quest, onDate)
        && !isQuestComplete(quest, onDate)
        && !isQuestSkipped(quest, onDate))
      if (pending.length === 0) {
        setToast('Все квесты дня уже разобраны')
        return
      }

      const ids = new Set(pending.map((quest) => quest.id))
      const tomorrow = nextDateKey(onDate)
      const rescheduled = pending.filter((quest) => quest.repeatDays.length === 0).length
      const skipped = pending.length - rescheduled
      setState((current) => current && ({
        ...current,
        quests: current.quests.map((quest) => ids.has(quest.id)
          ? {
            ...quest,
            dueDate: quest.repeatDays.length > 0 ? quest.dueDate : tomorrow,
            skippedDates: [...quest.skippedDates.filter((date) => date !== onDate), onDate],
          }
          : quest),
      }))
      setToast(`День закрыт · перенесено: ${rescheduled} · пропущено повторов: ${skipped}`)
    }

    const reorderQuest = (sourceId: string, targetId: string, placement: 'before' | 'after') => {
      if (sourceId === targetId) return
      setState((current) => {
        if (!current) return current
        const ordered = [...current.quests].sort((a, b) => a.order - b.order)
        const sourceIndex = ordered.findIndex((quest) => quest.id === sourceId)
        if (sourceIndex < 0 || !ordered.some((quest) => quest.id === targetId)) return current
        const [source] = ordered.splice(sourceIndex, 1)
        const targetIndex = ordered.findIndex((quest) => quest.id === targetId)
        ordered.splice(targetIndex + (placement === 'after' ? 1 : 0), 0, source)
        return { ...current, quests: ordered.map((quest, order) => ({ ...quest, order })) }
      })
    }

    const setMainQuest = (id: string) => {
      setState((current) => current && ({
        ...current,
        quests: current.quests.map((quest) => ({ ...quest, isMain: quest.id === id })),
      }))
      setToast('Главный квест дня выбран')
    }

    const addSkill = (draft: SkillDraft) => {
      setState((current) => {
        if (!current) return current
        const index = current.skills.length
        return {
          ...current,
          skills: [...current.skills, {
            ...draft,
            id: uuid(),
            xp: 0,
            position: draft.position ?? { x: (index % 4) * 230 - 300, y: Math.floor(index / 4) * 190 + 160 },
            createdAt: new Date().toISOString(),
          }],
        }
      })
    }

    const updateSkill = (id: string, patch: Partial<Skill>) => {
      setState((current) => current && ({
        ...current,
        skills: current.skills.map((skill) => skill.id === id ? { ...skill, ...patch } : skill),
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
      setToast(`Цель достигнута · +${goalCompletionReward.xp} XP · +${goalCompletionReward.gold} золота`)
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
          history: [...current.history, {
            id: uuid(), type: 'reward', date: dateKey(), createdAt: new Date().toISOString(), title: currentReward.title,
            rewardId: currentReward.id, xp: 0, gold: -currentReward.cost,
          }],
        }
      })
      setToast(`Награда получена: ${reward.title}`)
      return true
    }

    const updateProfile = (patch: Partial<Profile>) => {
      setState((current) => current && ({ ...current, profile: { ...current.profile, ...patch } }))
    }

    const setTodayMode = (mode: 'list' | 'timeline') => {
      setState((current) => current && ({ ...current, preferences: { ...current.preferences, todayMode: mode } }))
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
      setState(migrateState(result.state))
      setToast('Резервная копия восстановлена')
      return true
    }

    return {
      state, saveStatus, toast, dismissToast: () => setToast(null),
      addQuest, updateQuest, deleteQuest, archiveQuest, restoreQuest, toggleQuest, skipQuest, closeDay, reorderQuest, setMainQuest,
      addSkill, updateSkill, deleteSkill, moveSkill,
      addGoal, updateGoal, deleteGoal, completeGoal,
      addReward, updateReward, deleteReward, redeemReward,
      updateProfile, setTodayMode, exportBackup, importBackup,
    }
  }, [state, saveStatus, toast])

  if (!value) return <div className="app-loading"><div className="loading-rune">✦</div><p>Загружаем приключение…</p></div>
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

function getProfileLevel(xp: number) {
  let level = 1
  let remaining = xp
  let needed = 100
  while (remaining >= needed) {
    remaining -= needed
    level += 1
    needed = 100 + (level - 1) * 35
  }
  return level
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore должен использоваться внутри StoreProvider')
  return context
}
