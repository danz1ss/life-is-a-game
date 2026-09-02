import type { AppState, Difficulty, Quest, Skill } from './types'

export const difficultyConfig: Record<Difficulty, { label: string; xp: number; gold: number; tone: string }> = {
  easy: { label: 'Простой', xp: 10, gold: 2, tone: 'mint' },
  medium: { label: 'Обычный', xp: 25, gold: 5, tone: 'amber' },
  hard: { label: 'Сложный', xp: 50, gold: 10, tone: 'coral' },
}

export const weekDays = [
  { value: 1, short: 'Пн' },
  { value: 2, short: 'Вт' },
  { value: 3, short: 'Ср' },
  { value: 4, short: 'Чт' },
  { value: 5, short: 'Пт' },
  { value: 6, short: 'Сб' },
  { value: 0, short: 'Вс' },
]

export function dateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dateLabel(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00`))
}

export function longDateLabel(value = dateKey()) {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${value}T12:00:00`))
}

export function levelProgress(totalXp: number, base = 100, growth = 35) {
  let level = 1
  let remaining = Math.max(0, totalXp)
  let needed = base
  while (remaining >= needed) {
    remaining -= needed
    level += 1
    needed = base + (level - 1) * growth
  }
  return {
    level,
    current: remaining,
    needed,
    percent: Math.min(100, Math.round((remaining / needed) * 100)),
  }
}

export function skillLevel(skill: Skill) {
  return levelProgress(skill.xp, 80, 30)
}

export function isQuestForDate(quest: Quest, value: string) {
  const date = new Date(`${value}T12:00:00`)
  if (quest.repeatDays.length > 0) return quest.repeatDays.includes(date.getDay())
  if (quest.dueDate) return quest.dueDate === value
  return true
}

export function isQuestComplete(quest: Quest, value: string) {
  return quest.repeatDays.length > 0 ? quest.completedDates.includes(value) : quest.completedDates.length > 0
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`
}

export function calculateStreak(activeDays: string[], today = dateKey()) {
  const unique = new Set(activeDays)
  let cursor = new Date(`${today}T12:00:00`)
  if (!unique.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (unique.has(dateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function branchColor(skill: Skill, skills: Skill[]) {
  let current = skill
  const visited = new Set<string>()
  while (current.parentId && !visited.has(current.id)) {
    visited.add(current.id)
    const parent = skills.find((item) => item.id === current.parentId)
    if (!parent) break
    current = parent
  }
  return current.color || skill.color
}

export function createInitialState(): AppState {
  const today = dateKey()
  const now = new Date().toISOString()
  return {
    version: 1,
    profile: {
      name: 'Игрок',
      avatar: '⚔️',
      totalXp: 0,
      gold: 0,
      activeDays: [],
    },
    skills: [
      { id: 'health', name: 'Здоровье', description: 'Сон, движение и забота о теле', icon: '❤', color: '#53d6a1', parentId: null, xp: 0, position: { x: -410, y: 150 }, requiredParentLevel: 1, createdAt: now },
      { id: 'growth', name: 'Развитие', description: 'Обучение и расширение кругозора', icon: '✦', color: '#9b8cff', parentId: null, xp: 0, position: { x: -80, y: 150 }, requiredParentLevel: 1, createdAt: now },
      { id: 'career', name: 'Карьера', description: 'Профессиональные навыки и проекты', icon: '◆', color: '#ffb45e', parentId: null, xp: 0, position: { x: 250, y: 150 }, requiredParentLevel: 1, createdAt: now },
      { id: 'sport', name: 'Спорт', description: 'Сила, выносливость и подвижность', icon: '⚡', color: '#53d6a1', parentId: 'health', xp: 0, position: { x: -500, y: 380 }, requiredParentLevel: 1, createdAt: now },
      { id: 'sleep', name: 'Сон', description: 'Стабильный и качественный отдых', icon: '☾', color: '#53d6a1', parentId: 'health', xp: 0, position: { x: -300, y: 380 }, requiredParentLevel: 1, createdAt: now },
      { id: 'reading', name: 'Чтение', description: 'Книги и осмысленное обучение', icon: '▤', color: '#9b8cff', parentId: 'growth', xp: 0, position: { x: -120, y: 380 }, requiredParentLevel: 1, createdAt: now },
      { id: 'english', name: 'Английский', description: 'Разговорная речь и словарный запас', icon: 'A', color: '#9b8cff', parentId: 'growth', xp: 0, position: { x: 80, y: 380 }, requiredParentLevel: 1, createdAt: now },
      { id: 'programming', name: 'Программирование', description: 'Создание приложений и систем', icon: '</>', color: '#ffb45e', parentId: 'career', xp: 0, position: { x: 290, y: 380 }, requiredParentLevel: 1, createdAt: now },
    ],
    quests: [
      { id: 'quest-project', title: 'Поработать над главным проектом', description: 'Сделать один конкретный шаг, который двигает проект вперёд.', difficulty: 'hard', skillId: 'programming', dueDate: today, scheduledTime: '10:00', durationMinutes: 90, repeatDays: [], isMain: true, completedDates: [], createdAt: now },
      { id: 'quest-reading', title: 'Прочитать 20 страниц', description: '', difficulty: 'medium', skillId: 'reading', dueDate: today, scheduledTime: null, durationMinutes: 30, repeatDays: [], isMain: false, completedDates: [], createdAt: now },
      { id: 'quest-walk', title: 'Прогулка или тренировка', description: '', difficulty: 'easy', skillId: 'sport', dueDate: today, scheduledTime: '18:30', durationMinutes: 30, repeatDays: [], isMain: false, completedDates: [], createdAt: now },
    ],
    rewards: [
      { id: 'reward-evening', title: 'Свободный вечер', description: 'Отдых без чувства вины', icon: '🌙', cost: 30, createdAt: now },
      { id: 'reward-film', title: 'Посмотреть фильм', description: 'Выбрать фильм из своего списка', icon: '🎬', cost: 20, createdAt: now },
      { id: 'reward-treat', title: 'Любимое угощение', description: '', icon: '☕', cost: 15, createdAt: now },
    ],
    history: [],
    preferences: { todayMode: 'list' },
  }
}
