import { Background, Controls, MiniMap, ReactFlow, applyNodeChanges, type Edge, type Node, type NodeChange, type ReactFlowInstance } from '@xyflow/react'
import { CalendarDays, ChevronRight, LockKeyhole, Pause, Pencil, Play, Plus, Sparkles, Swords, Target, Trash2, Trophy, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GoalModal } from '../components/GoalModal'
import { SkillModal } from '../components/SkillModal'
import { SkillIcon } from '../components/SkillIcon'
import { PageHeader, ProgressBar } from '../components/Ui'
import { activeGoalForSkill, dateLabel, goalCompletionReward, levelProgress, skillLevel } from '../lib/game'
import { fromTreePosition, toTreePosition, treeHeroWidth, treeNodeWidth } from '../lib/treeLayout'
import { useStore } from '../lib/store'
import type { Skill, SkillDraft, SkillGoal, SkillGoalDraft } from '../lib/types'

export function TreePage({ initialSelectedId = null }: { initialSelectedId?: string | null }) {
  const { state, addSkill, updateSkill, deleteSkill, moveSkill, addGoal, updateGoal, deleteGoal, completeGoal } = useStore()
  const [modal, setModal] = useState<Skill | 'new' | null>(null)
  const [goalModal, setGoalModal] = useState<SkillGoal | 'new' | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId)
  const [branchId, setBranchId] = useState<string | null>(null)
  const [newParentId, setNewParentId] = useState('')
  const [flow, setFlow] = useState<ReactFlowInstance | null>(null)
  const focusHero = useRef(false)
  const rootSkills = state.skills.filter((skill) => !skill.parentId)
  const heroX = rootSkills.length ? rootSkills.reduce((sum, skill) => sum + toTreePosition(skill.position).x + treeNodeWidth / 2, 0) / rootSkills.length - treeHeroWidth / 2 : -treeHeroWidth / 2
  const heroY = rootSkills.length ? Math.min(...rootSkills.map((skill) => toTreePosition(skill.position).y)) - 300 : -130

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (focusHero.current) { focusHero.current = false; void flow?.setCenter(heroX + treeHeroWidth / 2, heroY + 240, { zoom: 1, duration: 300 }) }
      else void flow?.fitView({ padding: .1, minZoom: .8, maxZoom: 1, duration: 250 })
    }, 100)
    return () => window.clearTimeout(timer)
  }, [branchId, flow])

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
      id: 'player-root', position: { x: heroX, y: heroY }, draggable: false,
      data: { label: <div className="tree-root-node"><span>{['⚔', '⚔️'].includes(state.profile.avatar) ? <Swords size={40} /> : state.profile.avatar}</span><strong>{state.profile.name}</strong><small>Главный герой · Уровень {levelProgress(state.profile.totalXp).level}</small></div> },
      style: { width: treeHeroWidth, padding: 0, background: 'transparent', border: 0 },
    }
    const skillNodes = visibleSkills.map((skill) => {
      const progress = skillLevel(skill)
      const parent = state.skills.find((item) => item.id === skill.parentId)
      const locked = parent ? skillLevel(parent).level < skill.requiredParentLevel : false
      const color = skill.color
      const goal = activeGoalForSkill(state.goals, skill.id)
      return {
        id: skill.id,
        position: toTreePosition(skill.position),
        data: { label: <SkillNodeLabel skill={skill} color={color} locked={locked} level={progress.level} percent={progress.percent} goal={goal} /> },
        className: `skill-flow-node ${locked ? 'is-locked' : ''}`,
        style: { width: treeNodeWidth, padding: 0, border: '1px solid var(--tree-line)', borderTop: !skill.parentId ? `2px solid ${color}` : undefined, background: 'var(--tree-node)', borderRadius: 13, boxShadow: '0 8px 22px #00000020' },
      } satisfies Node
    })
    return branchId ? skillNodes : [rootNode, ...skillNodes]
  }, [branchId, heroX, heroY, state.goals, state.profile.avatar, state.profile.name, state.profile.totalXp, state.skills, visibleSkills])

  const [nodes, setNodes] = useState<Node[]>(calculatedNodes)
  useEffect(() => setNodes(calculatedNodes), [calculatedNodes])

  const edges = useMemo<Edge[]>(() => visibleSkills.map((skill) => {
    const parentId = skill.parentId && visibleSkills.some((item) => item.id === skill.parentId) ? skill.parentId : (branchId ? null : 'player-root')
    if (!parentId) return null
    const color = skill.color
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
    <PageHeader eyebrow="Карта развития" title="Дерево навыков" description="Выберите навык, определите главную цель и держите перед глазами личный смысл каждой ветки." actions={<button className="button button--primary" onClick={() => { setNewParentId(''); setModal('new') }}><Plus size={18} /> Добавить навык</button>} />
    <div className="branch-tabs">
      <button className={!branchId ? 'is-active' : ''} onClick={() => setBranchId(null)}>Всё дерево</button>
      {rootSkills.map((skill) => <button className={branchId === skill.id ? 'is-active' : ''} onClick={() => setBranchId(skill.id)} key={skill.id}><i style={{ background: skill.color }} />{skill.name}</button>)}
      <span className="tree-view-actions"><button onClick={() => { void flow?.fitView({ padding: .12, minZoom: .25, maxZoom: 1, duration: 300 }) }}>Показать всё</button><button onClick={() => { setSelectedId(null); if (branchId) { focusHero.current = true; setBranchId(null) } else void flow?.setCenter(heroX + treeHeroWidth / 2, heroY + 240, { zoom: 1, duration: 300 }) }}>К герою</button></span>
    </div>
    <section className="tree-canvas panel">
      <ReactFlow nodes={nodes} edges={edges} onInit={setFlow} onNodesChange={(changes: NodeChange[]) => setNodes((items) => applyNodeChanges(changes, items))} onNodeDragStop={(_event, node) => node.id !== 'player-root' && moveSkill(node.id, fromTreePosition(node.position))} onNodeClick={(_event, node) => node.id !== 'player-root' && setSelectedId(node.id)} fitView fitViewOptions={{ padding: .1, minZoom: .8, maxZoom: 1 }} minZoom={0.25} maxZoom={1.6} colorMode="dark" proOptions={{ hideAttribution: true }}>
        <Background color="var(--tree-dot)" gap={26} size={1} />
        <Controls showInteractive={false} fitViewOptions={{ padding: .12, minZoom: .25, maxZoom: 1 }} />
        {!selected && <MiniMap position="top-right" pannable zoomable nodeColor={(node) => state.skills.find((skill) => skill.id === node.id)?.color ?? '#dfe2ec'} maskColor="var(--tree-minimap-mask)" />}
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
        onAddChild={() => { setNewParentId(selected.id); setModal('new') }}
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
    {modal && <SkillModal skill={modal === 'new' ? null : modal} skills={state.skills} initialParentId={modal === 'new' ? newParentId : ''} onSave={saveSkill} onClose={() => setModal(null)} />}
    {goalModal && selected && <GoalModal goal={goalModal === 'new' ? null : goalModal} skill={selected} onSave={saveGoal} onClose={() => setGoalModal(null)} />}
  </div>
}

function SkillNodeLabel({ skill, color, locked, level, percent, goal }: { skill: Skill; color: string; locked: boolean; level: number; percent: number; goal: SkillGoal | null }) {
  return <div className="skill-node-label">
    <div className="skill-node-label__top"><span style={{ color, background: `${color}19` }}>{locked ? <LockKeyhole size={22} /> : <SkillIcon icon={skill.icon} size={22} />}</span><small>Ур. {level}</small></div>
    <strong style={{ color }}>{skill.name}</strong>
    {goal && <div className="skill-node-goal"><Target size={10} /><span>{goal.title}</span><em>{goal.progress}%</em></div>}
    <ProgressBar value={percent} color={color} compact />
  </div>
}

function SkillDetails({ skill, skills, goal, completedGoals, questCount, onClose, onEdit, onAddChild, onAddGoal, onEditGoal, onToggleGoalStatus, onCompleteGoal, onDeleteGoal, onDelete }: {
  skill: Skill
  skills: Skill[]
  goal: SkillGoal | null
  completedGoals: SkillGoal[]
  questCount: number
  onClose: () => void
  onEdit: () => void
  onAddChild: () => void
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
    <div className="skill-details__icon" style={{ color: skill.color, background: `${skill.color}18` }}><SkillIcon icon={skill.icon} size={26} /></div>
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
    <button className="button button--ghost skill-add-child" onClick={onAddChild}><Plus size={16} /> Добавить поднавык</button>
  </aside>
}

function FlagText() {
  return <span className="goal-criteria-icon">✓</span>
}
