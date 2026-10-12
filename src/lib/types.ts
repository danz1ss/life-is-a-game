import type { BackgroundTheme } from './appearance'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface CharacterAppearance {
  gender: 'boy' | 'girl'
  skin: 'light' | 'medium' | 'dark'
  hair: 'short' | 'long' | 'hood' | 'wind' | 'crown'
  outfit: 'casual' | 'traveler' | 'guardian' | 'mage' | 'ranger' | 'champion' | 'celestial'
  weapon: 'none' | 'sword' | 'shield' | 'staff' | 'bow' | 'twin' | 'crystal'
  accent: 'azure' | 'violet' | 'amber' | 'emerald' | 'rose' | 'gold'
  pet?: 'fox' | 'owl' | 'dragon'
}

export interface Profile {
  name: string
  avatar: string
  character?: CharacterAppearance
  petName?: string
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
  useImmediately?: boolean
  createdAt: string
}

export interface PurchasedReward {
  id: string
  rewardId: string
  title: string
  icon: string
  purchasedAt: string
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
  closed?: boolean
}

export interface WeeklyTask {
  id: string
  title: string
  done: boolean
}

export interface WeeklyPlan {
  tasks: WeeklyTask[]
  reviewedAt: string | null
}

export interface DeletedWeeklyTask {
  week: string
  task: WeeklyTask
  index: number
}

export interface PersonalLevelReward {
  id: string
  title: string
  level: number
  claimedAt: string | null
}

export interface AppState {
  version: 6
  profile: Profile
  skills: Skill[]
  quests: Quest[]
  goals: SkillGoal[]
  rewards: Reward[]
  purchasedRewards: PurchasedReward[]
  history: HistoryEvent[]
  dayPlans: Record<string, DayPlan>
  weeklyPlans: Record<string, WeeklyPlan>
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
