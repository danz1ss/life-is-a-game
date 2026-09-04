import { CalendarDays, CheckCircle2, ChevronRight, CircleAlert, CircleX, Clock3, Coins, Flame, List, Plus, Sparkles, Star, Target, Timeline, X, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { QuestCard } from '../components/QuestCard'
import { QuestModal } from '../components/QuestModal'
import { EmptyState, Modal, ProgressBar } from '../components/Ui'
import { activeGoalForSkill, calculateStreak, dateKey, dateLabel, difficultyConfig, formatDuration, isQuestComplete, isQuestForDate, isQuestOverdue, isQuestSkipped, levelProgress, longDateLabel, nextDateKey, skillLevel } from '../lib/game'
import { useStore } from '../lib/store'
import type { Quest, QuestDraft, Skill } from '../lib/types'

export function DashboardPage({ onNavigate, onOpenSkill }: { onNavigate: (page: string) => void; onOpenSkill: (skillId: string) => void }) {
  const { state, addQuest, updateQuest, toggleQuest, skipQuest, closeDay, reorderQuest, setMainQuest, setTodayMode } = useStore()
  const [questModal, setQuestModal] = useState<Quest | 'new' | null>(null)
  const [mainQuestPickerOpen, setMainQuestPickerOpen] = useState(false)
  const [newQuestAsMain, setNewQuestAsMain] = useState(false)
  const today = dateKey()
  const todayQuests = useMemo(() => state.quests
    .filter((quest) => isQuestForDate(quest, today))
    .sort((a, b) => a.order - b.order), [state.quests, today])
  const mainQuest = todayQuests.find((quest) => quest.isMain) ?? null
  const profileLevel = levelProgress(state.profile.totalXp)
  const completed = todayQuests.filter((quest) => isQuestComplete(quest, today)).length
  const skipped = todayQuests.filter((quest) => isQuestSkipped(quest, today)).length
  const pendingQuests = todayQuests.filter((quest) => !isQuestComplete(quest, today) && !isQuestSkipped(quest, today))
  const pendingOneTime = pendingQuests.filter((quest) => quest.repeatDays.length === 0).length
  const pendingRecurring = pendingQuests.length - pendingOneTime
  const xpToday = state.history.filter((event) => event.type === 'quest' && event.date === today).reduce((sum, event) => sum + event.xp, 0)
  const topSkills = [...state.skills].sort((a, b) => b.xp - a.xp).slice(0, 4)
  const activeGoals = state.goals.filter((goal) => goal.status !== 'completed')
  const overdueCount = state.quests.filter((quest) => isQuestOverdue(quest, today)).length

  const openNewQuest = (asMain = false) => {
    setNewQuestAsMain(asMain)
    setQuestModal('new')
  }

  const saveQuest = (draft: QuestDraft) => {
    if (questModal === 'new') addQuest(draft)
    else if (questModal) updateQuest(questModal.id, draft)
    setQuestModal(null)
    setNewQuestAsMain(false)
  }

  return (
    <div className="page dashboard-page">
      <header className="dashboard-header">
        <div>
          <span className="eyebrow">Сегодня · {longDateLabel()}</span>
          <h1>Ваше приключение продолжается</h1>
          <p>{pendingQuests.length === 0 && todayQuests.length > 0 ? `День разобран: выполнено ${completed}, не выполнено ${skipped} · получено ${xpToday} XP` : `Выполнено ${completed} · не выполнено ${skipped} · осталось ${pendingQuests.length} · получено ${xpToday} XP`}</p>
        </div>
        <button className="button button--primary" type="button" onClick={() => openNewQuest()}><Plus size={18} /> Новый квест</button>
      </header>

      {overdueCount > 0 && <button className="dashboard-review" onClick={() => onNavigate('quests')}><CircleAlert size={17} /><span><strong>{overdueCount} {overdueCount === 1 ? 'квест требует' : 'квеста требуют'} решения</strong><small>Они не перенесены автоматически — разберите их в планировщике.</small></span><ChevronRight size={17} /></button>}

      <section className="dashboard-grid">
        <article className="panel main-quest-panel">
          <div className="panel-title"><span><Star size={16} fill="currentColor" /> Главный квест дня</span>{mainQuest && <span className="main-quest-panel__actions"><button className="text-button" onClick={() => setMainQuestPickerOpen(true)}>Сменить</button><button className="text-button text-button--muted" onClick={() => setQuestModal(mainQuest)}>Изменить</button></span>}</div>
          {mainQuest ? <MainQuest quest={mainQuest} onToggle={() => toggleQuest(mainQuest.id, today)} skillName={state.skills.find((skill) => skill.id === mainQuest.skillId)?.name} goalTitle={mainQuest.skillId ? activeGoalForSkill(state.goals, mainQuest.skillId)?.title : undefined} /> : (
            <EmptyState icon="✦" title="Выберите главный квест" text="Отметьте самую важную задачу дня — она будет всегда перед глазами." action={todayQuests.length > 0 ? <button className="button button--secondary" onClick={() => setMainQuestPickerOpen(true)}>Выбрать из сегодняшних</button> : <button className="button button--secondary" onClick={() => openNewQuest(true)}><Plus size={16} /> Создать на сегодня</button>} />
          )}
        </article>

        <article className="panel hero-panel">
          <div className="hero-card__top">
            <div className="avatar-orb">{state.profile.avatar}</div>
            <div><span className="eyebrow">Персонаж</span><h2>{state.profile.name}</h2></div>
            <span className="level-medallion">{profileLevel.level}</span>
          </div>
          <div className="level-line"><span>Уровень {profileLevel.level}</span><span>{profileLevel.current} / {profileLevel.needed} XP</span></div>
          <ProgressBar value={profileLevel.percent} color="linear-gradient(90deg, #7c6cf2, #b18cff)" />
          <div className="hero-stats">
            <div><Coins size={18} /><strong>{state.profile.gold}</strong><span>золота</span></div>
            <div><Flame size={18} /><strong>{calculateStreak(state.profile.activeDays)}</strong><span>дней подряд</span></div>
            <div><Zap size={18} /><strong>{state.profile.totalXp}</strong><span>всего XP</span></div>
          </div>
          <button className="panel-link" onClick={() => onNavigate('progress')}>Открыть прогресс <ChevronRight size={17} /></button>
        </article>

        <article className="panel today-panel">
          <div className="panel-title">
            <span><CalendarDays size={16} /> Задания на сегодня</span>
            <div className="segmented">
              <button className={state.preferences.todayMode === 'list' ? 'is-active' : ''} onClick={() => setTodayMode('list')}><List size={15} /> Список</button>
              <button className={state.preferences.todayMode === 'timeline' ? 'is-active' : ''} onClick={() => setTodayMode('timeline')}><Timeline size={15} /> Расписание</button>
            </div>
          </div>
          {pendingQuests.length > 0 ? <div className="day-review-bar">
            <div><strong>{pendingQuests.length} без отметки</strong><small>{pendingOneTime > 0 ? `${pendingOneTime} ${pendingOneTime === 1 ? 'задача перенесётся' : 'задачи перенесутся'} на ${nextDateKey(today).split('-').reverse().slice(0, 2).join('.')}` : 'Одноразовых задач для переноса нет'}{pendingRecurring > 0 ? ` · ${pendingRecurring} ${pendingRecurring === 1 ? 'повтор отметится' : 'повтора отметятся'} как пропущенные` : ''}</small></div>
            <button className="button button--secondary" type="button" onClick={() => closeDay(today)}>Закрыть день</button>
          </div> : todayQuests.length > 0 && <div className="day-review-bar day-review-bar--done"><CheckCircle2 size={18} /><div><strong>Все квесты разобраны</strong><small>Можно спокойно завершать день.</small></div></div>}
          {todayQuests.length === 0 ? <EmptyState icon="☀" title="Свободный день" text="На сегодня ещё нет квестов." /> : state.preferences.todayMode === 'list' ? (
            <div className="quest-list">{todayQuests.map((quest) => <QuestCard key={quest.id} quest={quest} skill={state.skills.find((skill) => skill.id === quest.skillId)} goalTitle={quest.skillId ? activeGoalForSkill(state.goals, quest.skillId)?.title : undefined} date={today} onToggle={() => toggleQuest(quest.id, today)} onSkip={() => skipQuest(quest.id, today)} onEdit={() => setQuestModal(quest)} onMakeMain={!isQuestComplete(quest, today) && !isQuestSkipped(quest, today) ? () => setMainQuest(quest.id) : undefined} onReorder={reorderQuest} compact />)}</div>
          ) : <DayTimeline quests={todayQuests} date={today} onToggle={(id) => toggleQuest(id, today)} onSkip={(id) => skipQuest(id, today)} />}
        </article>

        <div className="dashboard-side-stack">
          <article className="panel skills-summary-panel">
            <div className="panel-title"><span><Sparkles size={16} /> Мои навыки</span><button className="text-button" onClick={() => onNavigate('tree')}>Все навыки</button></div>
            <div className="skill-summary-list">
              {topSkills.map((skill) => {
                const progress = skillLevel(skill)
                const todayXp = state.history.filter((event) => event.type === 'quest' && event.date === today && event.skillId === skill.id).reduce((sum, event) => sum + event.xp, 0)
                return <button key={skill.id} className="skill-summary" onClick={() => onOpenSkill(skill.id)}>
                  <span className="skill-summary__icon" style={{ color: skill.color, background: `${skill.color}18` }}>{skill.icon}</span>
                  <span className="skill-summary__body"><span><strong>{skill.name}</strong><small>Ур. {progress.level}</small></span><ProgressBar value={progress.percent} color={skill.color} compact /></span>
                  {todayXp > 0 && <em>+{todayXp}</em>}
                </button>
              })}
            </div>
            <button className="panel-link" onClick={() => onNavigate('tree')}>Исследовать дерево <ChevronRight size={17} /></button>
          </article>

          <article className="panel goals-summary-panel">
            <div className="panel-title"><span><Target size={16} /> Главные цели</span><button className="text-button" onClick={() => onNavigate('tree')}>Все цели</button></div>
            {activeGoals.length > 0 ? <div className="goal-summary-list">
              {activeGoals.map((goal) => {
                const skill = state.skills.find((item) => item.id === goal.skillId)
                if (!skill) return null
                return <button className={`goal-summary ${goal.status === 'paused' ? 'is-paused' : ''}`} key={goal.id} onClick={() => onOpenSkill(skill.id)}>
                  <span className="goal-summary__icon" style={{ color: skill.color, background: `${skill.color}18` }}><Target size={17} /></span>
                  <span className="goal-summary__body">
                    <span className="goal-summary__top"><strong>{goal.title}</strong><em>{goal.progress}%</em></span>
                    <span className="goal-summary__meta"><span style={{ color: skill.color }}>{skill.icon} {skill.name}</span>{goal.status === 'paused' ? <span>На паузе</span> : goal.targetDate && <span>до {dateLabel(goal.targetDate)}</span>}</span>
                    <ProgressBar value={goal.progress} color={skill.color} compact />
                  </span>
                  <ChevronRight size={16} />
                </button>
              })}
            </div> : <div className="goals-summary-empty"><Target size={20} /><strong>Главных целей пока нет</strong><span>Добавьте цель к навыку — она появится здесь.</span><button className="text-button" onClick={() => onNavigate('tree')}>Перейти к дереву</button></div>}
          </article>
        </div>
      </section>

      {mainQuestPickerOpen && <MainQuestPicker quests={todayQuests} skills={state.skills} selectedId={mainQuest?.id ?? null} date={today} onSelect={(id) => { setMainQuest(id); setMainQuestPickerOpen(false) }} onCreate={() => { setMainQuestPickerOpen(false); openNewQuest(true) }} onClose={() => setMainQuestPickerOpen(false)} />}
      {questModal && <QuestModal quest={questModal === 'new' ? null : questModal} skills={state.skills} initialIsMain={questModal === 'new' && newQuestAsMain} onSave={saveQuest} onClose={() => { setQuestModal(null); setNewQuestAsMain(false) }} />}
    </div>
  )
}

function MainQuestPicker({ quests, skills, selectedId, date, onSelect, onCreate, onClose }: {
  quests: Quest[]
  skills: Skill[]
  selectedId: string | null
  date: string
  onSelect: (id: string) => void
  onCreate: () => void
  onClose: () => void
}) {
  const availableQuests = quests.filter((quest) => !isQuestComplete(quest, date) && !isQuestSkipped(quest, date))

  return <Modal title="Главный квест дня" subtitle="Выберите самую важную задачу из сегодняшнего списка." onClose={onClose}>
    {availableQuests.length > 0 ? <div className="main-quest-picker-list">
      {availableQuests.map((quest) => {
        const reward = difficultyConfig[quest.difficulty]
        const skill = skills.find((item) => item.id === quest.skillId)
        const selected = quest.id === selectedId
        return <button className={`main-quest-option ${selected ? 'is-selected' : ''}`} type="button" key={quest.id} onClick={() => onSelect(quest.id)}>
          <span className="main-quest-option__star"><Star size={18} fill={selected ? 'currentColor' : 'none'} /></span>
          <span className="main-quest-option__body">
            <strong>{quest.title}</strong>
            <small>{quest.scheduledTime ? `${quest.scheduledTime} · ` : ''}{formatDuration(quest.durationMinutes)}{skill ? ` · ${skill.name}` : ''} · +{reward.xp} XP</small>
          </span>
          {selected ? <span className="main-quest-option__selected"><CheckCircle2 size={16} /> Выбран</span> : <ChevronRight size={17} />}
        </button>
      })}
    </div> : <div className="main-quest-picker-empty"><CheckCircle2 size={24} /><strong>Все сегодняшние квесты уже разобраны</strong><span>Можно создать новую задачу и сразу назначить её главной.</span></div>}
    <footer className="main-quest-picker-actions"><button className="button button--ghost" type="button" onClick={onClose}>Отмена</button><button className="button button--primary" type="button" onClick={onCreate}><Plus size={16} /> Создать новый</button></footer>
  </Modal>
}

function MainQuest({ quest, skillName, goalTitle, onToggle }: { quest: Quest; skillName?: string; goalTitle?: string; onToggle: () => void }) {
  const reward = difficultyConfig[quest.difficulty]
  const today = dateKey()
  const complete = isQuestComplete(quest, today)
  const skipped = isQuestSkipped(quest, today)
  return (
    <div className={`main-quest ${complete ? 'is-complete' : ''} ${skipped ? 'is-skipped' : ''}`}>
      <div className="main-quest__rune">{complete ? <CheckCircle2 size={28} /> : skipped ? <CircleX size={28} /> : <Star size={27} />}</div>
      <div className="main-quest__content">
        <span className={`difficulty-label difficulty-label--${reward.tone}`}>{reward.label}</span>
        <h2>{quest.title}</h2>
        {quest.description && <p>{quest.description}</p>}
        <div className="main-quest__meta">
          {quest.scheduledTime && <span><Clock3 size={14} /> {quest.scheduledTime}</span>}
          <span><Clock3 size={14} /> {formatDuration(quest.durationMinutes)}</span>
          {skillName && <span><Sparkles size={14} /> {skillName}</span>}
          {goalTitle && <span><Target size={14} /> {goalTitle}</span>}
          <span><Zap size={14} /> +{reward.xp} XP</span>
          <span><Coins size={14} /> +{reward.gold}</span>
        </div>
      </div>
      <button className={`button ${complete ? 'button--ghost' : 'button--success'}`} onClick={onToggle}>{complete ? 'Вернуть' : skipped ? 'Всё-таки выполнено' : 'Выполнить'}</button>
    </div>
  )
}

function DayTimeline({ quests, date, onToggle, onSkip }: { quests: Quest[]; date: string; onToggle: (id: string) => void; onSkip: (id: string) => void }) {
  const scheduled = quests.filter((quest) => quest.scheduledTime)
  const unscheduled = quests.filter((quest) => !quest.scheduledTime)
  const startHour = 7
  const endHour = 23
  const hourHeight = 58
  return (
    <div className="timeline-layout">
      {scheduled.length > 0 && <div className="day-timeline" style={{ height: (endHour - startHour) * hourHeight }}>
        {Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index).map((hour) => <div className="timeline-hour" key={hour} style={{ top: (hour - startHour) * hourHeight }}><span>{String(hour).padStart(2, '0')}:00</span><i /></div>)}
        {scheduled.map((quest, index) => {
          const [hours, minutes] = quest.scheduledTime!.split(':').map(Number)
          const top = ((hours - startHour) + minutes / 60) * hourHeight
          const height = Math.max(42, quest.durationMinutes / 60 * hourHeight)
          const complete = isQuestComplete(quest, date)
          const skipped = isQuestSkipped(quest, date)
          return <div key={quest.id} className={`timeline-event ${complete ? 'is-complete' : ''} ${skipped ? 'is-skipped' : ''}`} style={{ top, height, left: `${74 + (index % 2) * 8}px` }}><button className="timeline-event__content" type="button" onClick={() => onToggle(quest.id)}><strong>{quest.title}</strong><span>{quest.scheduledTime} · {formatDuration(quest.durationMinutes)}</span></button><button className="timeline-event__skip" type="button" onClick={() => onSkip(quest.id)} title={quest.repeatDays.length > 0 ? 'Не выполнено сегодня' : 'Не выполнено — перенести на завтра'}><X size={13} /></button></div>
        })}
      </div>}
      {unscheduled.length > 0 && <div className="unscheduled"><span className="eyebrow">В любое время</span>{unscheduled.map((quest) => {
        const complete = isQuestComplete(quest, date)
        const skipped = isQuestSkipped(quest, date)
        return <div className={`unscheduled-event ${complete ? 'is-complete' : ''} ${skipped ? 'is-skipped' : ''}`} key={quest.id}><button className="unscheduled-event__content" type="button" onClick={() => onToggle(quest.id)}><i />{quest.title}<span>{formatDuration(quest.durationMinutes)}</span></button><button className="unscheduled-event__skip" type="button" onClick={() => onSkip(quest.id)} title={quest.repeatDays.length > 0 ? 'Не выполнено сегодня' : 'Не выполнено — перенести на завтра'}><X size={13} /></button></div>
      })}</div>}
    </div>
  )
}
