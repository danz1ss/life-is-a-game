import { ArrowRight, CalendarDays, Check, ChevronRight, CircleAlert, Coins, Compass, Flag, Minus, Pencil, Plus, Undo2, X } from 'lucide-react'
import { useState } from 'react'
import { CharacterStage } from '../components/CharacterStage'
import { QuestCard } from '../components/QuestCard'
import { QuestModal } from '../components/QuestModal'
import { Modal, ProgressBar } from '../components/Ui'
import { DaySchedule } from '../components/dashboard/DaySchedule'
import { QuickTime, minutesOf, timeOf } from '../components/dashboard/QuickTime'
import { ReorderableQuestList } from '../components/dashboard/ReorderableQuestList'
import { SkillsPanel } from '../components/dashboard/SkillsPanel'
import { WeeklyChecklist } from '../components/dashboard/WeeklyChecklist'
import { difficultyConfig, formatDuration, isQuestComplete, isQuestOverdue, isQuestSkipped, levelProgress, longDateLabel } from '../lib/game'
import { characterMilestonesForGender, characterOptions, normalizeCharacter, petStageForLevel } from '../lib/character'
import { questsForDay } from '../lib/planning'
import { useStore } from '../lib/store'
import { shiftWeek, weekMonday, weeklyPlanError } from '../lib/weeklyPlanning'
import type { Quest, QuestDraft, WeeklyPlan } from '../lib/types'
import './dashboard.css'

type Dialog = 'choose' | 'review' | 'weekly-review' | 'weekly-plan' | null
const emptyWeek: WeeklyPlan = { tasks: [], reviewedAt: null }
const weekRange = (monday: string) => {
  const end = new Date(`${monday}T12:00:00`)
  end.setDate(end.getDate() + 6)
  const format = (date: Date) => date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  return `${format(new Date(`${monday}T12:00:00`))} — ${format(end)}`
}

