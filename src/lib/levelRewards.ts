import { levelProgress } from './game'
import type { AppState } from './types'

export const levelGold = (level: number) => 10 + (level % 5 === 0 ? 25 : 0)
export const levelGoldBetween = (from: number, to: number) => Math.max(0, to - from) * 10 + Math.max(0, Math.floor(to / 5) - Math.floor(from / 5)) * 25

export function awardNewLevels(state: AppState, date: string, createdAt: string): AppState {
  const level = levelProgress(state.profile.totalXp).level
  const previous = state.levelRewards.highestLevel
  if (level <= previous) return state
  const gold = levelGoldBetween(previous, level)
  return {
    ...state,
    profile: { ...state.profile, gold: state.profile.gold + gold },
    levelRewards: { ...state.levelRewards, highestLevel: level },
    history: [...state.history, {
      id: `level-${previous + 1}-${level}`, type: 'level', date, createdAt,
      title: previous + 1 === level ? `Достигнут уровень ${level}` : `Достигнуты уровни ${previous + 1}–${level}`, xp: 0, gold,
    }],
  }
}

export function claimLevelReward(state: AppState, id: string, date: string, createdAt: string): AppState {
  const reward = state.levelRewards.personal.find((item) => item.id === id)
  if (!reward || reward.claimedAt || reward.level > state.levelRewards.highestLevel) return state
  return {
    ...state,
    levelRewards: { ...state.levelRewards, personal: state.levelRewards.personal.map((item) => item.id === id ? { ...item, claimedAt: createdAt } : item) },
    history: [...state.history, { id: `level-reward-${id}`, type: 'level-reward', rewardId: id, date, createdAt, title: reward.title, xp: 0, gold: 0 }],
  }
}
