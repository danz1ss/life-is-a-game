import { Check, ChevronRight, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { WeeklyPlan } from '../../lib/types'

export interface WeeklyChecklistProps {
  plan: WeeklyPlan
  isNext: boolean
  nextAvailable: boolean
  onToggle: (id: string) => void
  onSave: (id: string | null, title: string) => void
  onDelete: (id: string) => void
  onReview: () => void
  onChangeWeek: (next: boolean) => void
  onPlan?: () => void
}

export function WeeklyChecklist({ plan, isNext, onToggle, onSave, onDelete, onReview, onChangeWeek, nextAvailable, onPlan }: WeeklyChecklistProps) {
  const headingId = useId()
  const titleId = useId()
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const section = useRef<HTMLElement>(null)
  const returnFocus = useRef<string | null>(null)
  const addTrigger = useRef<HTMLButtonElement>(null)
  const reviewTrigger = useRef<HTMLButtonElement>(null)
  const done = plan.tasks.filter(task => task.done).length
  useEffect(() => {
    if (editing || adding || !returnFocus.current) return
    const target = returnFocus.current === 'add'
      ? addTrigger.current
      : section.current?.querySelector<HTMLButtonElement>(`[data-weekly-id="${CSS.escape(returnFocus.current)}"] .g-weekly-edit`)
    const focusTarget = target && !target.disabled ? target : reviewTrigger.current
    focusTarget?.focus()
    returnFocus.current = null
  }, [editing, adding])

  const finishEdit = () => {
    returnFocus.current = editing ?? 'add'
    setEditing(null)
    setAdding(false)
  }
  const editor = <form className="g-weekly-editor" onSubmit={event => { event.preventDefault(); if (!title.trim()) return; onSave(editing, title.trim()); finishEdit() }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); finishEdit() } }}>
    <label className="g-visually-hidden" htmlFor={titleId}>Название недельной задачи</label><input id={titleId} autoFocus required maxLength={300} value={title} placeholder="Что хотите сделать за неделю?" onChange={event => setTitle(event.target.value)} />
    <div><button type="submit" className="button button--tertiary" disabled={!title.trim()}><Check size={15} aria-hidden="true" />Сохранить</button>{editing ? <button type="button" className="button button--tertiary g-weekly-delete" onClick={() => { onDelete(editing); returnFocus.current = 'add'; setEditing(null) }}><Trash2 size={15} aria-hidden="true" />Удалить</button> : null}<button type="button" className="button button--tertiary" onClick={finishEdit}>Отмена</button></div>
  </form>
  return <section ref={section} className="g-weekly" aria-labelledby={headingId}>
    <div className="g-section-line"><h2 id={headingId}><ListChecks size={19} aria-hidden="true" />Главные задачи недели</h2></div>
    <div className="g-weekly-context"><span>{isNext ? 'Следующая неделя' : 'Пн–Вс'}{plan.reviewedAt && !isNext ? ' · ревью пройдено' : ''}</span><strong>{done} из {plan.tasks.length}</strong></div>
    {nextAvailable ? <div className="g-week-switch" role="group" aria-label="Неделя"><button type="button" aria-pressed={!isNext} onClick={() => onChangeWeek(false)}>Текущая</button><button type="button" aria-pressed={isNext} onClick={() => onChangeWeek(true)}>Следующая</button></div> : null}
    <ul className="g-weekly-list">{plan.tasks.map(task => <li key={task.id} className={`g-weekly-row ${task.done ? 'is-done' : ''}`} data-weekly-id={task.id}>{editing === task.id ? editor : <><label><input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} /><span>{task.title}</span></label><button type="button" className="g-weekly-edit" aria-label={`Изменить недельную задачу: ${task.title}`} onClick={() => { setEditing(task.id); setAdding(false); setTitle(task.title) }}><Pencil size={15} aria-hidden="true" /></button></>}</li>)}</ul>
    {!plan.tasks.length && !adding ? <p className="g-weekly-empty">Выберите 3–5 важных результатов недели.</p> : null}
    {adding ? editor : null}
    <div className="g-weekly-footer"><button ref={addTrigger} type="button" className="button button--tertiary" disabled={plan.tasks.length >= 5 || adding || !!editing} title={plan.tasks.length >= 5 ? 'В плане уже 5 главных задач' : 'Добавить недельную задачу'} onClick={() => { setTitle(''); setAdding(true) }}><Plus size={15} aria-hidden="true" />Задача</button><button ref={reviewTrigger} type="button" className="button button--tertiary" onClick={onReview}>{isNext ? 'Итоги текущей' : 'Ревью недели'} <ChevronRight size={15} aria-hidden="true" /></button></div>
    <p className="g-weekly-hint">Воскресенье вечером — итоги и новый план.</p>
    {!plan.tasks.length && onPlan ? <button type="button" className="button button--tertiary" onClick={onPlan}>Составить план недели <ChevronRight size={15} aria-hidden="true" /></button> : null}
  </section>
}
