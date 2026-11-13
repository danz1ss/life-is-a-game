import { dateKey } from './game'
import type { HistoryEvent, Quest } from './types'

export interface ArchiveGroup {
  date: string
  quests: Quest[]
}

export function groupArchivedQuests(quests: Quest[], history: HistoryEvent[], today?: string): ArchiveGroup[] {
  const firstDay = today ? new Date(`${today}T12:00:00`) : null
  firstDay?.setDate(firstDay.getDate() - 29)
  const cutoff = firstDay ? dateKey(firstDay) : null
  const completions = new Map<string, string>()
  for (const event of history) {
    if (event.type !== 'quest' || (today && cutoff && (event.date < cutoff || event.date > today))) continue
    const key = `${event.questId}:${event.date}`
    if (!completions.has(key)) completions.set(key, event.createdAt)
  }
  const entries = quests.flatMap((quest) => {
    const completedDate = quest.repeatDays.length === 0 ? quest.completedDates[0] : undefined
    const date = completedDate ?? (quest.archivedAt ? dateKey(new Date(quest.archivedAt)) : null)
    if (!date || (today && cutoff && (date < cutoff || date > today))) return []
    return [{ quest, date, time: completedDate ? completions.get(`${quest.id}:${completedDate}`) ?? quest.createdAt : quest.archivedAt ?? quest.createdAt }]
  }).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time) || a.quest.id.localeCompare(b.quest.id))

  const groups: ArchiveGroup[] = []
  for (const entry of entries) {
    if (groups.at(-1)?.date !== entry.date) groups.push({ date: entry.date, quests: [] })
    groups.at(-1)!.quests.push(entry.quest)
  }
  return groups
}
