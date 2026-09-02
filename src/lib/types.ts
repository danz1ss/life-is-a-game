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
  dueDate: string | null
  scheduledTime: string | null
  durationMinutes: number
  repeatDays: number[]
  isMain: boolean
  completedDates: string[]
  createdAt: string
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
  type: 'quest' | 'reward'
  date: string
  createdAt: string
  title: string
  questId?: string
  rewardId?: string
  skillId?: string | null
  xp: number
  gold: number
}

export interface AppState {
  version: 1
  profile: Profile
  skills: Skill[]
  quests: Quest[]
  rewards: Reward[]
  history: HistoryEvent[]
  preferences: {
    todayMode: 'list' | 'timeline'
  }
}

export type QuestDraft = Omit<Quest, 'id' | 'createdAt' | 'completedDates'>
export type SkillDraft = Omit<Skill, 'id' | 'createdAt' | 'xp' | 'position'> & {
  position?: { x: number; y: number }
}
export type RewardDraft = Omit<Reward, 'id' | 'createdAt'>
