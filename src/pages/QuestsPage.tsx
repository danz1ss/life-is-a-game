import { Archive, CalendarClock, CheckCircle2, ChevronRight, CircleAlert, Filter, Plus, Repeat2, RotateCcw, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { QuestCard } from '../components/QuestCard'
import { QuestModal } from '../components/QuestModal'
import { EmptyState, Modal, PageHeader } from '../components/Ui'
import { activeGoalForSkill, dateKey, dateLabel, formatDuration, isQuestForDate, isQuestOverdue, isQuestSkipped, nextDateKey, weekDays } from '../lib/game'
import { questsForDay, upcomingQuests } from '../lib/planning'
import { groupArchivedQuests } from '../lib/questArchive'
import { useStore } from '../lib/store'
import type { Quest, QuestDraft } from '../lib/types'

type QuestView = 'plan' | 'recurring' | 'archive'
const archiveDateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

export function archiveBadgeForQuest(quest: Quest): { label: string; tone: 'success' | 'muted' } {
  if (quest.repeatDays.length > 0) return { label: 'Архивирован', tone: 'muted' }
  return quest.completedDates.length > 0
    ? { label: 'Выполнен', tone: 'success' }
    : { label: 'Отменён', tone: 'muted' }
}

export function QuestsPage({ onNavigate, focusTomorrow = 0 }: { onNavigate: (page: string) => void; focusTomorrow?: number }) {
  const { state, today, addQuest, updateQuest, rescheduleQuest, deleteQuest, archiveQuest, restoreQuest, toggleQuest, reorderQuest, setMainQuest } = useStore()
  const [modal, setModal] = useState<Quest | 'new' | null>(null)
  const [view, setView] = useState<QuestView>('plan')
  const [skillFilter, setSkillFilter] = useState('')
  const [query, setQuery] = useState('')
  const tomorrow = nextDateKey(today)
  const [editDate, setEditDate] = useState(today)
  const [completionQuest, setCompletionQuest] = useState<Quest | null>(null)
  const [completionDate, setCompletionDate] = useState(today)
  const tomorrowSection = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!focusTomorrow) return
    setView('plan')
    const timer = window.setTimeout(() => tomorrowSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    return () => window.clearTimeout(timer)
  }, [focusTomorrow])

  const openNew = (date: string) => { setEditDate(date); setModal('new') }
  const openEdit = (quest: Quest, date: string) => {
    setEditDate(date)
    setModal({ ...quest, isMain: state.dayPlans[date]?.mainQuestId === quest.id })
  }

  const filtered = useMemo(() => state.quests.filter((quest) => {
    if (query && !`${quest.title} ${quest.description}`.toLowerCase().includes(query.toLowerCase())) return false
    if (skillFilter && quest.skillId !== skillFilter) return false
    return true
  }).sort((a, b) => a.order - b.order), [query, skillFilter, state.quests])

  const todayQuests = state.quests.filter((quest) => isQuestForDate(quest, today))
  const todayCompleted = todayQuests.filter((quest) => quest.completedDates.includes(today) || (quest.repeatDays.length === 0 && quest.completedDates.length > 0)).length
  const todaySkipped = todayQuests.filter((quest) => isQuestSkipped(quest, today)).length
  const overdue = filtered.filter((quest) => isQuestOverdue(quest, today, Boolean(quest.dueDate && state.dayPlans[quest.dueDate]?.closed)))
  const upcoming = upcomingQuests(filtered, tomorrow)
  const tomorrowAll = useMemo(() => questsForDay(state, tomorrow), [state, tomorrow])
  const filteredIds = new Set(filtered.map((quest) => quest.id))
  const tomorrowQuests = tomorrowAll.filter((quest) => filteredIds.has(quest.id))
  const recurring = filtered.filter((quest) => !quest.archivedAt && quest.repeatDays.length > 0)
  const archived = filtered.filter((quest) => Boolean(quest.archivedAt) || (quest.repeatDays.length === 0 && quest.completedDates.length > 0))
  const archiveGroups = groupArchivedQuests(archived, state.history)

  const moveOverdue = (quest: Quest, when: 'today' | 'tomorrow') => {
    const currentDay = dateKey()
    rescheduleQuest(quest.id, when === 'today' ? currentDay : nextDateKey(currentDay))
  }

  const markCompleted = (quest: Quest, onDate: string) => {
    if (!onDate || onDate > dateKey()) return
    toggleQuest(quest.id, onDate)
    setCompletionQuest(null)
  }

  const save = (draft: QuestDraft) => {
    if (modal === 'new') addQuest(draft, editDate)
    else if (modal) updateQuest(modal.id, draft, editDate)
    setModal(null)
  }

  const questCard = (quest: Quest, badge?: { label: string; tone: 'danger' | 'muted' | 'success' | 'violet' }, footer?: ReactNode, allowToggle = true) => <QuestCard
    key={quest.id}
    quest={{ ...quest, isMain: state.dayPlans[quest.repeatDays.length ? today : quest.dueDate ?? today]?.mainQuestId === quest.id }}
    skill={state.skills.find((skill) => skill.id === quest.skillId)}
    goalTitle={quest.skillId ? activeGoalForSkill(state.goals, quest.skillId)?.title : undefined}
    date={quest.repeatDays.length > 0 ? today : quest.dueDate ?? quest.completedDates[0] ?? today}
    onToggle={allowToggle ? () => toggleQuest(quest.id, quest.repeatDays.length ? today : quest.completedDates[0] ?? today) : undefined}
    onEdit={() => openEdit(quest, quest.repeatDays.length ? today : quest.dueDate ?? today)}
    onMakeMain={!quest.archivedAt && quest.completedDates.length === 0 && (quest.repeatDays.length ? isQuestForDate(quest, today) : Boolean(quest.dueDate && quest.dueDate >= today)) ? () => setMainQuest(quest.id, quest.repeatDays.length ? today : quest.dueDate ?? today) : undefined}
    onDelete={() => deleteQuest(quest.id)}
    badge={badge}
    footer={footer}
    showResultActions={allowToggle}
  />

  return <div className="page">
    <PageHeader eyebrow="Центр планирования" title="Квесты" description="Подготовьте завтра и сохраните идеи на будущее. Сегодняшние задачи — на главной странице." actions={<button className="button button--primary" onClick={() => openNew(tomorrow)}><Plus size={18} /> Новый квест</button>} />

    <button className="today-quest-summary panel" onClick={() => onNavigate('today')}>
      <span className="today-quest-summary__icon"><CheckCircle2 size={20} /></span>
      <span><strong>Сегодня</strong><small>{todayQuests.length === 0 ? 'На сегодня ничего не запланировано' : `Выполнено ${todayCompleted} · не выполнено ${todaySkipped} · всего ${todayQuests.length}`}</small></span>
      <em>{todayQuests.length}</em><ChevronRight size={18} />
    </button>

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
      {overdue.length > 0 && <QuestSection icon={<CircleAlert size={17} />} title={`Требуют решения · ${overdue.length}`} subtitle="«Уже выполнено» зачтёт квест за запланированный день. Можно выбрать и другую дату выполнения." tone="danger">
        {overdue.map((quest) => questCard(quest, { label: `План: ${dateLabel(quest.dueDate!)}`, tone: 'danger' }, <div className="overdue-actions">
          <button className="mini-action mini-action--primary" onClick={() => markCompleted(quest, quest.dueDate!)}>Уже выполнено</button>
          <button className="mini-action" onClick={() => { setCompletionQuest(quest); setCompletionDate(quest.dueDate!) }}>Выбрать день выполнения</button>
          <button className="mini-action" onClick={() => moveOverdue(quest, 'today')}>{state.dayPlans[today]?.closed ? 'Открыть день · на сегодня' : 'На сегодня'}</button>
          <button className="mini-action" onClick={() => moveOverdue(quest, 'tomorrow')}>На завтра</button>
          <button className="mini-action" onClick={() => openEdit(quest, quest.dueDate ?? today)}>Перепланировать</button>
          <button className="mini-action mini-action--muted" onClick={() => archiveQuest(quest.id)}>Отказаться</button>
        </div>, false))}
      </QuestSection>}
      <div ref={tomorrowSection} id="tomorrow-plan" className="tomorrow-plan">
        <QuestSection icon={<CalendarClock size={17} />} title={`Завтра · ${dateLabel(tomorrow)}`} subtitle={`${tomorrowAll.length} задач · ${formatDuration(tomorrowAll.reduce((sum, quest) => sum + quest.durationMinutes, 0))} · план сохраняется автоматически`}
          actions={<button className="button button--primary" onClick={() => openNew(tomorrow)}><Plus size={16} /> Добавить на завтра</button>}>
          {tomorrowQuests.length ? tomorrowQuests.map((quest) => <QuestCard key={quest.id} quest={quest} date={tomorrow}
            skill={state.skills.find((skill) => skill.id === quest.skillId)}
            goalTitle={quest.skillId ? activeGoalForSkill(state.goals, quest.skillId)?.title : undefined}
            onEdit={() => openEdit(quest, tomorrow)} onDelete={() => deleteQuest(quest.id)}
            onMakeMain={() => setMainQuest(quest.id, tomorrow)}
            onReorder={(source, target, placement) => reorderQuest(source, target, placement, tomorrow)}
            badge={quest.repeatDays.length ? { label: 'По расписанию', tone: 'violet' } : undefined}
            compact showResultActions={false}
          />) : <SectionEmpty text={query || skillFilter ? 'Нет задач, подходящих под фильтры.' : 'Завтра пока свободно. Добавьте задачу или перенесите её из предстоящих.'} />}
        </QuestSection>
      </div>
      <QuestSection icon={<CalendarClock size={17} />} title="Предстоящие" subtitle="С послезавтра и дальше — по датам, затем идеи без даты">
        {upcoming.length > 0 ? upcoming.map((quest) => <QuestCard key={quest.id} quest={quest}
          skill={state.skills.find((skill) => skill.id === quest.skillId)}
          goalTitle={quest.skillId ? activeGoalForSkill(state.goals, quest.skillId)?.title : undefined}
          date={quest.dueDate ?? today}
          onEdit={() => openEdit(quest, quest.dueDate ?? today)} onDelete={() => deleteQuest(quest.id)}
          badge={{ label: quest.dueDate ? dateLabel(quest.dueDate) : 'Без даты', tone: quest.dueDate ? 'violet' : 'muted' }}
          compact showResultActions={false}
        />) : <SectionEmpty text="Будущих задач и идей пока нет." />}
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
      <div className="quests-board__head"><span><Archive size={15} /> Архив</span><small>Завершённые и архивированные квесты</small></div>
      {archiveGroups.length === 0 ? <EmptyState icon="◇" title="Архив пуст" text="Здесь появятся завершённые и отменённые квесты." /> : <div className="archive-groups">{archiveGroups.map((group) => <section className="archive-group" key={group.date}>
        <h2>{archiveDateFormat.format(new Date(`${group.date}T12:00:00`))}</h2>
        <div className="quest-list quest-list--roomy">{group.quests.map((quest) => questCard(quest, archiveBadgeForQuest(quest), quest.archivedAt && quest.completedDates.length === 0 ? <div className="overdue-actions"><button className="mini-action" onClick={() => restoreQuest(quest.id)}><RotateCcw size={12} /> Вернуть на сегодня</button></div> : undefined, quest.repeatDays.length === 0 && quest.completedDates.length > 0))}</div>
      </section>)}</div>}
    </section>}

    {modal && <QuestModal quest={modal === 'new' ? null : modal} initialDate={editDate} skills={state.skills} onSave={save} onDelete={modal !== 'new' ? () => { deleteQuest(modal.id); setModal(null) } : undefined} onClose={() => setModal(null)} />}
    {completionQuest && <Modal title="Когда квест был выполнен?" subtitle={completionQuest.title} onClose={() => setCompletionQuest(null)}>
      <form className="completion-date-form" onSubmit={(event) => { event.preventDefault(); markCompleted(completionQuest, completionDate) }}>
        <label className="field"><span>Дата выполнения</span><input type="date" required max={dateKey()} value={completionDate} onChange={(event) => setCompletionDate(event.target.value)} /></label>
        <p>Опыт, монеты и запись в истории будут отнесены к выбранному дню.</p>
        <div className="form-actions"><button className="button button--ghost" type="button" onClick={() => setCompletionQuest(null)}>Отмена</button><button className="button button--primary" type="submit">Зачесть выполнение</button></div>
      </form>
    </Modal>}
  </div>
}

function QuestSection({ icon, title, subtitle, tone, children, actions }: { icon: ReactNode; title: string; subtitle: string; tone?: 'danger'; children: ReactNode; actions?: ReactNode }) {
  return <section className={`quest-section panel ${tone ? `quest-section--${tone}` : ''}`}><header><span className="quest-section__icon">{icon}</span><div><h2>{title}</h2><p>{subtitle}</p></div>{actions && <div className="quest-section-actions">{actions}</div>}</header><div className="quest-list quest-list--roomy">{children}</div></section>
}

function SectionEmpty({ text }: { text: string }) {
  return <div className="section-empty">{text}</div>
}
