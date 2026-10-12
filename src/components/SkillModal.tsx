import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { Skill, SkillDraft } from '../lib/types'
import { Modal } from './Ui'
import { skillColorFamilies, skillFamilyColors, skillRoot, suggestSkillColor } from '../lib/skillColors'
import { canonicalSkillIcon, normalizeIconQuery, searchSkillIcons, SkillIcon, skillIcons } from './SkillIcon'
import { descendantIds } from '../lib/treeLayout'

const rootColors = skillColorFamilies.map((family) => family.colors[0])

export function SkillModal({ skill, skills, initialParentId = '', onSave, onClose }: {
  skill?: Skill | null
  skills: Skill[]
  initialParentId?: string
  onSave: (draft: SkillDraft) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('✦')
  const [color, setColor] = useState(rootColors[0])
  const [parentId, setParentId] = useState('')
  const [requiredParentLevel, setRequiredParentLevel] = useState(1)
  const [iconQuery, setIconQuery] = useState('')
  const [iconOpen, setIconOpen] = useState(false)
  const iconTrigger = useRef<HTMLButtonElement>(null)
  const iconPanelId = useId()

  useEffect(() => {
    setName(skill?.name ?? '')
    setDescription(skill?.description ?? '')
    setIcon(skill?.icon ?? '✦')
    setColor(skill?.color ?? suggestSkillColor(initialParentId || null, skills))
    setParentId(skill?.parentId ?? initialParentId)
    setRequiredParentLevel(skill?.requiredParentLevel ?? 1)
    setIconOpen(false)
    setIconQuery('')
  }, [skill, initialParentId])

  const excludedParents = skill ? descendantIds(skills, skill.id) : new Set<string>()
  const selectedIcon = canonicalSkillIcon(icon)
  const customIcon = skill?.icon && !skillIcons.some((item) => item.id === canonicalSkillIcon(skill.icon)) ? skill.icon : null
  const visibleIcons = searchSkillIcons(iconQuery)
  const showCustomIcon = customIcon !== null && normalizeIconQuery(`Пользовательская иконка ${customIcon}`).includes(normalizeIconQuery(iconQuery))
  const iconName = skillIcons.find(item => item.id === selectedIcon)?.name ?? 'Пользовательская иконка'
  const closeIconPicker = () => { setIconOpen(false); iconTrigger.current?.focus() }
  const chooseIcon = (nextIcon: string) => { setIcon(nextIcon); closeIconPicker() }

  const parent = skills.find((item) => item.id === parentId)
  const palette = parent ? skillFamilyColors(skillRoot(parent, skills).color) : rootColors
  const colors = palette.includes(color) ? palette : [...palette, color]

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), description: description.trim(), icon, color, parentId: parentId || null, requiredParentLevel })
  }

  return (
    <Modal title={skill ? 'Настроить навык' : 'Новый навык'} subtitle="Добавьте новую ветку или продолжите существующую" onClose={onClose} onEscape={iconOpen ? closeIconPicker : undefined} wide>
      <form className="form skill-form" onSubmit={submit}>
        <label className="field field--full">
          <span>Название</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Например: Фотография" maxLength={60} />
        </label>
        <label className="field field--full">
          <span>Описание <small>необязательно</small></span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Что означает этот навык для вас?" rows={2} />
        </label>
        <fieldset className="field field--full skill-icon-field">
          <legend>Иконка</legend>
          <button ref={iconTrigger} type="button" className="skill-icon-trigger" aria-label={`Иконка: ${iconName}`} aria-expanded={iconOpen} aria-controls={iconOpen ? iconPanelId : undefined} onClick={() => {
            if (iconOpen) closeIconPicker()
            else { setIconQuery(''); setIconOpen(true) }
          }}><SkillIcon icon={icon} size={24} /><span>{iconName}</span><ChevronDown size={16} aria-hidden="true" /></button>
          {iconOpen && <div id={iconPanelId} className="skill-icon-panel" role="region" aria-label="Выбор иконки навыка">
            <input autoFocus aria-label="Найти иконку" type="search" placeholder="Найти иконку: музыка, спорт…" value={iconQuery} onChange={(event) => setIconQuery(event.target.value)} />
            <div className="icon-picker skill-icon-picker" role="group" aria-label="Иконки навыка">
              {showCustomIcon && <button type="button" className={icon === customIcon ? 'is-selected' : ''} aria-label="Пользовательская иконка" aria-pressed={icon === customIcon} title="Пользовательская иконка" onClick={() => chooseIcon(customIcon!)}><SkillIcon icon={customIcon!} size={23} /></button>}
              {visibleIcons.map(item => <button type="button" aria-label={item.name} title={item.name} aria-pressed={selectedIcon === item.id} className={selectedIcon === item.id ? 'is-selected' : ''} onClick={() => chooseIcon(item.id)} key={item.id}><SkillIcon icon={item.id} size={23} /></button>)}
            </div>
            {visibleIcons.length === 0 && !showCustomIcon && <small role="status">Иконки не найдены</small>}
          </div>}
        </fieldset>
        <fieldset className="field field--full">
          <legend>{parent ? 'Оттенок навыка' : 'Цвет направления'}</legend>
          <div className="color-picker">
            {colors.map((value) => <button type="button" aria-label={`Выбрать цвет ${value}`} aria-pressed={color === value} className={color === value ? 'is-selected' : ''} style={{ background: value }} onClick={() => setColor(value)} key={value} />)}
          </div>
          {parent && <small className="color-picker-note">Оттенки направления «{skillRoot(parent, skills).name}». При выборе родителя предлагается свободный оттенок.</small>}
        </fieldset>
        <label className="field">
          <span>Родительская ветка</span>
          <select value={parentId} onChange={(event) => {
            setParentId(event.target.value)
            setColor(suggestSkillColor(event.target.value || null, skills, skill?.id))
          }}>
            <option value="">От персонажа</option>
            {skills.filter((item) => !excludedParents.has(item.id)).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
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
