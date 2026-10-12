import { ArrowRight } from 'lucide-react'
import { useId, type CSSProperties } from 'react'
import { SkillIcon } from '../SkillIcon'
import { ProgressBar } from '../Ui'
import { skillLevel } from '../../lib/game'
import type { Skill } from '../../lib/types'
import './skills.css'

export interface SkillsPanelProps {
  skills: Skill[]
  onSelect: (skill: Skill) => void
  onOpenTree?: () => void
}

/** Show every supplied skill in the existing order, using actual progression values. */
export function SkillsPanel({ skills, onSelect, onOpenTree }: SkillsPanelProps) {
  const headingId = useId()

  return (
    <section className="g-skills" aria-labelledby={headingId}>
      <header className="g-skills-header">
        <h2 id={headingId}>Мои навыки</h2>
        {onOpenTree && <button type="button" className="g-skills-tree" onClick={onOpenTree} aria-label="Открыть дерево навыков" title="Дерево навыков"><ArrowRight size={18} aria-hidden="true" /></button>}
      </header>
      {skills.length > 0 ? (
        <ul className="g-skills-list">
          {skills.map(skill => {
            const progress = skillLevel(skill)
            return (
              <li key={skill.id} data-skill-id={skill.id} style={{ '--g-skill-color': skill.color } as CSSProperties}>
                <button type="button" className="g-skill-overview" onClick={() => onSelect(skill)} aria-label={`Открыть навык «${skill.name}», уровень ${progress.level}, ${progress.current} из ${progress.needed} XP`}>
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
      ) : <p className="g-skills-empty">Навыков пока нет. Добавьте направление в дереве навыков.</p>}
    </section>
  )
}
