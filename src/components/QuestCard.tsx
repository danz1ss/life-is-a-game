import { Check, Clock3, Coins, Pencil, Star, Target, Trash2, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { difficultyConfig, formatDuration, isQuestComplete } from '../lib/game'
import type { Quest, Skill } from '../lib/types'

export function QuestCard({ quest, skill, goalTitle, date, onToggle, onEdit, onDelete, onMakeMain, compact = false, badge, footer }: {
  quest: Quest
  skill?: Skill
  goalTitle?: string
  date: string
  onToggle?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onMakeMain?: () => void
  compact?: boolean
  badge?: { label: string; tone: 'danger' | 'muted' | 'success' | 'violet' }
  footer?: ReactNode
}) {
  const complete = isQuestComplete(quest, date)
  const reward = difficultyConfig[quest.difficulty]
  return (
    <article className={`quest-card ${complete ? 'is-complete' : ''} ${compact ? 'quest-card--compact' : ''}`}>
      <button className={`quest-check ${!onToggle ? 'quest-check--static' : ''}`} type="button" disabled={!onToggle} onClick={onToggle} aria-label={complete ? 'Вернуть квест' : 'Выполнить квест'}>
        {complete && <Check size={17} strokeWidth={3} />}
      </button>
      <div className="quest-card__body">
        <div className="quest-card__topline">
          <h3>{quest.title}</h3>
          {quest.isMain && <span className="main-badge"><Star size={11} fill="currentColor" /> Главный</span>}
        </div>
        {quest.description && <p className={compact ? 'quest-description--compact' : ''}>{quest.description}</p>}
        <div className="quest-meta">
          {badge && <span className={`quest-status quest-status--${badge.tone}`}>{badge.label}</span>}
          {quest.scheduledTime && <span><Clock3 size={13} /> {quest.scheduledTime}</span>}
          <span><Clock3 size={13} /> {formatDuration(quest.durationMinutes)}</span>
          {skill && <span className="skill-pill" style={{ color: skill.color }}><i style={{ background: skill.color }} />{skill.name}</span>}
          {goalTitle && <span className="goal-pill"><Target size={12} />{goalTitle}</span>}
          <span><Zap size={13} /> {reward.xp} XP</span>
          <span><Coins size={13} /> {reward.gold}</span>
        </div>
        {footer && <div className="quest-card__footer">{footer}</div>}
      </div>
      {(onEdit || onDelete || onMakeMain) && (
        <div className="quest-actions">
          {onMakeMain && !quest.isMain && <button className="icon-button" type="button" onClick={onMakeMain} title="Сделать главным"><Star size={16} /></button>}
          {onEdit && <button className="icon-button" type="button" onClick={onEdit} title="Редактировать"><Pencil size={16} /></button>}
          {onDelete && <button className="icon-button icon-button--danger" type="button" onClick={onDelete} title="Удалить"><Trash2 size={16} /></button>}
        </div>
      )}
    </article>
  )
}
