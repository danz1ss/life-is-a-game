import { Background, Controls, MiniMap, ReactFlow, applyNodeChanges, type Edge, type Node, type NodeChange } from '@xyflow/react'
import { ChevronRight, LockKeyhole, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ProgressBar, PageHeader } from '../components/Ui'
import { SkillModal } from '../components/SkillModal'
import { branchColor, skillLevel } from '../lib/game'
import { useStore } from '../lib/store'
import type { Skill, SkillDraft } from '../lib/types'

export function TreePage() {
  const { state, addSkill, updateSkill, deleteSkill, moveSkill } = useStore()
  const [modal, setModal] = useState<Skill | 'new' | null>(null)
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
      return {
        id: skill.id,
        position: branchId === skill.id ? { x: -75, y: 150 } : skill.position,
        data: { label: <SkillNodeLabel skill={skill} color={color} locked={locked} level={progress.level} percent={progress.percent} /> },
        className: `skill-flow-node ${locked ? 'is-locked' : ''}`,
        style: { width: 178, padding: 0, border: `1px solid ${color}45`, background: '#111829', borderRadius: 16, boxShadow: `0 12px 34px ${color}12` },
      } satisfies Node
    })
    return branchId ? skillNodes : [rootNode, ...skillNodes]
  }, [branchId, state.profile.avatar, state.profile.name, state.skills, visibleSkills])

  const [nodes, setNodes] = useState<Node[]>(calculatedNodes)
  useEffect(() => setNodes(calculatedNodes), [calculatedNodes])

  const edges = useMemo<Edge[]>(() => visibleSkills.map((skill) => {
    const parentId = skill.parentId && visibleSkills.some((item) => item.id === skill.parentId) ? skill.parentId : (branchId ? null : 'player-root')
    if (!parentId) return null
    const color = branchColor(skill, state.skills)
    return { id: `${parentId}-${skill.id}`, source: parentId, target: skill.id, animated: skill.xp > 0, style: { stroke: color, strokeWidth: 2, opacity: 0.6 } }
  }).filter(Boolean) as Edge[], [branchId, state.skills, visibleSkills])

  const selected = state.skills.find((skill) => skill.id === selectedId) ?? null
  const save = (draft: SkillDraft) => {
    if (modal === 'new') addSkill(draft)
    else if (modal) updateSkill(modal.id, draft)
    setModal(null)
  }

  return (
    <div className="page tree-page">
      <PageHeader eyebrow="Карта развития" title="Дерево навыков" description="Вся система вашего развития на одной карте. Перетаскивайте узлы и открывайте отдельные ветки." actions={<button className="button button--primary" onClick={() => setModal('new')}><Plus size={18} /> Добавить навык</button>} />
      <div className="branch-tabs">
        <button className={!branchId ? 'is-active' : ''} onClick={() => setBranchId(null)}>Всё дерево</button>
        {rootSkills.map((skill) => <button className={branchId === skill.id ? 'is-active' : ''} onClick={() => setBranchId(skill.id)} key={skill.id}><i style={{ background: skill.color }} />{skill.name}</button>)}
      </div>
      <section className="tree-canvas panel">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes: NodeChange[]) => setNodes((items) => applyNodeChanges(changes, items))}
          onNodeDragStop={(_event, node) => node.id !== 'player-root' && moveSkill(node.id, node.position)}
          onNodeClick={(_event, node) => node.id !== 'player-root' && setSelectedId(node.id)}
          fitView
          minZoom={0.35}
          maxZoom={1.6}
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#26314a" gap={26} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor={(node) => state.skills.find((skill) => skill.id === node.id)?.color ?? '#7c6cf2'} maskColor="rgba(6, 10, 19, .76)" />
        </ReactFlow>
        <div className="tree-hint"><Sparkles size={15} /> Колесо — масштаб · перетаскивание — перемещение карты</div>
        {selected && <SkillDetails skill={selected} skills={state.skills} questCount={state.quests.filter((quest) => quest.skillId === selected.id).length} onClose={() => setSelectedId(null)} onEdit={() => setModal(selected)} onDelete={() => {
          if (window.confirm(`Удалить навык «${selected.name}»? Дочерние навыки станут самостоятельными ветками.`)) { deleteSkill(selected.id); setSelectedId(null) }
        }} />}
      </section>
      {modal && <SkillModal skill={modal === 'new' ? null : modal} skills={state.skills} onSave={save} onClose={() => setModal(null)} />}
    </div>
  )
}

function SkillNodeLabel({ skill, color, locked, level, percent }: { skill: Skill; color: string; locked: boolean; level: number; percent: number }) {
  return <div className="skill-node-label">
    <div className="skill-node-label__top"><span style={{ color, background: `${color}19` }}>{locked ? <LockKeyhole size={17} /> : skill.icon}</span><small>Ур. {level}</small></div>
    <strong>{skill.name}</strong>
    <ProgressBar value={percent} color={color} compact />
  </div>
}

function SkillDetails({ skill, skills, questCount, onClose, onEdit, onDelete }: { skill: Skill; skills: Skill[]; questCount: number; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const progress = skillLevel(skill)
  const parent = skills.find((item) => item.id === skill.parentId)
  const locked = parent ? skillLevel(parent).level < skill.requiredParentLevel : false
  return <aside className="skill-details">
    <button className="icon-button skill-details__close" onClick={onClose}><X size={18} /></button>
    <div className="skill-details__icon" style={{ color: skill.color, background: `${skill.color}18` }}>{skill.icon}</div>
    <span className="eyebrow">{locked ? 'Навык закрыт' : 'Навык открыт'}</span>
    <h2>{skill.name}</h2>
    <p>{skill.description || 'Для этого навыка пока нет описания.'}</p>
    <div className="skill-details__level"><span>Уровень {progress.level}</span><span>{progress.current} / {progress.needed} XP</span></div>
    <ProgressBar value={progress.percent} color={skill.color} />
    <dl><div><dt>Всего опыта</dt><dd>{skill.xp} XP</dd></div><div><dt>Связано квестов</dt><dd>{questCount}</dd></div>{parent && <div><dt>Родитель</dt><dd>{parent.name} <ChevronRight size={13} /></dd></div>}</dl>
    {locked && parent && <div className="locked-note"><LockKeyhole size={16} /> Требуется {skill.requiredParentLevel} уровень навыка «{parent.name}»</div>}
    <div className="skill-details__actions"><button className="button button--secondary" onClick={onEdit}><Pencil size={16} /> Изменить</button><button className="icon-button icon-button--danger" onClick={onDelete}><Trash2 size={17} /></button></div>
  </aside>
}
