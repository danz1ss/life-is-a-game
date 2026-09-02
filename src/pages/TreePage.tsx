import { Background, Controls, MiniMap, ReactFlow, applyNodeChanges, type Edge, type Node, type NodeChange } from '@xyflow/react'
import { CalendarDays, ChevronRight, LockKeyhole, Pause, Pencil, Play, Plus, Sparkles, Target, Trash2, Trophy, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { GoalModal } from '../components/GoalModal'
import { SkillModal } from '../components/SkillModal'
import { PageHeader, ProgressBar } from '../components/Ui'
import { activeGoalForSkill, branchColor, dateLabel, goalCompletionReward, skillLevel } from '../lib/game'
import { useStore } from '../lib/store'
import type { Skill, SkillDraft, SkillGoal, SkillGoalDraft } from '../lib/types'

export function TreePage() {
  const { state, addSkill, updateSkill, deleteSkill, moveSkill, addGoal, updateGoal, deleteGoal, completeGoal } = useStore()
  const [modal, setModal] = useState<Skill | 'new' | null>(null)
  const [goalModal, setGoalModal] = useState<SkillGoal | 'new' | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [branchId, setBranchId] = useState<string | null>(null)
  const rootSkills = state.skills.filter((skill) => !skill.parentId)

  const visibleSkills = useMemo(() => {
    if (!branchId) return state.skills
    const ids = new Set([branchId])
    let changed = true
    while (changed) {
      changed = false
      state.skills.forEach((skill) => {
        if (skill.parentId && ids.has(skill.parentId) && !ids.has(skill.id)) { ids.add(skill.id); changed = true }
      })
    }
    return state.skills.filter((skill) => ids.has(skill.id))
  }, [branchId, state.skills])

  const calculatedNodes = useMemo<Node[]>(() => {
    const rootNode: Node = {
      id: 'player-root', position: { x: -75, y: -90 }, draggable: false,
      data: { label: <div className="tree-root-node"><span>{state.profile.avatar}</span><strong>{state.profile.name}</strong><small>Главный герой</small></div> },
      style: { width: 150, padding: 0, background: 'transparent', border: 0 },
    }
    const skillNodes = visibleSkills.map((skill) => {
      const progress = skillLevel(skill)
      const parent = state.skills.find((item) => item.id === skill.parentId)
      const locked = parent ? skillLevel(parent).level < skill.requiredParentLevel : false
      const color = branchColor(skill, state.skills)
      const goal = activeGoalForSkill(state.goals, skill.id)
      return {
        id: skill.id,
        position: branchId === skill.id ? { x: -75, y: 150 } : skill.position,
        data: { label: <SkillNodeLabel skill={skill} color={color} locked={locked} level={progress.level} percent={progress.percent} goal={goal} /> },
        className: `skill-flow-node ${locked ? 'is-locked' : ''}`,
        style: { width: 188, padding: 0, border: `1px solid ${color}45`, background: '#111829', borderRadius: 16, boxShadow: `0 12px 34px ${color}12` },
      } satisfies Node
    })
    return branchId ? skillNodes : [rootNode, ...skillNodes]
  }, [branchId, state.goals, state.profile.avatar, state.profile.name, state.skills, visibleSkills])

  const [nodes, setNodes] = useState<Node[]>(calculatedNodes)
  useEffect(() => setNodes(calculatedNodes), [calculatedNodes])

  const edges = useMemo<Edge[]>(() => visibleSkills.map((skill) => {
    const parentId = skill.parentId && visibleSkills.some((item) => item.id === skill.parentId) ? skill.parentId : (branchId ? null : 'player-root')
    if (!parentId) return null
    const color = branchColor(skill, state.skills)
    return { id: `${parentId}-${skill.id}`, source: parentId, target: skill.id, animated: skill.xp > 0, style: { stroke: color, strokeWidth: 2, opacity: 0.6 } }
  }).filter(Boolean) as Edge[], [branchId, state.skills, visibleSkills])

  const selected = state.skills.find((skill) => skill.id === selectedId) ?? null
  const selectedGoal = selected ? activeGoalForSkill(state.goals, selected.id) : null
  const completedGoals = selected ? state.goals.filter((goal) => goal.skillId === selected.id && goal.status === 'completed') : []

  const saveSkill = (draft: SkillDraft) => {
    if (modal === 'new') addSkill(draft)
    else if (modal) updateSkill(modal.id, draft)
    setModal(null)
  }

  const saveGoal = (draft: SkillGoalDraft) => {
    if (goalModal === 'new') addGoal(draft)
    else if (goalModal) updateGoal(goalModal.id, draft)
    setGoalModal(null)
  }

  return <div className="page tree-page">
    <PageHeader eyebrow="Карта развития" title="Дерево навыков" description="Выберите навык, определите главную цель и держите перед глазами личный смысл каждой ветки." actions={<button className="button button--primary" onClick={() => setModal('new')}><Plus size={18} /> Добавить навык</button>} />
    <div className="branch-tabs">
      <button className={!branchId ? 'is-active' : ''} onClick={() => setBranchId(null)}>Всё дерево</button>
      {rootSkills.map((skill) => <button className={branchId === skill.id ? 'is-active' : ''} onClick={() => setBranchId(skill.id)} key={skill.id}><i style={{ background: skill.color }} />{skill.name}</button>)}
    </div>
    <section className="tree-canvas panel">
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={(changes: NodeChange[]) => setNodes((items) => applyNodeChanges(changes, items))} onNodeDragStop={(_event, node) => node.id !== 'player-root' && moveSkill(node.id, node.position)} onNodeClick={(_event, node) => node.id !== 'player-root' && setSelectedId(node.id)} fitView minZoom={0.35} maxZoom={1.6} colorMode="dark" proOptions={{ hideAttribution: true }}>
        <Background color="#26314a" gap={26} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeColor={(node) => state.skills.find((skill) => skill.id === node.id)?.color ?? '#7c6cf2'} maskColor="rgba(6, 10, 19, .76)" />
      </ReactFlow>
      <div className="tree-hint"><Sparkles size={15} /> Колесо — масштаб · перетаскивание — перемещение карты</div>
      {selected && <SkillDetails
        skill={selected}
        skills={state.skills}
        goal={selectedGoal}
        completedGoals={completedGoals}
        questCount={state.quests.filter((quest) => quest.skillId === selected.id).length}
        onClose={() => setSelectedId(null)}
        onEdit={() => setModal(selected)}
        onAddGoal={() => setGoalModal('new')}
        onEditGoal={() => selectedGoal && setGoalModal(selectedGoal)}
        onToggleGoalStatus={() => selectedGoal && updateGoal(selectedGoal.id, { status: selectedGoal.status === 'paused' ? 'active' : 'paused' })}
        onCompleteGoal={() => selectedGoal && window.confirm(`Отметить цель «${selectedGoal.title}» достигнутой и получить награду?`) && completeGoal(selectedGoal.id)}
        onDeleteGoal={() => selectedGoal && window.confirm(`Удалить главную цель «${selectedGoal.title}»?`) && deleteGoal(selectedGoal.id)}
        onDelete={() => {
          if (window.confirm(`Удалить навык «${selected.name}»? Дочерние навыки станут самостоятельными ветками.`)) { deleteSkill(selected.id); setSelectedId(null) }
        }}
      />}
    </section>
    {modal && <SkillModal skill={modal === 'new' ? null : modal} skills={state.skills} onSave={saveSkill} onClose={() => setModal(null)} />}
    {goalModal && selected && <GoalModal goal={goalModal === 'new' ? null : goalModal} skill={selected} onSave={saveGoal} onClose={() => setGoalModal(null)} />}
  </div>
}

function SkillNodeLabel({ skill, color, locked, level, percent, goal }: { skill: Skill; color: string; locked: boolean; level: number; percent: number; goal: SkillGoal | null }) {
  return <div className="skill-node-label">
    <div className="skill-node-label__top"><span style={{ color, background: `${color}19` }}>{locked ? <LockKeyhole size={17} /> : skill.icon}</span><small>Ур. {level}</small></div>
    <strong>{skill.name}</strong>
    {goal && <div className="skill-node-goal"><Target size={10} /><span>{goal.title}</span><em>{goal.progress}%</em></div>}
    <ProgressBar value={percent} color={color} compact />
  </div>
}

function SkillDetails({ skill, skills, goal, completedGoals, questCount, onClose, onEdit, onAddGoal, onEditGoal, onToggleGoalStatus, onCompleteGoal, onDeleteGoal, onDelete }: {
  skill: Skill
  skills: Skill[]
  goal: SkillGoal | null
  completedGoals: SkillGoal[]
  questCount: number
  onClose: () => void
  onEdit: () => void
  onAddGoal: () => void
  onEditGoal: () => void
  onToggleGoalStatus: () => void
  onCompleteGoal: () => void
  onDeleteGoal: () => void
  onDelete: () => void
}) {
  const progress = skillLevel(skill)
  const parent = skills.find((item) => item.id === skill.parentId)
  const locked = parent ? skillLevel(parent).level < skill.requiredParentLevel : false
  return <aside className="skill-details skill-details--goal">
    <button className="icon-button skill-details__close" onClick={onClose}><X size={18} /></button>
    <div className="skill-details__icon" style={{ color: skill.color, background: `${skill.color}18` }}>{skill.icon}</div>
    <span className="eyebrow">{locked ? 'Навык закрыт' : 'Навык открыт'}</span>
    <h2>{skill.name}</h2>
    <p>{skill.description || 'Для этого навыка пока нет описания.'}</p>
    <div className="skill-details__level"><span>Уровень {progress.level}</span><span>{progress.current} / {progress.needed} XP</span></div>
    <ProgressBar value={progress.percent} color={skill.color} />

    {goal ? <section className={`active-goal-card ${goal.status === 'paused' ? 'is-paused' : ''}`}>
      <header><span><Target size={14} /> Главная цель</span><button className="icon-button" onClick={onEditGoal}><Pencil size={14} /></button></header>
      <h3>{goal.title}</h3>
      {goal.purpose && <blockquote>«{goal.purpose}»</blockquote>}
      {goal.successCriteria && <p><FlagText />{goal.successCriteria}</p>}
      <div className="goal-progress-line"><span>{goal.status === 'paused' ? 'Приостановлена' : 'Прогресс'}</span><strong>{goal.progress}%</strong></div>
      <ProgressBar value={goal.progress} color={skill.color} />
      {goal.targetDate && <div className="goal-deadline"><CalendarDays size={13} /> До {dateLabel(goal.targetDate)}</div>}
      <div className="goal-card-actions"><button className="button button--ghost" onClick={onToggleGoalStatus}>{goal.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}{goal.status === 'paused' ? 'Продолжить' : 'Пауза'}</button><button className="button button--success" onClick={onCompleteGoal}><Trophy size={14} /> Цель достигнута</button><button className="icon-button icon-button--danger" onClick={onDeleteGoal}><Trash2 size={15} /></button></div>
      <small className="goal-reward-small">Награда: +{goalCompletionReward.xp} XP · +{goalCompletionReward.gold} золота</small>
    </section> : <button className="add-goal-card" onClick={onAddGoal}><span><Target size={20} /></span><strong>Добавить главную цель</strong><small>Зафиксируйте, к чему и зачем вы развиваете этот навык.</small></button>}

    {completedGoals.length > 0 && <div className="completed-goals"><Trophy size={14} /><span><strong>Достигнуто целей: {completedGoals.length}</strong><small>{completedGoals.at(-1)?.title}</small></span></div>}
    <dl><div><dt>Всего опыта</dt><dd>{skill.xp} XP</dd></div><div><dt>Связано квестов</dt><dd>{questCount}</dd></div>{parent && <div><dt>Родитель</dt><dd>{parent.name} <ChevronRight size={13} /></dd></div>}</dl>
    {locked && parent && <div className="locked-note"><LockKeyhole size={16} /> Требуется {skill.requiredParentLevel} уровень навыка «{parent.name}»</div>}
    <div className="skill-details__actions"><button className="button button--secondary" onClick={onEdit}><Pencil size={16} /> Изменить навык</button><button className="icon-button icon-button--danger" onClick={onDelete}><Trash2 size={17} /></button></div>
  </aside>
}

function FlagText() {
  return <span className="goal-criteria-icon">✓</span>
}
