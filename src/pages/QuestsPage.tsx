import { Archive, CalendarClock, CheckCircle2, ChevronRight, CircleAlert, Filter, Inbox, Plus, Repeat2, RotateCcw, Search } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { QuestCard } from '../components/QuestCard'
import { QuestModal } from '../components/QuestModal'
import { EmptyState, PageHeader } from '../components/Ui'
import { activeGoalForSkill, dateKey, dateLabel, isQuestForDate, isQuestOverdue, isQuestSkipped, weekDays } from '../lib/game'
import { useStore } from '../lib/store'
import type { Quest, QuestDraft } from '../lib/types'

type QuestView = 'plan' | 'recurring' | 'archive'

export function QuestsPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { state, addQuest, updateQuest, deleteQuest, archiveQuest, restoreQuest, toggleQuest, reorderQuest, setMainQuest } = useStore()
  const [modal, setModal] = useState<Quest | 'new' | null>(null)
  const [view, setView] = useState<QuestView>('plan')
  const [skillFilter, setSkillFilter] = useState('')
  const [query, setQuery] = useState('')
  const today = dateKey()

  const filtered = useMemo(() => state.quests.filter((quest) => {
    if (query && !`${quest.title} ${quest.description}`.toLowerCase().includes(query.toLowerCase())) return false
    if (skillFilter && quest.skillId !== skillFilter) return false
    return true
  }).sort((a, b) => a.order - b.order), [query, skillFilter, state.quests])

  const todayQuests = state.quests.filter((quest) => isQuestForDate(quest, today))
  const todayCompleted = todayQuests.filter((quest) => quest.completedDates.includes(today) || (quest.repeatDays.length === 0 && quest.completedDates.length > 0)).length
  const todaySkipped = todayQuests.filter((quest) => isQuestSkipped(quest, today)).length
  const overdue = filtered.filter((quest) => isQuestOverdue(quest, today))
  const upcoming = filtered.filter((quest) => !quest.archivedAt && quest.repeatDays.length === 0 && quest.completedDates.length === 0 && Boolean(quest.dueDate && quest.dueDate > today))
  const undated = filtered.filter((quest) => !quest.archivedAt && quest.repeatDays.length === 0 && quest.completedDates.length === 0 && !quest.dueDate)
  const recurring = filtered.filter((quest) => !quest.archivedAt && quest.repeatDays.length > 0)
  const archived = filtered.filter((quest) => Boolean(quest.archivedAt) || (quest.repeatDays.length === 0 && quest.completedDates.length > 0))

  const save = (draft: QuestDraft) => {
    if (modal === 'new') addQuest(draft)
    else if (modal) updateQuest(modal.id, draft)
    setModal(null)
  }

  const questCard = (quest: Quest, badge?: { label: string; tone: 'danger' | 'muted' | 'success' | 'violet' }, footer?: ReactNode, allowToggle = true) => <QuestCard
    key={quest.id}
    quest={quest}
    skill={state.skills.find((skill) => skill.id === quest.skillId)}
    goalTitle={quest.skillId ? activeGoalForSkill(state.goals, quest.skillId)?.title : undefined}
    date={quest.repeatDays.length > 0 ? today : quest.dueDate ?? quest.completedDates[0] ?? today}
    onToggle={allowToggle ? () => toggleQuest(quest.id, today) : undefined}
    onEdit={() => setModal(quest)}
    onMakeMain={!quest.archivedAt && quest.completedDates.length === 0 ? () => setMainQuest(quest.id) : undefined}
    onReorder={reorderQuest}
    onDelete={() => deleteQuest(quest.id)}
    badge={badge}
    footer={footer}
  />

  return <div className="page">
    <PageHeader eyebrow="Центр планирования" title="Квесты" description="Здесь вы решаете, что делать дальше. Экран «Сегодня» остаётся чистым местом для выполнения выбранных задач." actions={<button className="button button--primary" onClick={() => setModal('new')}><Plus size={18} /> Новый квест</button>} />

    <button className="today-quest-summary panel" onClick={() => onNavigate('today')}>
      <span className="today-quest-summary__icon"><CheckCircle2 size={20} /></span>
      <span><strong>Сегодня</strong><small>{todayQuests.length === 0 ? 'На сегодня ничего не запланировано' : `Выполнено ${todayCompleted} · не выполнено ${todaySkipped} · всего ${todayQuests.length}`}</small></span>
      <em>{todayQuests.length}</em><ChevronRight size={18} />
    </button>

    {overdue.length > 0 && <div className="review-banner"><CircleAlert size={19} /><div><strong>Есть незавершённые квесты</strong><span>{overdue.length} требуют решения — перенесите, перепланируйте или спокойно откажитесь.</span></div><b>{overdue.length}</b></div>}

    <div className="toolbar quest-planner-toolbar">
      <div className="segmented segmented--large">
        <button className={view === 'plan' ? 'is-active' : ''} onClick={() => setView('plan')}>План</button>
        <button className={view === 'recurring' ? 'is-active' : ''} onClick={() => setView('recurring')}>Повторяющиеся <em>{recurring.length}</em></button>
        <button className={view === 'archive' ? 'is-active' : ''} onClick={() => setView('archive')}>Архив <em>{archived.length}</em></button>
      </div>
      <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти квест" /></label>
      <label className="select-field"><Filter size={15} /><select value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)}><option value="">Все навыки</option>{state.skills.map((skill) => <option value={skill.id} key={skill.id}>{skill.name}</option>)}</select></label>
    </div>

    {view === 'plan' && <div className="quest-sections">
      {overdue.length > 0 && <QuestSection icon={<CircleAlert size={17} />} title="Требуют решения" subtitle="Невыполненные одноразовые квесты не переносятся автоматически" tone="danger">
        {overdue.map((quest) => questCard(quest, { label: `План: ${dateLabel(quest.dueDate!)}`, tone: 'danger' }, <div className="overdue-actions">
          <button className="mini-action mini-action--primary" onClick={() => updateQuest(quest.id, { dueDate: today })}>На сегодня</button>
          <button className="mini-action" onClick={() => setModal(quest)}>Другая дата</button>
          <button className="mini-action" onClick={() => toggleQuest(quest.id, today)}>Выполнить сейчас</button>
          <button className="mini-action mini-action--muted" onClick={() => archiveQuest(quest.id)}>Отказаться</button>
        </div>))}
      </QuestSection>}
      <QuestSection icon={<CalendarClock size={17} />} title="Предстоящие" subtitle="То, что уже назначено на будущую дату">
        {upcoming.length > 0 ? upcoming.map((quest) => questCard(quest, { label: dateLabel(quest.dueDate!), tone: 'violet' })) : <SectionEmpty text="Будущих квестов пока нет." />}
      </QuestSection>
      <QuestSection icon={<Inbox size={17} />} title="Без даты" subtitle="Идеи и задачи, которые ещё не попали в расписание">
        {undated.length > 0 ? undated.map((quest) => questCard(quest, { label: 'Не запланирован', tone: 'muted' })) : <SectionEmpty text="Все квесты разобраны и запланированы." />}
      </QuestSection>
    </div>}

    {view === 'recurring' && <section className="quests-board panel">
      <div className="quests-board__head"><span><Repeat2 size={15} /> Регулярные квесты</span><small>Пропущенные повторы не копятся и не переносятся на следующий день</small></div>
      {recurring.length === 0 ? <EmptyState icon="↻" title="Нет повторяющихся квестов" text="Добавьте квест и выберите дни недели." /> : <div className="quest-list quest-list--roomy">{recurring.map((quest) => {
        const days = weekDays.filter((day) => quest.repeatDays.includes(day.value)).map((day) => day.short).join(', ')
        return questCard(quest, { label: days, tone: 'violet' }, undefined, isQuestForDate(quest, today))
      })}</div>}
    </section>}

    {view === 'archive' && <section className="quests-board panel">
      <div className="quests-board__head"><span><Archive size={15} /> Архив</span><small>Завершённые и отменённые одноразовые квесты</small></div>
      {archived.length === 0 ? <EmptyState icon="◇" title="Архив пуст" text="Здесь появятся завершённые и отменённые квесты." /> : <div className="quest-list quest-list--roomy">{archived.map((quest) => questCard(quest, quest.completedDates.length > 0 ? { label: 'Выполнен', tone: 'success' } : { label: 'Отменён', tone: 'muted' }, quest.archivedAt && quest.completedDates.length === 0 ? <div className="overdue-actions"><button className="mini-action" onClick={() => restoreQuest(quest.id)}><RotateCcw size={12} /> Вернуть на сегодня</button></div> : undefined, quest.completedDates.length > 0))}</div>}
    </section>}

    {modal && <QuestModal quest={modal === 'new' ? null : modal} skills={state.skills} onSave={save} onDelete={modal !== 'new' ? () => { deleteQuest(modal.id); setModal(null) } : undefined} onClose={() => setModal(null)} />}
  </div>
}

function QuestSection({ icon, title, subtitle, tone, children }: { icon: ReactNode; title: string; subtitle: string; tone?: 'danger'; children: ReactNode }) {
  return <section className={`quest-section panel ${tone ? `quest-section--${tone}` : ''}`}><header><span className="quest-section__icon">{icon}</span><div><h2>{title}</h2><p>{subtitle}</p></div></header><div className="quest-list quest-list--roomy">{children}</div></section>
}

function SectionEmpty({ text }: { text: string }) {
  return <div className="section-empty">{text}</div>
}
