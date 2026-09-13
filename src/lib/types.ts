import type { BackgroundTheme } from './appearance'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Profile {
  name: string
  avatar: string
  totalXp: number
  gold: number
  activeDays: string[]
}

export interface Skill {
  id: string
  name: string
  description: string
  icon: string
  color: string
  parentId: string | null
  xp: number
  position: { x: number; y: number }
  requiredParentLevel: number
  createdAt: string
}

export interface Quest {
  id: string
  title: string
  description: string
  difficulty: Difficulty
  skillId: string | null
  /** Scheduled day for a one-off quest, or the start date of a recurring series. */
  dueDate: string | null
  scheduledTime: string | null
  durationMinutes: number
  repeatDays: number[]
  isMain: boolean
  order: number
  completedDates: string[]
  skippedDates: string[]
  archivedAt: string | null
  createdAt: string
}

export type GoalStatus = 'active' | 'paused' | 'completed'

export interface SkillGoal {
  id: string
  skillId: string
  title: string
  purpose: string
  successCriteria: string
  targetDate: string | null
  progress: number
  status: GoalStatus
  createdAt: string
  completedAt: string | null
}

export interface Reward {
  id: string
  title: string
  description: string
  icon: string
  cost: number
  createdAt: string
}

export interface HistoryEvent {
  id: string
  type: 'quest' | 'reward' | 'goal' | 'level' | 'level-reward'
  date: string
  createdAt: string
  title: string
  questId?: string
  rewardId?: string
  goalId?: string
  skillId?: string | null
  xp: number
  gold: number
}

export interface DayPlan {
  mainQuestId: string | null
  questOrder: string[]
}

export interface PersonalLevelReward {
  id: string
  title: string
  level: number
  claimedAt: string | null
}

export interface AppState {
  version: 5
  profile: Profile
  skills: Skill[]
  quests: Quest[]
  goals: SkillGoal[]
  rewards: Reward[]
  history: HistoryEvent[]
  dayPlans: Record<string, DayPlan>
  levelRewards: {
    highestLevel: number
    acknowledgedLevel: number
    personal: PersonalLevelReward[]
  }
  preferences: {
    todayMode: 'list' | 'timeline'
    background: BackgroundTheme
  }
}

export type QuestDraft = Omit<Quest, 'id' | 'createdAt' | 'order' | 'completedDates' | 'skippedDates' | 'archivedAt'>
export type SkillDraft = Omit<Skill, 'id' | 'createdAt' | 'xp' | 'position'> & {
  position?: { x: number; y: number }
}
export type RewardDraft = Omit<Reward, 'id' | 'createdAt'>
export type SkillGoalDraft = Omit<SkillGoal, 'id' | 'createdAt' | 'completedAt' | 'status'>
