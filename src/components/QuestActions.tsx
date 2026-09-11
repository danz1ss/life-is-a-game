import { Ellipsis, Pencil, Star, Trash2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

export function QuestActions({ title, onEdit, onDelete, onMakeMain }: {
  title: string
  onEdit?: () => void
  onDelete?: () => void
  onMakeMain?: () => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])

  const run = (action: () => void) => {
    setOpen(false)
    trigger.current?.focus()
    action()
  }

  return <div className="quest-actions" ref={root} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }} onKeyDown={(event) => {
    if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); event.stopPropagation() }
  }}>
    <button className="icon-button quest-actions__trigger" type="button" ref={trigger} aria-label={`Действия: ${title}`} title="Действия с квестом" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}><Ellipsis size={19} /></button>
    {open && <div className="quest-actions__menu" id={id}>
      {onEdit && <button type="button" onClick={() => run(onEdit)}><Pencil size={15} /> Редактировать</button>}
      {onMakeMain && <button type="button" onClick={() => run(onMakeMain)}><Star size={15} /> Сделать главным</button>}
      {onDelete && <button className="quest-actions__delete" type="button" onClick={() => run(onDelete)}><Trash2 size={15} /> Удалить квест</button>}
    </div>}
  </div>
}
