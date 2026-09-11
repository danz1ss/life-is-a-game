import { Check, Clock3, Coins, GripVertical, Star, Target, X, Zap } from 'lucide-react'
import { QuestActions } from './QuestActions'
import { SkillIcon } from './SkillIcon'
import type { DragEvent, ReactNode } from 'react'
import { difficultyConfig, formatDuration, isQuestComplete, isQuestSkipped } from '../lib/game'
import type { Quest, Skill } from '../lib/types'

export function QuestCard({ quest, skill, goalTitle, date, onToggle, onSkip, onEdit, onDelete, onMakeMain, onReorder, compact = false, badge, footer }: {
  quest: Quest
  skill?: Skill
  goalTitle?: string
  date: string
  onToggle?: () => void
  onSkip?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onMakeMain?: () => void
  onReorder?: (sourceId: string, targetId: string, placement: 'before' | 'after') => void
  compact?: boolean
  badge?: { label: string; tone: 'danger' | 'muted' | 'success' | 'violet' }
  footer?: ReactNode
}) {
  const complete = isQuestComplete(quest, date)
  const skipped = isQuestSkipped(quest, date)
  const reward = difficultyConfig[quest.difficulty]
  const startDrag = (event: DragEvent<HTMLSpanElement>) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', quest.id)
  }
  const dropQuest = (event: DragEvent<HTMLElement>) => {
    if (!onReorder) return
    event.preventDefault()
    const sourceId = event.dataTransfer.getData('text/plain')
    const bounds = event.currentTarget.getBoundingClientRect()
    const placement = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after'
    onReorder(sourceId, quest.id, placement)
  }
  return (
    <article className={`quest-card ${complete ? 'is-complete' : ''} ${skipped ? 'is-skipped' : ''} ${compact ? 'quest-card--compact' : ''}`} onDragOver={onReorder ? (event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' } : undefined} onDrop={dropQuest}>
      {onReorder && <span className="quest-drag-handle" draggable onDragStart={startDrag} title="Перетащить квест" aria-label="Перетащить квест"><GripVertical size={17} /></span>}
      <div className="quest-result-actions">
        <button className={`quest-check ${!onToggle ? 'quest-check--static' : ''}`} type="button" disabled={!onToggle} onClick={onToggle} aria-label={complete ? 'Вернуть квест' : 'Выполнить квест'} aria-pressed={complete}>
          <Check size={16} strokeWidth={2} />
        </button>
        {onSkip && <button className="quest-skip" type="button" onClick={onSkip} aria-label={skipped ? 'Снять отметку «не выполнено»' : quest.repeatDays.length > 0 ? 'Не выполнено сегодня' : 'Не выполнено — перенести на завтра'} aria-pressed={skipped} title={quest.repeatDays.length > 0 ? 'Не выполнено сегодня' : 'Не выполнено — перенести на завтра'}>
          <X size={16} strokeWidth={2} />
        </button>}
      </div>
      <div className="quest-card__body">
        <div className="quest-card__topline">
          <h3>{quest.title}</h3>
          {quest.isMain && <span className="main-badge"><Star size={11} fill="currentColor" /> Главный</span>}
          {(complete || skipped) && <span className="quest-result-label">{complete ? 'Выполнено' : 'Не выполнено'}</span>}
        </div>
        {quest.description && <p className={compact ? 'quest-description--compact' : ''}>{quest.description}</p>}
        <div className="quest-meta">
          {badge && <span className={`quest-status quest-status--${badge.tone}`}>{badge.label}</span>}
          {quest.scheduledTime && <span><Clock3 size={13} /> {quest.scheduledTime}</span>}
          <span><Clock3 size={13} /> {formatDuration(quest.durationMinutes)}</span>
          {skill && <span className="skill-pill" data-skill-id={skill.id} style={{ color: skill.color }}><SkillIcon icon={skill.icon} size={14} />{skill.name}</span>}
          {goalTitle && <span className="goal-pill"><Target size={12} />{goalTitle}</span>}
          <span><Zap size={13} /> {reward.xp} XP</span>
          <span><Coins size={13} /> {reward.gold}</span>
        </div>
        {footer && <div className="quest-card__footer">{footer}</div>}
      </div>
      {(onEdit || onDelete || onMakeMain) && (
        <QuestActions title={quest.title} onEdit={onEdit} onDelete={onDelete} onMakeMain={!quest.isMain ? onMakeMain : undefined} />
      )}
    </article>
  )
}
