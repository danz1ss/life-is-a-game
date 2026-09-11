import { useEffect, useState, type FormEvent } from 'react'
import { CalendarDays, Flag, Heart, Target, Trophy } from 'lucide-react'
import { goalCompletionReward } from '../lib/game'
import type { Skill, SkillGoal, SkillGoalDraft } from '../lib/types'
import { Modal } from './Ui'

export function GoalModal({ goal, skill, onSave, onClose }: {
  goal?: SkillGoal | null
  skill: Skill
  onSave: (draft: SkillGoalDraft) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [purpose, setPurpose] = useState('')
  const [successCriteria, setSuccessCriteria] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setTitle(goal?.title ?? '')
    setPurpose(goal?.purpose ?? '')
    setSuccessCriteria(goal?.successCriteria ?? '')
    setTargetDate(goal?.targetDate ?? '')
    setProgress(goal?.progress ?? 0)
  }, [goal])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    onSave({ skillId: skill.id, title: title.trim(), purpose: purpose.trim(), successCriteria: successCriteria.trim(), targetDate: targetDate || null, progress })
  }

  return <Modal title={goal ? 'Изменить главную цель' : 'Главная цель навыка'} subtitle={`${skill.name} · одна активная цель задаёт направление всей ветке`} onClose={onClose} wide>
    <form className="form goal-form" onSubmit={submit}>
      <label className="field field--full"><span><Target size={15} /> К чему я стремлюсь</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например: свободно говорить на английском на уровне B2" maxLength={140} /></label>
      <label className="field field--full"><span><Heart size={15} /> Зачем мне это</span><textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Личный смысл цели — что изменится, когда вы её достигнете?" rows={3} /></label>
      <label className="field field--full"><span><Flag size={15} /> Как я пойму, что цель достигнута</span><textarea value={successCriteria} onChange={(event) => setSuccessCriteria(event.target.value)} placeholder="Например: поддерживать разговор 30 минут без перехода на русский" rows={2} /></label>
      <label className="field"><span><CalendarDays size={15} /> Целевая дата <small>необязательно</small></span><input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>
      <label className="field"><span>Текущий прогресс · {progress}%</span><input className="range-input" type="range" min={0} max={100} step={5} value={progress} onChange={(event) => setProgress(Number(event.target.value))} /></label>
      <div className="goal-reward-note field--full"><Trophy size={18} /><span><strong>Награда за достижение</strong><small>+{goalCompletionReward.xp} XP навыка и персонажа · +{goalCompletionReward.gold} золота</small></span></div>
      <footer className="form-actions field--full"><button className="button button--ghost" type="button" onClick={onClose}>Отмена</button><button className="button button--primary" type="submit">{goal ? 'Сохранить' : 'Поставить цель'}</button></footer>
    </form>
  </Modal>
}
