import { Clock3, Minus, Plus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Quest } from '../../lib/types'
import { formatDuration } from '../../lib/game'

export function minutesOf(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export const timeOf = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export function questEnd(quest: Quest) {
  if (!quest.scheduledTime) return null
  const end = minutesOf(quest.scheduledTime) + quest.durationMinutes
  return `${timeOf(end)}${end >= 1440 ? ' (+1 день)' : ''}`
}

export interface QuickTimeProps {
  quest: Quest
  suggestedTime: string | null
  onChange: (time: string | null) => void
}

export function QuickTime({ quest, suggestedTime, onChange }: QuickTimeProps) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const current = quest.scheduledTime ? minutesOf(quest.scheduledTime) : null
  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }
  return <div className="g-quick-time" onKeyDown={event => { if (event.key === 'Escape' && open) { event.stopPropagation(); close() } }}>
    <div className="g-time-summary"><div className="g-time-duration"><button ref={trigger} className="button button--tertiary" type="button" aria-expanded={open} aria-label={`Время: ${quest.title}`} onClick={() => setOpen(!open)}><Clock3 size={15} aria-hidden="true" />{quest.scheduledTime ? `${quest.scheduledTime}–${questEnd(quest)}` : 'Назначить время'}</button><span>· {formatDuration(quest.durationMinutes)}</span></div>{!quest.scheduledTime && suggestedTime ? <button className="button button--tertiary" type="button" onClick={() => onChange(suggestedTime)}>После предыдущей · {suggestedTime}</button> : null}</div>
    {open ? <div className="g-time-editor" role="group" aria-label={`Быстрое время: ${quest.title}`}>
      <label>Начало<input autoFocus type="time" value={quest.scheduledTime ?? ''} aria-label={`Начало: ${quest.title}`} onChange={event => onChange(event.target.value || null)} /></label>
      <div className="g-time-nudge"><button className="button button--ghost" type="button" disabled={current === null || current < 15} aria-label={`На 15 минут раньше: ${quest.title}`} onClick={() => current !== null && onChange(timeOf(current - 15))}><Minus size={14} aria-hidden="true" />15 мин</button><button className="button button--ghost" type="button" disabled={current === null || current > 1424} aria-label={`На 15 минут позже: ${quest.title}`} onClick={() => current !== null && onChange(timeOf(current + 15))}><Plus size={14} aria-hidden="true" />15 мин</button></div>
      <div className="g-time-presets" role="group" aria-label="Быстро выбрать время">{['09:00', '12:00', '15:00', '18:00'].map(time => <button className="button button--ghost" type="button" key={time} aria-pressed={quest.scheduledTime === time} onClick={() => onChange(time)}>{time}</button>)}</div>
      <div className="g-time-editor-actions"><button className="button button--tertiary" type="button" disabled={!quest.scheduledTime} onClick={() => onChange(null)}>Убрать время</button><button className="button button--tertiary" type="button" aria-label={`Закрыть выбор времени: ${quest.title}`} onClick={close}><X size={15} aria-hidden="true" />Готово</button></div>
    </div> : null}
  </div>
}
