import type { AppState, Difficulty, Quest, Skill, SkillGoal } from './types'
import { defaultSkillColors, migrateSkillColors } from './skillColors'
import { normalizeBackground } from './appearance'
import { assertValidState } from './stateValidation'

export const goalCompletionReward = { xp: 150, gold: 30 }

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

export function nextDateKey(value = dateKey()) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + 1)
  return dateKey(date)
}

export function longDateLabel(value = dateKey()) {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${value}T12:00:00`))
}

export function levelProgress(totalXp: number, base = 100, growth = 35) {
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(growth) || growth < 0) throw new RangeError('Некорректная шкала уровней')
  const xp = Number.isFinite(totalXp) ? Math.max(0, totalXp) : 0
  // Sum of the arithmetic progression for n completed levels.
  const threshold = (n: number) => n * base + growth * n * (n - 1) / 2
  const linear = base - growth / 2
  let completed = growth === 0 ? Math.floor(xp / base)
    : xp === 0 ? 0 : Math.floor(2 * xp / (linear + Math.sqrt(linear * linear + 2 * growth * xp)))
  // Correct rounding at an exact level boundary without walking every prior level.
  if (completed > 0 && threshold(completed) > xp) completed--
  else if (threshold(completed + 1) <= xp) completed++
  const level = completed + 1
  const remaining = xp - threshold(completed)
  const needed = base + completed * growth
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
  if (quest.archivedAt) return false
  if (quest.skippedDates.includes(value)) return true
  const date = new Date(`${value}T12:00:00`)
  if (quest.repeatDays.length > 0) return (!quest.dueDate || quest.dueDate <= value) && quest.repeatDays.includes(date.getDay())
  if (quest.dueDate) return quest.dueDate === value
  return false
}

export function isQuestComplete(quest: Quest, value: string) {
  return quest.repeatDays.length > 0 ? quest.completedDates.includes(value) : quest.completedDates.length > 0
}

export function isQuestSkipped(quest: Quest, value: string) {
  return quest.skippedDates.includes(value)
}

export function isQuestOverdue(quest: Quest, today = dateKey()) {
  return !quest.archivedAt
    && quest.repeatDays.length === 0
    && quest.completedDates.length === 0
    && Boolean(quest.dueDate && quest.dueDate < today)
}

export function activeGoalForSkill(goals: SkillGoal[], skillId: string) {
  return goals.find((goal) => goal.skillId === skillId && goal.status !== 'completed') ?? null
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

export function createInitialState(): AppState {
  const today = dateKey()
  const now = new Date().toISOString()
  return {
    version: 5,
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
    ].map((skill) => ({ ...skill, color: defaultSkillColors[skill.id] ?? skill.color })),
    quests: [
      { id: 'quest-project', title: 'Поработать над главным проектом', description: 'Сделать один конкретный шаг, который двигает проект вперёд.', difficulty: 'hard', skillId: 'programming', dueDate: today, scheduledTime: '10:00', durationMinutes: 90, repeatDays: [], isMain: true, order: 0, completedDates: [], skippedDates: [], archivedAt: null, createdAt: now },
      { id: 'quest-reading', title: 'Прочитать 20 страниц', description: '', difficulty: 'medium', skillId: 'reading', dueDate: today, scheduledTime: null, durationMinutes: 30, repeatDays: [], isMain: false, order: 1, completedDates: [], skippedDates: [], archivedAt: null, createdAt: now },
      { id: 'quest-walk', title: 'Прогулка или тренировка', description: '', difficulty: 'easy', skillId: 'sport', dueDate: today, scheduledTime: '18:30', durationMinutes: 30, repeatDays: [], isMain: false, order: 2, completedDates: [], skippedDates: [], archivedAt: null, createdAt: now },
    ],
    goals: [],
    rewards: [
      { id: 'reward-evening', title: 'Свободный вечер', description: 'Отдых без чувства вины', icon: '🌙', cost: 30, createdAt: now },
      { id: 'reward-film', title: 'Посмотреть фильм', description: 'Выбрать фильм из своего списка', icon: '🎬', cost: 20, createdAt: now },
      { id: 'reward-treat', title: 'Любимое угощение', description: '', icon: '☕', cost: 15, createdAt: now },
    ],
    history: [],
    dayPlans: { [today]: { mainQuestId: 'quest-project', questOrder: [] } },
    levelRewards: { highestLevel: 1, acknowledgedLevel: 1, personal: [] },
    preferences: { todayMode: 'list', background: 'minimalism' },
  }
}

type StoredState = Partial<Omit<AppState, 'version' | 'quests' | 'preferences'>> & {
  version?: number
  quests?: Array<Partial<Quest>>
  preferences?: Partial<AppState['preferences']>
}

export function migrateState(value: unknown): AppState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Некорректный файл сохранения')
  const stored = value as StoredState
  if (!Array.isArray(stored.skills) || !Array.isArray(stored.quests)) throw new Error('В сохранении отсутствуют навыки или квесты')
  if (stored.version !== undefined && (!Number.isInteger(stored.version) || stored.version < 1 || stored.version > 5)) {
    throw new Error('Неподдерживаемая версия сохранения')
  }
  if (stored.version === 5 && (!stored.dayPlans || !stored.levelRewards)) throw new Error('В сохранении отсутствуют планы дней или награды за уровни')

  const migrated = {
    version: 5,
    profile: stored.profile,
    skills: stored.skills,
    quests: stored.quests.map((quest, index) => {
      if (!quest || typeof quest !== 'object') throw new Error('Некорректный квест в сохранении')
      return {
        ...quest,
        order: quest.order === undefined ? index : quest.order,
        skippedDates: quest.skippedDates === undefined ? [] : quest.skippedDates,
        archivedAt: quest.archivedAt ?? null,
      }
    }),
    goals: stored.goals ?? [],
    rewards: stored.rewards,
    history: stored.history,
    dayPlans: stored.dayPlans ?? Object.fromEntries(stored.quests.filter((quest) => quest?.isMain && !quest.archivedAt)
      .map((quest) => [quest.repeatDays?.length ? dateKey() : quest.dueDate ?? dateKey(), { mainQuestId: quest.id, questOrder: [] }])),
    levelRewards: stored.levelRewards ?? {
      highestLevel: levelProgress(stored.profile?.totalXp ?? 0).level,
      acknowledgedLevel: levelProgress(stored.profile?.totalXp ?? 0).level,
      personal: [],
    },
    preferences: {
      ...stored.preferences,
      todayMode: stored.preferences?.todayMode === 'timeline' ? 'timeline' : 'list',
      background: normalizeBackground(stored.preferences?.background),
    },
  }
  assertValidState(migrated)
  if ((stored.version ?? 1) < 4) migrated.skills = migrateSkillColors(migrated.skills)
  return migrated
}
