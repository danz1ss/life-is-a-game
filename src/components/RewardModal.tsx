import { useEffect, useState, type FormEvent } from 'react'
import type { Reward, RewardDraft } from '../lib/types'
import { Modal } from './Ui'

const icons = ['☕', '🎬', '🌙', '🎮', '🍕', '🎁', '📚', '🛋️', '🎵', '✨']

export function RewardModal({ reward, onSave, onClose }: {
  reward?: Reward | null
  onSave: (draft: RewardDraft) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('☕')
  const [cost, setCost] = useState(20)

  useEffect(() => {
    setTitle(reward?.title ?? '')
    setDescription(reward?.description ?? '')
    setIcon(reward?.icon ?? '☕')
    setCost(reward?.cost ?? 20)
  }, [reward])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    onSave({ title: title.trim(), description: description.trim(), icon, cost: Math.max(1, cost) })
  }

  return (
    <Modal title={reward ? 'Редактировать награду' : 'Новая награда'} subtitle="Назначьте честную цену приятному отдыху" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label className="field field--full"><span>Название</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например: заказать пиццу" /></label>
        <label className="field field--full"><span>Описание <small>необязательно</small></span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <fieldset className="field field--full"><legend>Иконка</legend><div className="icon-picker">{icons.map((value) => <button type="button" className={icon === value ? 'is-selected' : ''} onClick={() => setIcon(value)} key={value}>{value}</button>)}</div></fieldset>
        <label className="field field--full"><span>Цена в золоте</span><input type="number" min={1} max={10000} value={cost} onChange={(event) => setCost(Number(event.target.value))} /></label>
        <footer className="form-actions field--full"><button className="button button--ghost" type="button" onClick={onClose}>Отмена</button><button className="button button--primary" type="submit">Сохранить</button></footer>
      </form>
    </Modal>
  )
}
