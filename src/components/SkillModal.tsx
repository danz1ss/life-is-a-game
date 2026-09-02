import { useEffect, useState, type FormEvent } from 'react'
import type { Skill, SkillDraft } from '../lib/types'
import { Modal } from './Ui'

const colors = ['#53d6a1', '#9b8cff', '#ffb45e', '#5bbcf6', '#ff758f', '#e6d36a']
const icons = ['✦', '❤', '⚡', '◆', '▤', 'A', '</>', '☾', '◈', '♟']

export function SkillModal({ skill, skills, onSave, onClose }: {
  skill?: Skill | null
  skills: Skill[]
  onSave: (draft: SkillDraft) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('✦')
  const [color, setColor] = useState(colors[0])
  const [parentId, setParentId] = useState('')
  const [requiredParentLevel, setRequiredParentLevel] = useState(1)

  useEffect(() => {
    setName(skill?.name ?? '')
    setDescription(skill?.description ?? '')
    setIcon(skill?.icon ?? '✦')
    setColor(skill?.color ?? colors[0])
    setParentId(skill?.parentId ?? '')
    setRequiredParentLevel(skill?.requiredParentLevel ?? 1)
  }, [skill])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), description: description.trim(), icon, color, parentId: parentId || null, requiredParentLevel })
  }

  return (
    <Modal title={skill ? 'Настроить навык' : 'Новый навык'} subtitle="Добавьте новую ветку или продолжите существующую" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label className="field field--full">
          <span>Название</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Например: Фотография" maxLength={60} />
        </label>
        <label className="field field--full">
          <span>Описание <small>необязательно</small></span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Что означает этот навык для вас?" rows={3} />
        </label>
        <fieldset className="field field--full">
          <legend>Иконка</legend>
          <div className="icon-picker">
            {icons.map((value) => <button type="button" className={icon === value ? 'is-selected' : ''} onClick={() => setIcon(value)} key={value}>{value}</button>)}
          </div>
        </fieldset>
        <fieldset className="field field--full">
          <legend>Цвет ветки</legend>
          <div className="color-picker">
            {colors.map((value) => <button type="button" aria-label={value} className={color === value ? 'is-selected' : ''} style={{ background: value }} onClick={() => setColor(value)} key={value} />)}
          </div>
        </fieldset>
        <label className="field">
          <span>Родительская ветка</span>
          <select value={parentId} onChange={(event) => setParentId(event.target.value)}>
            <option value="">От персонажа</option>
            {skills.filter((item) => item.id !== skill?.id).map((item) => <option value={item.id} key={item.id}>{item.icon} {item.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Откроется на уровне родителя</span>
          <input type="number" min={1} max={50} value={requiredParentLevel} onChange={(event) => setRequiredParentLevel(Number(event.target.value))} />
        </label>
        <footer className="form-actions field--full">
          <button className="button button--ghost" type="button" onClick={onClose}>Отмена</button>
          <button className="button button--primary" type="submit">{skill ? 'Сохранить' : 'Добавить навык'}</button>
        </footer>
      </form>
    </Modal>
  )
}
