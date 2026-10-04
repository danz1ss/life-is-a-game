import { dateKey } from './game'
import type { HistoryEvent, Quest } from './types'

export interface ArchiveGroup {
  date: string
  quests: Quest[]
}

export function groupArchivedQuests(quests: Quest[], history: HistoryEvent[]): ArchiveGroup[] {
  const entries = quests.flatMap((quest) => {
    const completedDate = quest.repeatDays.length === 0 ? quest.completedDates[0] : undefined
    const date = completedDate ?? (quest.archivedAt ? dateKey(new Date(quest.archivedAt)) : null)
    if (!date) return []
    const completion = completedDate ? history.find((event) => event.type === 'quest' && event.questId === quest.id && event.date === completedDate) : undefined
    return [{ quest, date, time: completedDate ? completion?.createdAt ?? quest.createdAt : quest.archivedAt ?? quest.createdAt }]
  }).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time) || a.quest.id.localeCompare(b.quest.id))

  const groups: ArchiveGroup[] = []
  for (const entry of entries) {
    if (groups.at(-1)?.date !== entry.date) groups.push({ date: entry.date, quests: [] })
    groups.at(-1)!.quests.push(entry.quest)
  }
  return groups
}