export function DashboardPage({ onNavigate, onOpenSkill }: { onNavigate: (page: string) => void; onOpenSkill: (skillId: string) => void }) {
  const store = useStore()
  const { state, today } = store
  const [questModal, setQuestModal] = useState<Quest | 'new' | null>(null)
  const [newQuestAsMain, setNewQuestAsMain] = useState(false)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const [reviewWeek, setReviewWeek] = useState<string | null>(null)
  const [planTarget, setPlanTarget] = useState<string | null>(null)
  const [weeklyDraft, setWeeklyDraft] = useState('')
  const [weeklyError, setWeeklyError] = useState('')
  const quests = questsForDay(state, today)
  const main = quests.find(q => q.isMain)
  const completed = quests.filter(q => isQuestComplete(q, today))
  const skipped = quests.filter(q => isQuestSkipped(q, today))
  const pending = quests.filter(q => !isQuestComplete(q, today) && !isQuestSkipped(q, today))
  const earnedXp = state.history.filter(event => event.type === 'quest' && event.date === today).reduce((sum, event) => sum + event.xp, 0)
  const level = levelProgress(state.profile.totalXp)
  const highest = state.levelRewards.highestLevel
  const appearance = normalizeCharacter(state.profile.character)
  const nextUnlock = characterMilestonesForGender(appearance.gender).find(item => item.level > highest)
  const nextGift = state.levelRewards.personal.filter(item => !item.claimedAt && item.level > highest).sort((a, b) => a.level - b.level)[0]
  const readyGifts = state.levelRewards.personal.filter(item => !item.claimedAt && item.level <= highest)
  const petName = state.profile.petName?.trim() || 'Искра'
  const petLabel = characterOptions.pet.find(item => item.id === appearance.pet)?.label ?? 'Лисёнок'
  const parentIds = new Set(state.skills.map(skill => skill.parentId).filter(Boolean))
  const leafSkills = state.skills.filter(skill => !parentIds.has(skill.id))
  const mainSkill = state.skills.find(skill => skill.id === main?.skillId)
  const overdueCount = state.quests.filter(q => isQuestOverdue(q, today, Boolean(q.dueDate && state.dayPlans[q.dueDate]?.closed))).length
  const monday = weekMonday(today)
  const nextMonday = shiftWeek(monday)
  // A prepared week becomes the current week automatically when Monday arrives.
  const shownWeek = selectedWeek === nextMonday ? nextMonday : monday
  const weekly = state.weeklyPlans[shownWeek] ?? emptyWeek
  const reviewMonday = reviewWeek && reviewWeek <= monday ? reviewWeek : monday
  const reviewedPlan = state.weeklyPlans[reviewMonday] ?? emptyWeek
  const historyWeeks = [...new Set([monday, ...Object.keys(state.weeklyPlans).filter(week => week <= monday)])].sort().reverse()
  const timeline = state.preferences.todayMode === 'timeline'

  const openNewQuest = (asMain = false) => { setNewQuestAsMain(asMain); setQuestModal('new') }
  const saveQuest = (draft: QuestDraft) => {
    if (questModal === 'new') store.addQuest(draft, today)
    else if (questModal) store.updateQuest(questModal.id, draft, today)
    setQuestModal(null)
  }
  const schedule = (quest: Quest, time: string | null) => store.updateQuest(quest.id, { scheduledTime: time }, today)
  const suggestedTime = (quest: Quest) => {
    const previous = quests.slice(0, quests.findIndex(q => q.id === quest.id)).filter(q => q.scheduledTime).at(-1)
    if (!previous?.scheduledTime) return null
    const end = minutesOf(previous.scheduledTime) + previous.durationMinutes
    return end < 1440 ? timeOf(end) : null
  }
  const openWeeklyPlan = (week: string) => { setPlanTarget(week); setWeeklyDraft((state.weeklyPlans[week]?.tasks ?? []).map(task => task.title).join('\n')); setWeeklyError(''); setDialog('weekly-plan') }
  const saveWeek = () => {
    const titles = weeklyDraft.split('\n').map(title => title.trim()).filter(Boolean)
    const error = weeklyPlanError(titles)
    if (error) { setWeeklyError(error); return }
    const target = planTarget ?? nextMonday
    store.planWeek(target, titles)
    if (target === nextMonday) store.reviewWeek(monday)
    setSelectedWeek(target)
    setDialog(null)
  }
  const openWeeklyReview = () => { setReviewWeek(monday); setDialog('weekly-review') }
  const renderQuest = (quest: Quest) => {
    const skill = state.skills.find(item => item.id === quest.skillId)
    const start = quest.scheduledTime ? minutesOf(quest.scheduledTime) : null
    const overlaps = start !== null && quests.some(q => q.id !== quest.id && q.scheduledTime && minutesOf(q.scheduledTime) < start + quest.durationMinutes && minutesOf(q.scheduledTime) + q.durationMinutes > start)
    return <QuestCard quest={quest} date={today} compact skill={skill} showScheduledTime={false} onToggle={() => store.toggleQuest(quest.id, today)} onSkip={() => store.skipQuest(quest.id, today)} onEdit={() => setQuestModal(quest)} onDelete={() => store.deleteQuest(quest.id)} onMakeMain={() => store.setMainQuest(quest.id, today)} footer={<><QuickTime quest={quest} suggestedTime={suggestedTime(quest)} onChange={time => schedule(quest, time)} />{overlaps ? <p className="g-time-conflict"><CircleAlert size={14} aria-hidden="true" />Время пересекается с другой задачей</p> : null}</>} />
  }
  const button = (label: string, action: () => void, primary = false) => <button type="button" className={`button button--${primary ? 'primary' : 'secondary'}`} onClick={action}>{label}</button>
  const dialogTitle = dialog === 'choose' ? 'Главный квест дня' : dialog === 'review' ? 'Ревью дня' : dialog === 'weekly-review' ? 'Ревью недели' : 'План недели'

  return <>
    <div className="page dashboard-page g-dashboard">
      <div className="g-composition">
        <div className="g-action-column">
          <header className="g-header"><div><h1>Сегодня</h1><p>{longDateLabel(today)}</p></div><div className="g-header-actions"><button type="button" className="button button--ghost" onClick={() => onNavigate('tomorrow')}><CalendarDays size={16} aria-hidden="true" />Завтра</button><button type="button" className="button button--secondary button--lg" onClick={() => openNewQuest()}><Plus size={16} aria-hidden="true" />Новый квест</button></div></header>
          <div className="g-daily"><span><Check size={16} aria-hidden="true" /><strong>{completed.length} из {quests.length}</strong> выполнено</span><span className="g-xp">+{earnedXp} XP сегодня</span></div>
          <div className="g-compact-progress"><strong>{state.profile.name} · уровень {level.level}</strong><span><Coins size={14} aria-hidden="true" />{state.profile.gold} монет</span></div>
          {overdueCount > 0 ? <button type="button" className="g-unresolved button button--tertiary" onClick={() => onNavigate('quests')}><CircleAlert size={15} aria-hidden="true" />{overdueCount} просроченных квестов — решить в плане</button> : null}
          <div className="g-priorities">
            <section className={`g-focus ${main && isQuestComplete(main, today) ? 'is-complete' : ''}`} aria-labelledby="focus-heading"><div className="g-section-line"><h2 id="focus-heading"><Flag size={18} aria-hidden="true" />Главный квест дня</h2><div className="g-focus-actions"><button type="button" className="button button--tertiary" onClick={() => setDialog('choose')}>Сменить</button>{main ? <button type="button" className="button button--tertiary g-focus-edit" aria-label="Изменить главный квест дня" onClick={() => setQuestModal(main)}><Pencil size={15} aria-hidden="true" /></button> : null}</div></div>{main ? <><h3 id="focus-title">{main.title}</h3><div className="g-focus-meta">{mainSkill ? <span>{mainSkill.name}</span> : null}<span>{formatDuration(main.durationMinutes)}</span><span>{difficultyConfig[main.difficulty].label}</span></div><div className="g-focus-bottom"><div className="g-award"><span className="g-xp">+{difficultyConfig[main.difficulty].xp} XP</span><span><Coins size={15} aria-hidden="true" />{difficultyConfig[main.difficulty].gold} монет</span></div></div>{isQuestComplete(main, today) ? <div className="g-done-note"><Check size={14} aria-hidden="true" />Выполнено в плане дня</div> : isQuestSkipped(main, today) ? <div className="g-done-note g-not-done"><X size={14} aria-hidden="true" />Не выполнено в плане дня</div> : null}</> : <><h3 id="focus-title">Один важный шаг</h3><p>Выберите задачу, которой сегодня уделите главное внимание.</p><button type="button" className="button button--tertiary" onClick={() => openNewQuest(true)}><Plus size={15} aria-hidden="true" />Создать главный квест</button></>}</section>
            <WeeklyChecklist key={shownWeek} plan={weekly} isNext={shownWeek === nextMonday} nextAvailable={Boolean(state.weeklyPlans[nextMonday])} onChangeWeek={next => setSelectedWeek(next ? nextMonday : monday)} onToggle={id => store.toggleWeeklyTask(shownWeek, id)} onSave={(id, title) => store.saveWeeklyTask(shownWeek, title, id ?? undefined)} onDelete={id => store.deleteWeeklyTask(shownWeek, id)} onReview={openWeeklyReview} onPlan={() => openWeeklyPlan(shownWeek)} />
            {store.deletedWeeklyTask ? <div className="g-weekly-undo" role="status"><span>Удалено: {store.deletedWeeklyTask.task.title}</span><button type="button" className="button button--tertiary" onClick={store.undoDeleteWeeklyTask}><Undo2 size={14} aria-hidden="true" />Восстановить</button><button type="button" className="icon-button" aria-label="Закрыть уведомление об удалении недельной задачи" onClick={store.dismissDeletedWeeklyTasks}><X size={15} aria-hidden="true" /></button></div> : null}
          </div>
          <div className="g-day-board"><section className="g-tasks" aria-labelledby="tasks-title"><div className="g-tasks-header"><h2 id="tasks-title">План дня <span>{quests.length}</span></h2><div className="g-view-switch" role="group" aria-label="Вид плана дня"><button type="button" aria-pressed={!timeline} onClick={() => store.setTodayMode('list')}>Список</button><button type="button" aria-pressed={timeline} onClick={() => store.setTodayMode('timeline')}>Расписание</button></div></div>{quests.length ? timeline ? <DaySchedule key={today} quests={quests} onDate={today} onSchedule={schedule} renderSelected={q => <li className={`g-quest ${q.isMain ? 'is-main' : ''}`}>{renderQuest(q)}</li>} /> : <ReorderableQuestList key={today} quests={quests} renderCard={renderQuest} onMove={(source, target, placement) => store.reorderQuest(source, target, placement, today)} /> : <div className="g-empty"><h3>День начинается с одного шага</h3><p>Добавьте первый квест и выберите время, когда вам удобно.</p>{button('Создать квест', () => openNewQuest(), true)}</div>}</section>
          <section className="g-review" aria-labelledby="review-heading"><div><h2 id="review-heading">Вечернее ревью</h2><p>{state.dayPlans[today]?.closed ? 'День закрыт · отметки можно исправить' : 'Отметьте сделанное и решите, что оставить на завтра.'}</p></div><button type="button" className="button button--tertiary" onClick={() => setDialog('review')}>Подвести итог <ChevronRight size={16} aria-hidden="true" /></button></section>
          </div>
        </div>
        <aside className="g-growth-column" aria-label="Герой и навыки">
          <section className="g-hero g-journey" aria-label="Герой и следующий уровень">
            <section className="g-character">
              <div className="g-character-heading">
                <div><h2>{state.profile.name}</h2><span>Ваш герой</span></div>
                <div className="g-character-stats">
                  <span className="g-level"><span>Уровень</span><strong>{level.level}</strong></span>
                  <button type="button" className="g-wallet" aria-label={`Баланс: ${state.profile.gold} монет. Открыть награды`} onClick={() => onNavigate('progress')}><span className="g-wallet-label">Монеты</span><span className="g-wallet-value"><Coins size={16} aria-hidden="true" /><strong>{state.profile.gold}</strong></span></button>
                </div>
              </div>
              <div className="g-character-body">
                <div className="g-stage"><CharacterStage appearance={appearance} level={highest} /></div>
                <div className="g-character-details">
                  <div className="g-companion" aria-label={`Питомец ${petName}, ${petLabel}. Стадия роста: ${petStageForLevel(highest).label}`}>
                    <span className="g-companion-name">{petName} · {petLabel.toLocaleLowerCase('ru-RU')}</span>
                    <span className="g-companion-stage">Стадия питомца: <strong>{petStageForLevel(highest).label}</strong></span>
                  </div>
                  <div className="g-xp-heading"><strong>Опыт героя</strong><span>{level.current} / {level.needed} XP</span></div>
                  <ProgressBar value={level.percent} color="var(--rpg-xp)" label="Опыт до следующего уровня" />
                  <p className="g-level-distance">{level.needed - level.current} XP до уровня {level.level + 1}</p>
                  {highest > level.level ? <p className="g-retained">Открыто до уровня {highest}. Награды сохранены.</p> : null}
                  <button type="button" className="button button--tertiary g-character-link" onClick={() => onNavigate('progress')}>Путь развития <ArrowRight size={15} aria-hidden="true" /></button>
                </div>
              </div>
            </section>
            <section className="g-next">
              <div className="g-section-line"><span><Compass size={17} aria-hidden="true" />Ближайшая веха</span><button type="button" className="button button--tertiary" aria-label={`Посмотреть награды, ближайшая веха — уровень ${nextUnlock?.level ?? highest + 1}`} onClick={() => onNavigate('progress')}>Ур. {nextUnlock?.level ?? highest + 1}<ChevronRight size={15} aria-hidden="true" /></button></div>
              <h3>{nextUnlock?.level === 5 && nextUnlock.kind === 'pet' ? `${petName} станет Искателем` : nextUnlock?.title ?? 'Путь продолжается'}</h3>
              {nextGift ? <p className="g-next-personal-gift">{nextGift.title}{nextGift.level !== highest + 1 ? ` · ур. ${nextGift.level}` : ''}</p> : null}
            </section>
            {readyGifts.map(gift => <div className="g-ready" key={gift.id}><Check size={17} aria-hidden="true" /><span>Доступен подарок: {gift.title}</span><button type="button" className="button button--ghost" onClick={() => store.claimPersonalLevelReward(gift.id)}>Получить</button></div>)}
          </section>
          <SkillsPanel skills={leafSkills} onSelect={skill => onOpenSkill(skill.id)} onOpenTree={() => onNavigate('tree')} />
        </aside>
      </div>
    </div>
    {questModal && <QuestModal quest={questModal === 'new' ? null : questModal} skills={state.skills} initialIsMain={newQuestAsMain} initialDate={today} onSave={saveQuest} onClose={() => setQuestModal(null)} onDelete={questModal === 'new' ? undefined : () => { store.deleteQuest(questModal.id); setQuestModal(null) }} />}
    {dialog ? <Modal title={dialogTitle} onClose={() => setDialog(null)} wide={dialog === 'weekly-plan'}><div className="g-dialog-content">
      {dialog === 'choose' ? <><p>Выберите один квест, которому сегодня уделите главное внимание.</p>{pending.map(q => <button type="button" className="g-choice" key={q.id} onClick={() => { store.setMainQuest(q.id, today); setDialog(null) }}><span>{q.title}</span>{q.isMain ? <Check size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}</button>)}<div className="g-dialog-actions">{button('Создать главный квест', () => { setDialog(null); openNewQuest(true) }, true)}</div></> : null}
      {dialog === 'review' ? <><p><strong>{completed.length} выполнено</strong> · {skipped.length} не выполнено · {pending.length} без отметки · +{earnedXp} XP</p><p>Закрытие дня отметит незавершённые повторения как «Не выполнено». Разовые задачи останутся для вашего решения. Автоматического переноса и штрафов нет.</p><ul>{pending.map(q => <li key={q.id}>{q.title}</li>)}</ul><div className="g-dialog-actions">{button('Продолжить день', () => setDialog(null))}{button('Закрыть день', () => { store.closeDay(today); setDialog(null) }, true)}{button('Закрыть и открыть план', () => { store.closeDay(today); onNavigate(overdueCount || quests.some(q => !q.repeatDays.length && !isQuestComplete(q, today)) ? 'quests' : 'tomorrow') })}</div></> : null}
      {dialog === 'weekly-review' ? <>{historyWeeks.length > 1 ? <label className="g-week-history">Неделя<select value={reviewMonday} onChange={event => setReviewWeek(event.target.value)}>{historyWeeks.map(week => <option key={week} value={week}>{weekRange(week)}</option>)}</select></label> : null}<p className="g-week-period">Понедельник — воскресенье · {weekRange(reviewMonday)}</p><h3>{reviewedPlan.tasks.filter(task => task.done).length} из {reviewedPlan.tasks.length} задач выполнено</h3><ul className="g-weekly-results">{reviewedPlan.tasks.map(task => <li key={task.id}><span className={task.done ? 'is-done' : ''}>{task.done ? <Check size={17} aria-hidden="true" /> : <Minus size={17} aria-hidden="true" />}{task.done ? 'Выполнено' : 'Не выполнено'}</span><strong>{task.title}</strong></li>)}</ul><p>В воскресенье вечером посмотрите на результаты и выберите 3–5 главных задач следующей недели.</p><div className="g-dialog-actions">{button('Завершить ревью', () => { store.reviewWeek(reviewMonday); setDialog(null) })}{reviewMonday === monday ? button('План следующей недели', () => openWeeklyPlan(nextMonday), true) : null}</div></> : null}
      {dialog === 'weekly-plan' ? <form className="g-week-plan-form" onSubmit={event => { event.preventDefault(); saveWeek() }}><p className="g-week-period">Понедельник — воскресенье · {weekRange(planTarget ?? nextMonday)}</p><label htmlFor="week-titles">Что хотите сделать за неделю?</label><textarea id="week-titles" autoFocus data-modal-autofocus rows={6} value={weeklyDraft} onChange={event => { setWeeklyDraft(event.target.value); setWeeklyError('') }} aria-invalid={Boolean(weeklyError)} aria-describedby={weeklyError ? 'weekly-plan-help weekly-plan-error' : 'weekly-plan-help'} placeholder={'Подготовить первую версию приложения\nПрочитать одну книгу\nСделать три тренировки'} /><p id="weekly-plan-help">3–5 задач, каждая с новой строки. Только названия.</p>{weeklyError ? <p id="weekly-plan-error" role="alert">{weeklyError}</p> : null}<div className="g-dialog-actions">{button('Отмена', () => setDialog(null))}<button type="submit" className="button button--primary">Сохранить план недели</button></div></form> : null}
    </div></Modal> : null}
  </>
}
