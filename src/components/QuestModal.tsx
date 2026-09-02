import { useEffect, useState, type FormEvent } from 'react'
import { CalendarDays, Clock3, Flag, Repeat2, Sparkles } from 'lucide-react'
import { dateKey, difficultyConfig, weekDays } from '../lib/game'
import type { Difficulty, Quest, QuestDraft, Skill } from '../lib/types'
import { Modal } from './Ui'

export function QuestModal({ quest, skills, onSave, onClose }: {
  quest?: Quest | null
  skills: Skill[]
  onSave: (draft: QuestDraft) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [skillId, setSkillId] = useState<string>('')
  const [dueDate, setDueDate] = useState(dateKey())
  const [scheduledTime, setScheduledTime] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [repeatDays, setRepeatDays] = useState<number[]>([])
  const [isMain, setIsMain] = useState(false)

  useEffect(() => {
    setTitle(quest?.title ?? '')
    setDescription(quest?.description ?? '')
    setDifficulty(quest?.difficulty ?? 'medium')
    setSkillId(quest?.skillId ?? '')
    setDueDate(quest?.dueDate ?? dateKey())
    setScheduledTime(quest?.scheduledTime ?? '')
    setDurationMinutes(quest?.durationMinutes ?? 30)
    setRepeatDays(quest?.repeatDays ?? [])
    setIsMain(quest?.isMain ?? false)
  }, [quest])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    onSave({
      title: title.trim(), description: description.trim(), difficulty, skillId: skillId || null,
      dueDate: repeatDays.length > 0 ? null : (dueDate || null), scheduledTime: scheduledTime || null,
      durationMinutes: Math.max(5, durationMinutes), repeatDays, isMain,
    })
  }

  const toggleDay = (day: number) => {
    setRepeatDays((days) => days.includes(day) ? days.filter((item) => item !== day) : [...days, day])
  }

  return (
    <Modal title={quest ? 'Редактировать квест' : 'Новый квест'} subtitle="Превратите конкретное действие в понятную миссию" onClose={onClose} wide>
      <form className="form" onSubmit={submit}>
        <label className="field field--full">
          <span>Название</span>
          <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например: закончить первый экран" maxLength={120} />
        </label>

        <label className="field field--full">
          <span>Описание <small>необязательно</small></span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Что именно нужно сделать?" rows={3} />
        </label>

        <fieldset className="field field--full">
          <legend><Flag size={15} /> Сложность</legend>
          <div className="difficulty-picker">
            {(Object.keys(difficultyConfig) as Difficulty[]).map((value) => {
              const config = difficultyConfig[value]
              return (
                <button className={`difficulty-option difficulty-option--${config.tone} ${difficulty === value ? 'is-selected' : ''}`} type="button" key={value} onClick={() => setDifficulty(value)}>
                  <strong>{config.label}</strong><span>+{config.xp} XP · {config.gold} золота</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <label className="field">
          <span><Sparkles size={15} /> Навык</span>
          <select value={skillId} onChange={(event) => setSkillId(event.target.value)}>
            <option value="">Без навыка</option>
            {skills.map((skill) => <option value={skill.id} key={skill.id}>{skill.icon} {skill.name}</option>)}
          </select>
        </label>

        <label className="field">
          <span><Clock3 size={15} /> Продолжительность</span>
          <select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))}>
            {[10, 15, 20, 30, 45, 60, 90, 120, 180].map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} минут` : `${minutes / 60} ч${minutes % 60 ? ' 30 мин' : ''}`}</option>)}
          </select>
        </label>

        <label className="field">
          <span><CalendarDays size={15} /> Дата</span>
          <input type="date" value={dueDate} disabled={repeatDays.length > 0} onChange={(event) => setDueDate(event.target.value)} />
        </label>

        <label className="field">
          <span><Clock3 size={15} /> Начало <small>необязательно</small></span>
          <input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} />
        </label>

        <fieldset className="field field--full">
          <legend><Repeat2 size={15} /> Повторять по дням</legend>
          <div className="weekday-picker">
            {weekDays.map((day) => <button type="button" key={day.value} className={repeatDays.includes(day.value) ? 'is-selected' : ''} onClick={() => toggleDay(day.value)}>{day.short}</button>)}
          </div>
        </fieldset>

        <label className="check-field field--full">
          <input type="checkbox" checked={isMain} onChange={(event) => setIsMain(event.target.checked)} />
          <span><strong>Сделать главным квестом</strong><small>Он появится в выделенном блоке на экране «Сегодня».</small></span>
        </label>

        <footer className="form-actions field--full">
          <button className="button button--ghost" type="button" onClick={onClose}>Отмена</button>
          <button className="button button--primary" type="submit">{quest ? 'Сохранить' : 'Создать квест'}</button>
        </footer>
      </form>
    </Modal>
  )
}
