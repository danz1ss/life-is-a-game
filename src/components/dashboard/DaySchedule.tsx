import { Clock3, GripVertical } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { formatDuration, isQuestComplete, isQuestSkipped } from '../../lib/game'
import type { Quest } from '../../lib/types'
import { minutesOf, questEnd, timeOf } from './QuickTime'

export interface DayScheduleProps {
  quests: Quest[]
  onDate: string
  onSchedule: (quest: Quest, time: string | null) => void
  renderSelected: (quest: Quest) => ReactNode
}

const hourHeight = 80

// Layout only: visually overlapping events share columns; quest duration and awards stay unchanged.
function calendarEvents(quests: Quest[]) {
  const result: { quest: Quest; lane: number; lanes: number }[] = []
  let group: { quest: Quest; lane: number }[] = [], laneEnds: number[] = [], groupEnd = 0
  const flush = () => { result.push(...group.map(event => ({ ...event, lanes: laneEnds.length }))); group = []; laneEnds = [] }
  for (const quest of quests.filter(q => q.scheduledTime).sort((a, b) => a.scheduledTime!.localeCompare(b.scheduledTime!))) {
    const start = minutesOf(quest.scheduledTime!), end = start + Math.max(30, quest.durationMinutes)
    if (group.length && start >= groupEnd) flush()
    let lane = laneEnds.findIndex(laneEnd => laneEnd <= start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = end; groupEnd = Math.max(...laneEnds); group.push({ quest, lane })
  }
  flush(); return result
}

export function DaySchedule({ quests, onDate, onSchedule, renderSelected }: DayScheduleProps) {
  const [selectedId, setSelectedId] = useState(quests[0]?.id ?? null)
  const [dropTime, setDropTime] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const selected = quests.find(q => q.id === selectedId) ?? quests[0]
  const events = calendarEvents(quests)
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 8 * hourHeight }, [onDate])
  const startDrag = (event: DragEvent, quest: Quest) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', quest.id); setDraggedId(quest.id) }
  const stopDrag = () => { setDraggedId(null); setDropTime(null) }
  const timeAtPointer = (event: DragEvent) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return timeOf(Math.max(0, Math.min(1425, Math.floor((event.clientY - bounds.top) / hourHeight * 4) * 15)))
  }
  const drop = (event: DragEvent, time: string) => {
    event.preventDefault()
    const quest = quests.find(q => q.id === event.dataTransfer.getData('text/plain'))
    if (quest) { onSchedule(quest, time); setSelectedId(quest.id) }
    stopDrag()
  }
  const unscheduled = quests.filter(q => !q.scheduledTime)
  return <div className="g-schedule">
    <p className="g-schedule-help"><GripVertical size={16} aria-hidden="true" />Перетащите задачу на шкалу. Шаг — 15 минут. Нажмите задачу для точной правки.</p>
    <div className="g-calendar-toolbar"><span><Clock3 size={16} aria-hidden="true" />Шкала дня</span><div role="group" aria-label="Перейти ко времени">{[['Утро', 8], ['День', 12], ['Вечер', 18]].map(([label, hour]) => <button className="button button--tertiary" type="button" key={label} onClick={() => scroller.current?.scrollTo({ top: Number(hour) * hourHeight })}>{label}</button>)}</div></div>
    <div className="g-schedule-layout">
      <div className="g-calendar-scroll" ref={scroller} tabIndex={0} role="region" aria-label="Часовая шкала дня, прокручивается от 00:00 до 24:00">
        <div className={`g-calendar-grid ${draggedId ? 'is-dragging' : ''}`} style={{ height: 24 * hourHeight + 40 }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTime(timeAtPointer(event)) }} onDrop={event => { if (!event.defaultPrevented) drop(event, timeAtPointer(event)) }}>
          {Array.from({ length: 24 }, (_, hour) => <div className="g-calendar-hour" key={hour} style={{ height: hourHeight }}><span className="g-hour-label">{timeOf(hour * 60)}</span><div className="g-hour-slots">{[0, 15, 30, 45].map(minute => {
            const time = timeOf(hour * 60 + minute)
            return <button type="button" tabIndex={-1} key={minute} className={`g-quarter ${dropTime === time ? 'is-drop-target' : ''}`} data-time={time} aria-label={`Поставить выбранную задачу на ${time}`} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTime(time) }} onDragLeave={() => setDropTime(null)} onDrop={event => drop(event, time)} onClick={() => { if (selected) onSchedule(selected, time) }}><span>{dropTime === time ? time : ''}</span></button>
          })}</div></div>)}
          <span className="g-day-end" style={{ top: 24 * hourHeight }}>24:00</span>
          <div className="g-calendar-events">{events.map(({ quest, lane, lanes }) => <div role="button" tabIndex={0} draggable key={quest.id} className={`g-calendar-event ${quest.id === selected?.id ? 'is-selected' : ''} ${isQuestComplete(quest, onDate) ? 'is-complete' : ''} ${isQuestSkipped(quest, onDate) ? 'is-skipped' : ''} ${quest.id === draggedId ? 'is-dragging' : ''}`} data-quest-id={quest.id} aria-label={`Задача: ${quest.title}, ${quest.scheduledTime} — ${questEnd(quest)}`} aria-pressed={quest.id === selected?.id} style={{ top: minutesOf(quest.scheduledTime!) * hourHeight / 60, height: Math.max(40, Math.min(quest.durationMinutes, 1440 - minutesOf(quest.scheduledTime!)) * hourHeight / 60), left: `calc(${lane * 100 / lanes}% + 3px)`, width: `calc(${100 / lanes}% - 6px)` }} onDragStart={event => startDrag(event, quest)} onDragEnd={stopDrag} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(quest.id) } }} onClick={() => setSelectedId(quest.id)}><span className="g-event-title"><GripVertical size={13} aria-hidden="true" /><strong>{quest.title}</strong></span><span className="g-event-time">{quest.scheduledTime} — {questEnd(quest)}</span></div>)}</div>
        </div>
      </div>
      <aside className={`g-calendar-backlog ${draggedId ? 'is-dragging' : ''}`} aria-label="Задачи в любое время" onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }} onDrop={event => { event.preventDefault(); const quest = quests.find(q => q.id === event.dataTransfer.getData('text/plain')); if (quest) onSchedule(quest, null); stopDrag() }}>
        <h3>В любое время <span>{unscheduled.length}</span></h3><p>Отсюда — на шкалу.<br />Обратно — убрать время.</p>
        {unscheduled.map(quest => <div className={`g-unscheduled-task ${quest.id === selected?.id ? 'is-selected' : ''}`} role="button" tabIndex={0} draggable key={quest.id} data-quest-id={quest.id} aria-pressed={quest.id === selected?.id} onDragStart={event => startDrag(event, quest)} onDragEnd={stopDrag} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(quest.id) } }} onClick={() => setSelectedId(quest.id)}><GripVertical size={16} aria-hidden="true" /><span><strong>{quest.title}</strong><small>{formatDuration(quest.durationMinutes)}</small></span></div>)}
        {!unscheduled.length ? <p>Все задачи на шкале. Можно перенести любую сюда.</p> : null}
      </aside>
    </div>
    {selected ? <div className="g-schedule-selected"><h3>Выбранная задача</h3><ul className="g-list">{renderSelected(selected)}</ul></div> : null}
  </div>
}
