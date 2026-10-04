import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GripVertical } from 'lucide-react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import type { Quest } from '../../lib/types'
import './reorder.css'

type Destination = { id: string; placement: 'before' | 'after'; top: number }
type Gesture = { id: string; pointerId: number; startY: number; startX: number; startScroll: number; scroller: HTMLElement | null; x: number; y: number; started: boolean; handle: HTMLButtonElement; destination: Destination | null }

function scrollContainer(element: HTMLElement): HTMLElement | null {
  for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    if (/(auto|scroll|overlay)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) return parent
  }
  return null
}
const scrollOffset = (gesture: Gesture) => gesture.scroller?.scrollTop ?? window.scrollY
export function ReorderableQuestList({ quests, renderCard, onMove }: { quests: Quest[]; renderCard: (quest: Quest) => ReactNode; onMove: (source: string, target: string, placement: 'before' | 'after') => void }) {
  const list = useRef<HTMLUListElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const frame = useRef<number>(0)
  const beforePositions = useRef<Map<string, number> | null>(null)
  const [drag, setDrag] = useState<{ id: string; offset: number; destination: Destination | null } | null>(null)
  const signature = quests.map(quest => quest.id).join('|')
  const rows = () => [...(list.current?.querySelectorAll<HTMLElement>(':scope > [data-reorder-id]') ?? [])]
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  const rememberPositions = (source?: string, offset = 0) => { beforePositions.current = new Map(rows().map(row => [row.dataset.reorderId!, row.getBoundingClientRect().top + (row.dataset.reorderId === source ? offset : 0)])) }
  useLayoutEffect(() => {
    if (!beforePositions.current) return
    if (!reducedMotion()) for (const row of rows()) {
      const before = beforePositions.current.get(row.dataset.reorderId!), after = row.getBoundingClientRect().top
      if (before !== undefined && Math.abs(before - after) > .5) row.animate([{ transform: `translateY(${before - after}px)` }, { transform: 'translateY(0)' }], { duration: 240, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
    }
    beforePositions.current = null
  }, [signature])
  const update = () => {
    const current = gesture.current, root = list.current
    if (!current || !root) return
    const bounds = root.getBoundingClientRect(), others = rows().filter(row => row.dataset.reorderId !== current.id)
    let destination: Destination | null = null
    if (current.started && current.x >= bounds.left - 24 && current.x <= bounds.right + 24 && current.y >= bounds.top - 48 && current.y <= bounds.bottom + 48 && others.length) {
      const next = others.find(row => { const r = row.getBoundingClientRect(); return current.y < r.top + r.height / 2 })
      const target = next ?? others[others.length - 1], rect = target.getBoundingClientRect()
      destination = { id: target.dataset.reorderId!, placement: next ? 'before' : 'after', top: (next ? rect.top - 6 : rect.bottom + 6) - bounds.top }
    }
    current.destination = destination
    setDrag({ id: current.id, offset: current.started ? current.y - current.startY + scrollOffset(current) - current.startScroll : 0, destination })
  }
  const stop = (commit: boolean) => {
    const current = gesture.current
    if (!current) return
    const destination = current.destination
    if (commit && current.started && destination) {
      const ids = quests.map(quest => quest.id).filter(id => id !== current.id)
      ids.splice(ids.indexOf(destination.id) + (destination.placement === 'after' ? 1 : 0), 0, current.id)
      if (ids.join('|') !== signature) { rememberPositions(current.id, current.y - current.startY + scrollOffset(current) - current.startScroll); onMove(current.id, destination.id, destination.placement) }
    }
    gesture.current = null; cancelAnimationFrame(frame.current); setDrag(null); document.body.classList.remove('g-is-reordering')
    if (current.handle.hasPointerCapture(current.pointerId)) current.handle.releasePointerCapture(current.pointerId)
    current.handle.focus({ preventScroll: true })
  }
  const autoScroll = () => {
    const current = gesture.current, bounds = list.current?.getBoundingClientRect()
    if (!current) return
    if (current.started && bounds && current.x >= bounds.left - 24 && current.x <= bounds.right + 24) {
      const rect = current.scroller?.getBoundingClientRect()
      const top = Math.max(0, rect ? rect.top + current.scroller!.clientTop : 0)
      const bottom = Math.min(innerHeight, rect ? rect.top + current.scroller!.clientTop + current.scroller!.clientHeight : innerHeight)
      const speed = current.y < top + 56 && bounds.top < top + 56 ? -Math.min(12, (top + 56 - current.y) / 4) : current.y > bottom - 56 && bounds.bottom > bottom - 56 ? Math.min(12, (current.y - bottom + 56) / 4) : 0
      if (speed) {
        const before = scrollOffset(current)
        if (current.scroller) current.scroller.scrollTop += speed
        else window.scrollBy(0, speed)
        if (scrollOffset(current) !== before) update()
      }
    }
    frame.current = requestAnimationFrame(autoScroll)
  }
  const start = (event: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (event.button !== 0 || !event.isPrimary || quests.length < 2) return
    event.preventDefault(); rows().forEach(row => row.getAnimations().forEach(animation => animation.cancel())); beforePositions.current = null
    event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId)
    const scroller = scrollContainer(event.currentTarget)
    gesture.current = { id, pointerId: event.pointerId, startY: event.clientY, startX: event.clientX, startScroll: scroller?.scrollTop ?? window.scrollY, scroller, x: event.clientX, y: event.clientY, started: false, handle: event.currentTarget, destination: null }
    document.body.classList.add('g-is-reordering'); update(); frame.current = requestAnimationFrame(autoScroll)
  }
  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    current.x = event.clientX; current.y = event.clientY
    if (Math.hypot(current.x - current.startX, current.y - current.startY) > 5) current.started = true
    update()
  }
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape' && gesture.current) { event.preventDefault(); event.stopPropagation(); stop(false) } }
    const blur = () => stop(false)
    document.addEventListener('keydown', cancel, true)
    window.addEventListener('blur', blur)
    return () => { document.removeEventListener('keydown', cancel, true); window.removeEventListener('blur', blur); cancelAnimationFrame(frame.current); const active = gesture.current; gesture.current = null; if (active?.handle.hasPointerCapture(active.pointerId)) active.handle.releasePointerCapture(active.pointerId); document.body.classList.remove('g-is-reordering') }
  }, [signature])
  return <ul className={`g-list g-reorder-list ${drag ? 'is-reordering' : ''}`} ref={list}>
    {quests.map((quest, index) => <li key={quest.id} className={`g-quest ${quest.isMain ? 'is-main' : ''} ${drag?.id === quest.id ? 'is-dragging' : ''}`} data-reorder-id={quest.id} aria-label={quest.title} style={{ '--drag-y': `${drag?.id === quest.id ? drag.offset : 0}px` } as CSSProperties}>
      {renderCard(quest)}<button type="button" className="g-quest-handle" aria-label={`Переставить задачу: ${quest.title}`} aria-pressed={drag?.id === quest.id} aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown" title="Перетащить за ⋮⋮ · Alt+↑ / Alt+↓" onPointerDown={event => start(event, quest.id)} onPointerMove={move} onPointerUp={() => stop(true)} onPointerCancel={() => stop(false)} onLostPointerCapture={() => { if (gesture.current) stop(false) }} onKeyDown={event => {
        if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
        event.preventDefault(); const other = quests[index + (event.key === 'ArrowUp' ? -1 : 1)]
        if (other) { rememberPositions(); onMove(quest.id, other.id, event.key === 'ArrowUp' ? 'before' : 'after') }
      }}><GripVertical size={18} aria-hidden="true" /></button>
    </li>)}
    {drag?.destination ? <li role="presentation" className="g-insertion-line" data-placement={drag.destination.placement} style={{ top: drag.destination.top }}><span>Сюда</span></li> : null}
  </ul>
}
