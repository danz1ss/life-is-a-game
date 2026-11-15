import { ArrowRight, Check, Pin } from 'lucide-react'
import { useId, useState, type CSSProperties } from 'react'
import { SkillIcon } from '../SkillIcon'
import { Modal, ProgressBar } from '../Ui'
import { skillLevel } from '../../lib/game'
import type { Skill } from '../../lib/types'
import './skills.css'

export interface SkillsPanelProps {
  skills: Skill[]
  focusSkillId?: string | null
  onChangeFocus: (id: string | null) => void
  onSelect: (skill: Skill) => void
  onOpenTree?: () => void
}

export function SkillsPanel({ skills, focusSkillId, onChangeFocus, onSelect, onOpenTree }: SkillsPanelProps) {
  const headingId = useId()
  const [pickerOpen, setPickerOpen] = useState(false)
  const focus = skills.find(skill => skill.id === focusSkillId)
  const orderedSkills = focus ? [focus, ...skills.filter(skill => skill !== focus)] : skills
  const chooseFocus = (id: string | null) => {
    onChangeFocus(id)
    setPickerOpen(false)
  }

  return (
    <section className="g-skills" aria-labelledby={headingId}>
      <header className="g-skills-header">
        <h2 id={headingId}>Мои навыки</h2>
        <div className="g-skills-actions">
          {skills.length > 0 && <button type="button" className="g-skills-focus-trigger" aria-haspopup="dialog" onClick={() => setPickerOpen(true)}>Выбрать фокус</button>}
          {onOpenTree && <button type="button" className="g-skills-tree" onClick={onOpenTree} aria-label="Открыть дерево навыков" title="Дерево навыков"><ArrowRight size={18} aria-hidden="true" /></button>}
        </div>
      </header>
      {skills.length > 0 ? (
        <ul className="g-skills-list">
          {orderedSkills.map(skill => {
            const progress = skillLevel(skill)
            const isFocus = skill === focus
            return (
              <li key={skill.id} className={isFocus ? 'g-skill-focus' : undefined} data-skill-id={skill.id} style={{ '--g-skill-color': skill.color } as CSSProperties}>
                <button type="button" className="g-skill-overview" onClick={() => onSelect(skill)} aria-label={`${isFocus ? 'Главный навык. ' : ''}Открыть навык «${skill.name}», уровень ${progress.level}, ${progress.current} из ${progress.needed} XP`}>
                  {isFocus && <span className="g-skill-focus-label"><Pin size={14} aria-hidden="true" />Главный навык</span>}
                  <span className="g-skill-name"><span className="g-skill-icon"><SkillIcon icon={skill.icon} size={20} /></span><strong>{skill.name}</strong></span>
                  <span className="g-skill-meta"><span>Ур. {progress.level}</span><span>{progress.current}/{progress.needed} XP</span></span>
                </button>
                {/* The bar occupies the button's reserved space, while remaining a semantic sibling. */}
                <span className="g-skill-progress" role="progressbar" aria-label={`Опыт навыка «${skill.name}»`} aria-valuemin={0} aria-valuemax={progress.needed} aria-valuenow={progress.current} aria-valuetext={`${progress.current} из ${progress.needed} XP до уровня ${progress.level + 1}`}>
                  <ProgressBar value={progress.percent} color={skill.color} compact />
                </span>
              </li>
            )
          })}
        </ul>
      ) : <p className="g-skills-empty">Поднавыков пока нет. Добавьте поднавык в дереве.</p>}
      {pickerOpen && <Modal title="Выбрать фокус" onClose={() => setPickerOpen(false)}>
        <ul className="g-skills-picker">
          {skills.map(skill => <li key={skill.id}>
            <button type="button" className="g-skills-picker-option" data-focus-id={skill.id}
              aria-pressed={skill === focus} data-modal-autofocus={skill === (focus ?? skills[0]) ? '' : undefined}
              onClick={() => chooseFocus(skill.id)}>
              <span className="g-skill-icon" style={{ color: skill.color }}><SkillIcon icon={skill.icon} size={20} /></span>
              <span>{skill.name}</span>
              {skill === focus && <Check size={16} aria-hidden="true" />}
            </button>
          </li>)}
        </ul>
        {focus && <button type="button" className="button button--ghost g-skills-focus-clear" onClick={() => chooseFocus(null)}>Снять фокус</button>}
      </Modal>}
    </section>
  )
}
