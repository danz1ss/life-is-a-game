import { Background, Controls, MiniMap, ReactFlow, applyNodeChanges, type Edge, type Node, type NodeChange, type ReactFlowInstance } from '@xyflow/react'
import { CalendarDays, ChevronRight, LockKeyhole, Pause, Pencil, Play, Plus, Sparkles, Target, Trash2, Trophy, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { CharacterPortrait } from '../components/CharacterPortrait'
import { GoalModal } from '../components/GoalModal'
import { SkillModal } from '../components/SkillModal'
import { SkillIcon } from '../components/SkillIcon'
import { SkillTreeNode } from '../components/SkillTreeNode'
import { PageHeader, ProgressBar } from '../components/Ui'
import { activeGoalForSkill, dateLabel, goalCompletionReward, levelProgress, skillLevel } from '../lib/game'
import { descendantIds, fromTreePosition, selectionForBranch, skillAncestorPath, toTreePosition, treeHeroWidth, treeNodeWidth, viewportForVisibleNode } from '../lib/treeLayout'
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
  const [viewportReady, setViewportReady] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [focusRequest, setFocusRequest] = useState(0)
  const motionDuration = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180
  const skillsById = useMemo(() => new Map(state.skills.map((skill) => [skill.id, skill])), [state.skills])
  const activeGoalsBySkill = useMemo(() => {
    const goals = new Map<string, SkillGoal>()
    for (const goal of state.goals) if (goal.status !== 'completed' && !goals.has(goal.skillId)) goals.set(goal.skillId, goal)
    return goals
  }, [state.goals])
  const rootSkills = state.skills.filter((skill) => !skill.parentId)
  const [heroPosition] = useState(() => ({
    x: rootSkills.length ? rootSkills.reduce((sum, skill) => sum + toTreePosition(skill.position).x + treeNodeWidth / 2, 0) / rootSkills.length - treeHeroWidth / 2 : -treeHeroWidth / 2,
    y: rootSkills.length ? Math.min(...rootSkills.map((skill) => toTreePosition(skill.position).y)) - 300 : -130,
  }))
  const { x: heroX, y: heroY } = heroPosition

  // Fit only once after ReactFlow has measured its initial nodes, before user focus.
  useEffect(() => {
    if (!flow) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const initialize = () => {
      if (!flow.getNodes().length || !flow.getNodes().every(node => flow.getInternalNode(node.id)?.measured.width)) {
        timer = setTimeout(initialize, 16)
        return
      }
      void flow.fitView({ padding: .1, minZoom: .8, maxZoom: 1, duration: 0 }).then(() => { if (!cancelled) setViewportReady(true) })
    }
    timer = setTimeout(initialize, 16)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [flow])

  const visibleSkills = useMemo(() => {
    if (!branchId) return state.skills
    const ids = descendantIds(state.skills, branchId)
    return state.skills.filter((skill) => ids.has(skill.id))
  }, [branchId, state.skills])

  const selected = visibleSkills.find(skill => skill.id === selectedId) ?? null
  useEffect(() => {
    if (selectedId && !visibleSkills.some(skill => skill.id === selectedId)) setSelectedId(null)
  }, [selectedId, visibleSkills])
  const selectSkill = useCallback((id: string) => setSelectedId(id), [])
  const openChild = useCallback((id: string) => { setNewParentId(id); setModal('new') }, [])
  const changeBranch = (id: string | null) => {
    setBranchId(id)
    setSelectedId(selectionForBranch(state.skills, selectedId, id))
    setFocusRequest(request => request + 1)
  }
  const pathEdges = useMemo(() => {
    const path = skillAncestorPath(state.skills, selected?.id ?? null, branchId)
    return new Set(path.slice(1).map((id, index) => `${path[index]}-${id}`))
  }, [state.skills, selected?.id, branchId])

  // Only a selection, creation, branch change or actual canvas resize requests focus.
  // Edits, XP changes and node position updates do not reset the user's viewport.
  useEffect(() => {
    if (!flow || !viewportReady || !selectedId) return
    let timer: ReturnType<typeof setTimeout>
    let attempts = 0
    const focus = () => {
      const canvas = canvasRef.current
      const element = canvas?.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(selectedId)}"]`)
      const node = flow.getNode(selectedId)
      if (!canvas || !element?.classList.contains('is-selected') || !node || !flow.viewportInitialized) {
        if (++attempts < 50) timer = setTimeout(focus, 16)
        return
      }
      const map = canvas.getBoundingClientRect()
      const panel = canvas.parentElement?.querySelector<HTMLElement>(':scope > .skill-details')
      const panelBounds = panel?.getBoundingClientRect()
      const panelOverMap = panelBounds && panelBounds.left < map.right && panelBounds.right > map.left && panelBounds.top < map.bottom && panelBounds.bottom > map.top
      const free = { left: map.left + 20, top: map.top + 20, right: panelOverMap ? panelBounds.left - 16 : map.right - 20, bottom: map.bottom - 48 }
      const size = element.getBoundingClientRect()
      const position = flow.flowToScreenPosition(node.position)
      const viewport = flow.getViewport()
      const next = viewportForVisibleNode({ left: position.x, top: position.y, right: position.x + size.width, bottom: position.y + size.height }, free, viewport)
      if (next !== viewport) void flow.setViewport(next, { duration: motionDuration(), interpolate: 'linear' })
    }
    timer = setTimeout(focus, 32)
    return () => clearTimeout(timer)
  }, [flow, viewportReady, selectedId, focusRequest])
  useEffect(() => {
    if (!canvasRef.current) return
    let initialized = false
    const observer = new ResizeObserver(() => {
      if (initialized) setFocusRequest(request => request + 1)
      initialized = true
    })
    observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [])

  const calculatedNodes = useMemo<Node[]>(() => {
    const rootNode: Node = {
      id: 'player-root', position: { x: heroX, y: heroY }, draggable: false, focusable: false,
      data: { label: <div className="tree-root-node"><span>{!state.profile.character && !['⚔', '⚔️'].includes(state.profile.avatar) ? state.profile.avatar : <CharacterPortrait appearance={state.profile.character} level={Math.max(state.levelRewards.highestLevel, levelProgress(state.profile.totalXp).level)} variant="bust" />}</span><strong>{state.profile.name}</strong><small>Главный герой · Уровень {levelProgress(state.profile.totalXp).level}</small></div> },
      style: { width: treeHeroWidth, padding: 0, background: 'transparent', border: 0 },
    }
    const skillNodes = visibleSkills.map((skill) => {
      const progress = skillLevel(skill)
      const parent = skill.parentId ? skillsById.get(skill.parentId) : undefined
      const locked = parent ? skillLevel(parent).level < skill.requiredParentLevel : false
      const color = skill.color
      const goal = activeGoalsBySkill.get(skill.id) ?? null
      return {
        id: skill.id,
        position: toTreePosition(skill.position),
        focusable: false, selected: selected?.id === skill.id,
        data: { label: <SkillTreeNode skill={skill} locked={locked} level={progress.level} percent={progress.percent} goal={goal} selected={selected?.id === skill.id} onSelect={() => selectSkill(skill.id)} onAddChild={() => openChild(skill.id)} onMove={position => moveSkill(skill.id, position)} /> },
        className: `skill-flow-node ${locked ? 'is-locked' : ''} ${selected?.id === skill.id ? 'is-selected' : ''}`,
        style: { width: treeNodeWidth, padding: 0, border: '1px solid var(--tree-line)', borderTop: !skill.parentId ? `2px solid ${color}` : undefined, background: 'var(--tree-node)', borderRadius: 13, boxShadow: '0 8px 22px #00000020', '--skill-node-color': color } as CSSProperties,
      } satisfies Node
    })
    return branchId ? skillNodes : [rootNode, ...skillNodes]
  }, [branchId, heroX, heroY, activeGoalsBySkill, state.profile.avatar, state.profile.character, state.profile.name, state.profile.totalXp, skillsById, visibleSkills, selected?.id, selectSkill, openChild, moveSkill])

  const [nodes, setNodes] = useState<Node[]>(calculatedNodes)
  useEffect(() => setNodes(calculatedNodes), [calculatedNodes])

  const edges = useMemo<Edge[]>(() => {
    const visibleIds = new Set(visibleSkills.map((skill) => skill.id))
    return visibleSkills.map<Edge | null>((skill) => {
      const parentId = skill.parentId && visibleIds.has(skill.parentId) ? skill.parentId : (branchId ? null : 'player-root')
      if (!parentId) return null
      const color = skill.color
      const id = `${parentId}-${skill.id}`
      const highlighted = pathEdges.has(id)
      return { id, source: parentId, target: skill.id, animated: highlighted ? false : skill.xp > 0, className: highlighted ? 'is-path-highlighted' : undefined, style: { stroke: color, strokeWidth: highlighted ? 3 : 2, opacity: highlighted ? 1 : 0.6 } }
    }).filter((edge): edge is Edge => edge !== null)
  }, [branchId, visibleSkills, pathEdges])

  const selectedGoal = selected ? activeGoalForSkill(state.goals, selected.id) : null
  const completedGoals = selected ? state.goals.filter((goal) => goal.skillId === selected.id && goal.status === 'completed') : []

  const saveSkill = (draft: SkillDraft) => {
    if (modal === 'new') {
      const id = addSkill(draft)
      if (branchId && (!draft.parentId || !descendantIds(state.skills, branchId).has(draft.parentId))) setBranchId(null)
      setSelectedId(id)
    }
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
      <button className={!branchId ? 'is-active' : ''} onClick={() => changeBranch(null)}>Всё дерево</button>
      {rootSkills.map((skill) => <button className={branchId === skill.id ? 'is-active' : ''} onClick={() => changeBranch(skill.id)} key={skill.id}><i style={{ background: skill.color }} />{skill.name}</button>)}
      <span className="tree-view-actions"><button onClick={() => { void flow?.fitView({ padding: .12, minZoom: .25, maxZoom: 1, duration: motionDuration() }).then(() => setFocusRequest(request => request + 1)) }}>Показать всё</button><button onClick={() => { setSelectedId(null); setBranchId(null); void flow?.setCenter(heroX + treeHeroWidth / 2, heroY + 240, { zoom: flow.getZoom(), duration: motionDuration() }) }}>К герою</button></span>
    </div>
    <section className="tree-canvas panel">
      <div className="tree-map" ref={canvasRef} data-viewport-ready={viewportReady}>
      <ReactFlow nodes={nodes} edges={edges} nodesConnectable={false} edgesReconnectable={false} autoPanOnNodeFocus={false} deleteKeyCode={null} onInit={setFlow} onNodesChange={(changes: NodeChange[]) => setNodes((items) => applyNodeChanges(changes, items))} onNodeDragStop={(_event, node) => node.id !== 'player-root' && moveSkill(node.id, fromTreePosition(node.position))} onNodeClick={(_event, node) => node.id !== 'player-root' && selectSkill(node.id)} minZoom={0.25} maxZoom={1.6} colorMode="dark" proOptions={{ hideAttribution: true }}>
        <Background color="var(--tree-dot)" gap={26} size={1} />
        <Controls showInteractive={false} fitViewOptions={{ padding: .12, minZoom: .25, maxZoom: 1 }} onFitView={() => setFocusRequest(request => request + 1)} />
        {!selected && <MiniMap position="top-right" pannable zoomable nodeColor={(node) => skillsById.get(node.id)?.color ?? '#dfe2ec'} maskColor="var(--tree-minimap-mask)" />}
      </ReactFlow>
      <div className="tree-hint"><Sparkles size={15} /> Колесо — масштаб · перетаскивание — перемещение карты</div>
      </div>
      {selected && <SkillDetails
        skill={selected}
        skills={state.skills}
        goal={selectedGoal}
        completedGoals={completedGoals}
        questCount={state.quests.filter((quest) => quest.skillId === selected.id).length}
        onClose={() => setSelectedId(null)}
        onEdit={() => setModal(selected)}
        onAddChild={() => openChild(selected.id)}
        onAddGoal={() => setGoalModal('new')}
        onEditGoal={() => selectedGoal && setGoalModal(selectedGoal)}
        onToggleGoalStatus={() => selectedGoal && updateGoal(selectedGoal.id, { status: selectedGoal.status === 'paused' ? 'active' : 'paused' })}
        onCompleteGoal={() => selectedGoal && window.confirm(`Отметить цель «${selectedGoal.title}» достигнутой и получить награду?`) && completeGoal(selectedGoal.id)}
        onDeleteGoal={() => selectedGoal && window.confirm(`Удалить главную цель «${selectedGoal.title}»?`) && deleteGoal(selectedGoal.id)}
        onDelete={() => {
          if (window.confirm(`Удалить навык «${selected.name}»? Дочерние навыки станут самостоятельными ветками.`)) { deleteSkill(selected.id); setSelectedId(null); if (branchId === selected.id) setBranchId(null) }
        }}
      />}
    </section>
    {modal && <SkillModal skill={modal === 'new' ? null : modal} skills={state.skills} initialParentId={modal === 'new' ? newParentId : ''} onSave={saveSkill} onClose={() => setModal(null)} />}
    {goalModal && selected && <GoalModal goal={goalModal === 'new' ? null : goalModal} skill={selected} onSave={saveGoal} onClose={() => setGoalModal(null)} />}
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
      <small className="goal-reward-small">За цель: +{goalCompletionReward.xp} XP · +{goalCompletionReward.gold} монет</small>
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
