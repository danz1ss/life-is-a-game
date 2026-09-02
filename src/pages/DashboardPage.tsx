import { CalendarDays, CheckCircle2, ChevronRight, CircleAlert, Clock3, Coins, Flame, List, Plus, Sparkles, Star, Target, Timeline, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { QuestCard } from '../components/QuestCard'
import { QuestModal } from '../components/QuestModal'
import { EmptyState, ProgressBar } from '../components/Ui'
import { activeGoalForSkill, calculateStreak, dateKey, difficultyConfig, formatDuration, isQuestComplete, isQuestForDate, isQuestOverdue, levelProgress, longDateLabel, skillLevel } from '../lib/game'
import { useStore } from '../lib/store'
import type { Quest, QuestDraft } from '../lib/types'

export function DashboardPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { state, addQuest, updateQuest, toggleQuest, setTodayMode } = useStore()
  const [questModal, setQuestModal] = useState<Quest | 'new' | null>(null)
  const today = dateKey()
  const todayQuests = useMemo(() => state.quests
    .filter((quest) => isQuestForDate(quest, today))
    .sort((a, b) => Number(b.isMain) - Number(a.isMain) || (a.scheduledTime ?? '99:99').localeCompare(b.scheduledTime ?? '99:99')), [state.quests, today])
  const mainQuest = todayQuests.find((quest) => quest.isMain) ?? null
  const profileLevel = levelProgress(state.profile.totalXp)
  const completed = todayQuests.filter((quest) => isQuestComplete(quest, today)).length
  const xpToday = state.history.filter((event) => event.type === 'quest' && event.date === today).reduce((sum, event) => sum + event.xp, 0)
  const topSkills = [...state.skills].sort((a, b) => b.xp - a.xp).slice(0, 4)
  const overdueCount = state.quests.filter((quest) => isQuestOverdue(quest, today)).length

  const saveQuest = (draft: QuestDraft) => {
    if (questModal === 'new') addQuest(draft)
    else if (questModal) updateQuest(questModal.id, draft)
    setQuestModal(null)
  }

  return (
    <div className="page dashboard-page">
      <header className="dashboard-header">
        <div>
          <span className="eyebrow">Сегодня · {longDateLabel()}</span>
          <h1>Ваше приключение продолжается</h1>
          <p>{completed === todayQuests.length && todayQuests.length > 0 ? 'Все сегодняшние квесты завершены. Отличная работа.' : `Выполнено ${completed} из ${todayQuests.length} · сегодня получено ${xpToday} XP`}</p>
        </div>
        <button className="button button--primary" type="button" onClick={() => setQuestModal('new')}><Plus size={18} /> Новый квест</button>
      </header>

      {overdueCount > 0 && <button className="dashboard-review" onClick={() => onNavigate('quests')}><CircleAlert size={17} /><span><strong>{overdueCount} {overdueCount === 1 ? 'квест требует' : 'квеста требуют'} решения</strong><small>Они не перенесены автоматически — разберите их в планировщике.</small></span><ChevronRight size={17} /></button>}

      <section className="dashboard-grid">
        <article className="panel main-quest-panel">
          <div className="panel-title"><span><Star size={16} fill="currentColor" /> Главный квест дня</span>{mainQuest && <button className="text-button" onClick={() => setQuestModal(mainQuest)}>Изменить</button>}</div>
          {mainQuest ? <MainQuest quest={mainQuest} onToggle={() => toggleQuest(mainQuest.id, today)} skillName={state.skills.find((skill) => skill.id === mainQuest.skillId)?.name} goalTitle={mainQuest.skillId ? activeGoalForSkill(state.goals, mainQuest.skillId)?.title : undefined} /> : (
            <EmptyState icon="✦" title="Выберите главный квест" text="Отметьте самую важную задачу дня — она будет всегда перед глазами." action={<button className="button button--secondary" onClick={() => onNavigate('quests')}>Выбрать из квестов</button>} />
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
          {todayQuests.length === 0 ? <EmptyState icon="☀" title="Свободный день" text="На сегодня ещё нет квестов." /> : state.preferences.todayMode === 'list' ? (
            <div className="quest-list">{todayQuests.map((quest) => <QuestCard key={quest.id} quest={quest} skill={state.skills.find((skill) => skill.id === quest.skillId)} goalTitle={quest.skillId ? activeGoalForSkill(state.goals, quest.skillId)?.title : undefined} date={today} onToggle={() => toggleQuest(quest.id, today)} onEdit={() => setQuestModal(quest)} compact />)}</div>
          ) : <DayTimeline quests={todayQuests} onToggle={(id) => toggleQuest(id, today)} />}
        </article>

        <article className="panel skills-summary-panel">
          <div className="panel-title"><span><Sparkles size={16} /> Мои навыки</span><button className="text-button" onClick={() => onNavigate('tree')}>Все навыки</button></div>
          <div className="skill-summary-list">
            {topSkills.map((skill) => {
              const progress = skillLevel(skill)
              const goal = activeGoalForSkill(state.goals, skill.id)
              const todayXp = state.history.filter((event) => event.type === 'quest' && event.date === today && event.skillId === skill.id).reduce((sum, event) => sum + event.xp, 0)
              return <button key={skill.id} className="skill-summary" onClick={() => onNavigate('tree')}>
                <span className="skill-summary__icon" style={{ color: skill.color, background: `${skill.color}18` }}>{skill.icon}</span>
                <span className="skill-summary__body"><span><strong>{skill.name}</strong><small>Ур. {progress.level}</small></span>{goal && <span className="skill-summary__goal"><Target size={9} /> {goal.title} · {goal.progress}%</span>}<ProgressBar value={progress.percent} color={skill.color} compact /></span>
                {todayXp > 0 && <em>+{todayXp}</em>}
              </button>
            })}
          </div>
          <button className="panel-link" onClick={() => onNavigate('tree')}>Исследовать дерево <ChevronRight size={17} /></button>
        </article>
      </section>

      {questModal && <QuestModal quest={questModal === 'new' ? null : questModal} skills={state.skills} onSave={saveQuest} onClose={() => setQuestModal(null)} />}
    </div>
  )
}

function MainQuest({ quest, skillName, goalTitle, onToggle }: { quest: Quest; skillName?: string; goalTitle?: string; onToggle: () => void }) {
  const reward = difficultyConfig[quest.difficulty]
  const complete = isQuestComplete(quest, dateKey())
  return (
    <div className={`main-quest ${complete ? 'is-complete' : ''}`}>
      <div className="main-quest__rune">{complete ? <CheckCircle2 size={28} /> : <Star size={27} />}</div>
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
      <button className={`button ${complete ? 'button--ghost' : 'button--success'}`} onClick={onToggle}>{complete ? 'Вернуть' : 'Выполнить'}</button>
    </div>
  )
}

function DayTimeline({ quests, onToggle }: { quests: Quest[]; onToggle: (id: string) => void }) {
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
          return <button key={quest.id} className={`timeline-event ${isQuestComplete(quest, dateKey()) ? 'is-complete' : ''}`} style={{ top, height, left: `${74 + (index % 2) * 8}px` }} onClick={() => onToggle(quest.id)}><strong>{quest.title}</strong><span>{quest.scheduledTime} · {formatDuration(quest.durationMinutes)}</span></button>
        })}
      </div>}
      {unscheduled.length > 0 && <div className="unscheduled"><span className="eyebrow">В любое время</span>{unscheduled.map((quest) => <button key={quest.id} className={isQuestComplete(quest, dateKey()) ? 'is-complete' : ''} onClick={() => onToggle(quest.id)}><i />{quest.title}<span>{formatDuration(quest.durationMinutes)}</span></button>)}</div>}
    </div>
  )
}
