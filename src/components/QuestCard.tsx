import { Check, Clock3, Coins, Pencil, Star, Trash2, Zap } from 'lucide-react'
import { difficultyConfig, formatDuration, isQuestComplete } from '../lib/game'
import type { Quest, Skill } from '../lib/types'

export function QuestCard({ quest, skill, date, onToggle, onEdit, onDelete, onMakeMain, compact = false }: {
  quest: Quest
  skill?: Skill
  date: string
  onToggle: () => void
  onEdit?: () => void
  onDelete?: () => void
  onMakeMain?: () => void
  compact?: boolean
}) {
  const complete = isQuestComplete(quest, date)
  const reward = difficultyConfig[quest.difficulty]
  return (
    <article className={`quest-card ${complete ? 'is-complete' : ''} ${compact ? 'quest-card--compact' : ''}`}>
      <button className="quest-check" type="button" onClick={onToggle} aria-label={complete ? 'Вернуть квест' : 'Выполнить квест'}>
        {complete && <Check size={17} strokeWidth={3} />}
      </button>
      <div className="quest-card__body">
        <div className="quest-card__topline">
          <h3>{quest.title}</h3>
          {quest.isMain && <span className="main-badge"><Star size={11} fill="currentColor" /> Главный</span>}
        </div>
        {!compact && quest.description && <p>{quest.description}</p>}
        <div className="quest-meta">
          {quest.scheduledTime && <span><Clock3 size={13} /> {quest.scheduledTime}</span>}
          <span><Clock3 size={13} /> {formatDuration(quest.durationMinutes)}</span>
          {skill && <span className="skill-pill" style={{ color: skill.color }}><i style={{ background: skill.color }} />{skill.name}</span>}
          <span><Zap size={13} /> {reward.xp} XP</span>
          <span><Coins size={13} /> {reward.gold}</span>
        </div>
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
