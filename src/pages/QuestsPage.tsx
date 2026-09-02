import { Filter, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { QuestCard } from '../components/QuestCard'
import { QuestModal } from '../components/QuestModal'
import { EmptyState, PageHeader } from '../components/Ui'
import { dateKey, isQuestForDate } from '../lib/game'
import { useStore } from '../lib/store'
import type { Quest, QuestDraft } from '../lib/types'

type QuestFilter = 'today' | 'all' | 'completed'

export function QuestsPage() {
  const { state, addQuest, updateQuest, deleteQuest, toggleQuest, setMainQuest } = useStore()
  const [modal, setModal] = useState<Quest | 'new' | null>(null)
  const [filter, setFilter] = useState<QuestFilter>('today')
  const [skillFilter, setSkillFilter] = useState('')
  const [query, setQuery] = useState('')
  const today = dateKey()

  const quests = useMemo(() => state.quests.filter((quest) => {
    if (query && !`${quest.title} ${quest.description}`.toLowerCase().includes(query.toLowerCase())) return false
    if (skillFilter && quest.skillId !== skillFilter) return false
    if (filter === 'today') return isQuestForDate(quest, today)
    if (filter === 'completed') return quest.completedDates.length > 0
    return true
  }).sort((a, b) => Number(b.isMain) - Number(a.isMain) || (a.dueDate ?? '').localeCompare(b.dueDate ?? '')), [filter, query, skillFilter, state.quests, today])

  const save = (draft: QuestDraft) => {
    if (modal === 'new') addQuest(draft)
    else if (modal) updateQuest(modal.id, draft)
    setModal(null)
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Журнал приключений" title="Квесты" description="Планируйте реальные действия и превращайте завершённую работу в развитие персонажа." actions={<button className="button button--primary" onClick={() => setModal('new')}><Plus size={18} /> Новый квест</button>} />
      <div className="toolbar">
        <div className="segmented segmented--large">
          <button className={filter === 'today' ? 'is-active' : ''} onClick={() => setFilter('today')}>Сегодня</button>
          <button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>Все квесты</button>
          <button className={filter === 'completed' ? 'is-active' : ''} onClick={() => setFilter('completed')}>Завершённые</button>
        </div>
        <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти квест" /></label>
        <label className="select-field"><Filter size={15} /><select value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)}><option value="">Все навыки</option>{state.skills.map((skill) => <option value={skill.id} key={skill.id}>{skill.name}</option>)}</select></label>
      </div>
      <section className="quests-board panel">
        <div className="quests-board__head"><span>{quests.length} {quests.length === 1 ? 'квест' : 'квестов'}</span><small>Нажмите на круг, чтобы завершить</small></div>
        {quests.length === 0 ? <EmptyState icon="◇" title="Квестов не найдено" text="Измените фильтры или создайте новую миссию." action={<button className="button button--secondary" onClick={() => setModal('new')}>Создать квест</button>} /> : (
          <div className="quest-list quest-list--roomy">{quests.map((quest) => {
            const cardDate = filter === 'completed' ? (quest.completedDates.at(-1) ?? today) : today
            return <QuestCard key={quest.id} quest={quest} skill={state.skills.find((skill) => skill.id === quest.skillId)} date={cardDate} onToggle={() => toggleQuest(quest.id, cardDate)} onEdit={() => setModal(quest)} onMakeMain={() => setMainQuest(quest.id)} onDelete={() => { if (window.confirm(`Удалить квест «${quest.title}»? Заработанный ранее опыт сохранится.`)) deleteQuest(quest.id) }} />
          })}</div>
        )}
      </section>
      {modal && <QuestModal quest={modal === 'new' ? null : modal} skills={state.skills} onSave={save} onClose={() => setModal(null)} />}
    </div>
  )
}
