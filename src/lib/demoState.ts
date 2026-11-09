import { createInitialState, dateKey, nextDateKey } from './game'
import type { Quest } from './types'

export function createDemoState() {
  const state = createInitialState()
  const today = dateKey()
  const tasks: Array<Pick<Quest, 'title' | 'description' | 'scheduledTime' | 'durationMinutes' | 'skillId' | 'difficulty'>> = [
    { title: 'Прочитать главу книги', description: 'Записать одну мысль, к которой хочется вернуться.', scheduledTime: '09:00', durationMinutes: 30, skillId: 'reading', difficulty: 'easy' },
    { title: 'Собрать прототип приложения', description: 'Подготовить первый экран и проверить основные действия.', scheduledTime: '10:10', durationMinutes: 300, skillId: 'programming', difficulty: 'hard' },
    { title: 'Разобрать заметки', description: '', scheduledTime: '15:20', durationMinutes: 30, skillId: null, difficulty: 'easy' },
    { title: 'Английский разговорный клуб', description: '', scheduledTime: '16:15', durationMinutes: 60, skillId: 'english', difficulty: 'medium' },
    { title: 'Тренировка', description: '', scheduledTime: '19:00', durationMinutes: 90, skillId: 'sport', difficulty: 'medium' },
    { title: 'Набросать план на неделю', description: '', scheduledTime: null, durationMinutes: 20, skillId: null, difficulty: 'easy' },
  ]
  const base = state.quests[0]
  state.quests = tasks.map((task, order) => ({
    ...base, ...task, order, id: `demo-${order}`, isMain: false,
  }))
  state.quests.push({ ...state.quests[2], id: 'demo-tomorrow', title: 'Проверить план на завтра', dueDate: nextDateKey(today), scheduledTime: '09:30' })
  state.dayPlans[today] = { mainQuestId: 'demo-1', questOrder: [] }
  return state
}
