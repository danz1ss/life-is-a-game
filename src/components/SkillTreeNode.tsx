import { LockKeyhole, Plus, Target } from 'lucide-react'
import type { Skill, SkillGoal } from '../lib/types'
import { moveSkillWithKey } from '../lib/treeLayout'
import { SkillIcon } from './SkillIcon'
import { ProgressBar } from './Ui'

export function SkillTreeNode({ skill, locked, level, percent, goal, selected, onSelect, onAddChild, onMove }: {
  skill: Skill; locked: boolean; level: number; percent: number; goal: SkillGoal | null; selected: boolean
  onSelect: () => void; onAddChild: () => void; onMove: (position: Skill['position']) => void
}) {
  const color = skill.color
  return <div className="skill-node-label">
    <div className="skill-node-label__top"><span style={{ color, background: `${color}19` }}>{locked ? <LockKeyhole size={22} /> : <SkillIcon icon={skill.icon} size={22} />}</span><small>Ур. {level}</small></div>
    <button type="button" className="skill-node-name nopan" style={{ color }} title={skill.name} aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight" onClick={event => { event.stopPropagation(); onSelect() }} onKeyDown={event => {
      const position = moveSkillWithKey(skill.position, event.key)
      if (position) { event.preventDefault(); event.stopPropagation(); onMove(position) }
    }}>{skill.name}</button>
    {goal && <div className="skill-node-goal"><Target size={10} /><span>{goal.title}</span><em>{goal.progress}%</em></div>}
    <ProgressBar value={percent} color={color} compact />
    {selected && <button type="button" className="skill-node-add-child nodrag nopan" aria-label={`Добавить поднавык к ${skill.name}`} title="Добавить поднавык" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onAddChild() }}><Plus size={18} aria-hidden="true" /></button>}
  </div>
}
