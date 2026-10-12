import { X } from 'lucide-react'
import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'

export function ProgressBar({ value, color, compact = false, label }: { value: number; color?: string; compact?: boolean; label?: string }) {
  const percent = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
  return (
    <div className={`progress-track ${compact ? 'progress-track--compact' : ''}`} role={label ? 'progressbar' : undefined} aria-label={label} aria-valuemin={label ? 0 : undefined} aria-valuemax={label ? 100 : undefined} aria-valuenow={label ? percent : undefined}>
      <div className="progress-fill" style={{ width: `${percent}%`, background: color }} />
    </div>
  )
}

type ModalEntry = { dialog: HTMLElement; backdrop: HTMLDivElement; returnFocus: HTMLElement | null; close: () => void }
const modalStack: ModalEntry[] = []
const inertChanges = new Map<HTMLElement, boolean>()
let savedOverflow: { value: string; priority: string } | null = null
let pendingReturnFocus: HTMLElement | null = null
let modalObserver: MutationObserver | null = null
const currentModal = () => modalStack[modalStack.length - 1]
const focusableSelector = 'button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'
const focusableElements = (dialog: HTMLElement) => [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter(element => element.tabIndex >= 0 && !element.closest('[inert]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden')

function focusModal(entry: ModalEntry) {
  if (currentModal() !== entry || !entry.dialog.isConnected) return
  if (entry.dialog.contains(document.activeElement)) return
  const preferred = entry.dialog.querySelector<HTMLElement>('[autofocus], [data-modal-autofocus], [data-preview-autofocus]')
  const focusables = focusableElements(entry.dialog)
  ;(preferred && focusables.includes(preferred) ? preferred : focusables[0] ?? entry.dialog).focus({ preventScroll: true })
}

function isolateModal() {
  for (const [element, original] of inertChanges) element.inert = original
  inertChanges.clear()
  const top = currentModal()
  for (const [index, entry] of modalStack.entries()) {
    entry.backdrop.style.zIndex = String(100 + index * 2)
    entry.dialog.setAttribute('aria-modal', entry === top ? 'true' : 'false')
  }
  if (!top) return
  // Keep theme inheritance and inline dialogs; make every sibling of the active
  // backdrop's ancestor path inert, including the underlying dialog when nested.
  for (let branch: HTMLElement = top.backdrop; branch.parentElement; branch = branch.parentElement) {
    const parent = branch.parentElement
    for (const sibling of parent.children) if (sibling instanceof HTMLElement && sibling !== branch && sibling.tagName !== 'SCRIPT' && sibling.tagName !== 'STYLE') {
      inertChanges.set(sibling, sibling.inert)
      sibling.inert = true
    }
    if (parent === document.body) break
  }
}

function modalKeyDown(event: KeyboardEvent) {
  const top = currentModal()
  if (!top || event.defaultPrevented) return
  if (event.key === 'Escape') {
    event.preventDefault()
    top.close()
  } else if (event.key === 'Tab') {
    const elements = focusableElements(top.dialog), first = elements[0], last = elements[elements.length - 1]
    if (!first) { event.preventDefault(); top.dialog.focus(); return }
    if (!top.dialog.contains(document.activeElement) || event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus()
    }
  }
}

function modalFocusIn(event: FocusEvent) {
  const top = currentModal()
  if (top && event.target instanceof Node && !top.dialog.contains(event.target)) focusModal(top)
}

function preventBackgroundScroll(event: Event) {
  const top = currentModal()
  if (top && event.target instanceof Node && !top.dialog.contains(event.target)) event.preventDefault()
}

function addModal(entry: ModalEntry) {
  if (!entry.returnFocus?.isConnected) entry.returnFocus = pendingReturnFocus
  if (!modalStack.length) {
    savedOverflow = { value: document.body.style.getPropertyValue('overflow'), priority: document.body.style.getPropertyPriority('overflow') }
    document.body.style.setProperty('overflow', 'hidden')
    document.addEventListener('keydown', modalKeyDown)
    document.addEventListener('focusin', modalFocusIn)
    document.addEventListener('wheel', preventBackgroundScroll, { passive: false })
    document.addEventListener('touchmove', preventBackgroundScroll, { passive: false })
    modalObserver = new MutationObserver(isolateModal)
    modalObserver.observe(document.body, { childList: true, subtree: true })
  }
  // Child layout effects can register first when both dialogs mount together.
  // Keep ancestors beneath their already-mounted child in the logical stack.
  const childIndex = modalStack.findIndex(open => entry.dialog.contains(open.backdrop))
  if (childIndex >= 0) modalStack.splice(childIndex, 0, entry)
  else modalStack.push(entry)
  pendingReturnFocus = null
  isolateModal()
  focusModal(entry)
}

function removeModal(entry: ModalEntry) {
  const index = modalStack.indexOf(entry)
  if (index < 0) return
  const wasTop = currentModal() === entry
  modalStack.splice(index, 1)
  isolateModal()
  if (!modalStack.length) {
    modalObserver?.disconnect(); modalObserver = null
    if (savedOverflow?.value) document.body.style.setProperty('overflow', savedOverflow.value, savedOverflow.priority)
    else document.body.style.removeProperty('overflow')
    savedOverflow = null
    document.removeEventListener('keydown', modalKeyDown)
    document.removeEventListener('focusin', modalFocusIn)
    document.removeEventListener('wheel', preventBackgroundScroll)
    document.removeEventListener('touchmove', preventBackgroundScroll)
  }
  if (!wasTop) return
  pendingReturnFocus = entry.returnFocus
  // A replacement dialog may mount in the same commit. Let it choose autofocus
  // before restoring the initiator, so cleanup never steals its focus.
  queueMicrotask(() => {
    const top = currentModal()
    if (top) {
      if (entry.returnFocus?.isConnected && top.dialog.contains(entry.returnFocus)) entry.returnFocus.focus({ preventScroll: true })
      else focusModal(top)
    } else if (entry.returnFocus?.isConnected && !entry.returnFocus.closest('[inert]')) entry.returnFocus.focus({ preventScroll: true })
    if (!top) pendingReturnFocus = null
  })
}

export function Modal({ title, subtitle, children, onClose, onEscape, wide = false }: {
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
  onEscape?: () => void
  wide?: boolean
}) {
  const dialogRef = useRef<HTMLElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  const escapeRef = useRef(onEscape)
  const returnFocus = useRef(typeof document === 'undefined' ? null : document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const entry = useRef<ModalEntry | null>(null)
  const titleId = useId(), subtitleId = useId()
  closeRef.current = onClose
  escapeRef.current = onEscape
  useLayoutEffect(() => {
    if (!dialogRef.current || !backdropRef.current) return
    const mounted = { dialog: dialogRef.current, backdrop: backdropRef.current, returnFocus: returnFocus.current, close: () => { if (escapeRef.current) escapeRef.current(); else closeRef.current() } }
    entry.current = mounted
    addModal(mounted)
    return () => { removeModal(mounted); entry.current = null }
  }, [])
  useLayoutEffect(() => { if (entry.current) focusModal(entry.current) }, [title])
  return (
    <div ref={backdropRef} className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && currentModal() === entry.current) onClose() }}>
      <section ref={dialogRef} className={`modal-card ${wide ? 'modal-card--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={subtitle ? subtitleId : undefined} tabIndex={-1} style={{ overscrollBehavior: 'contain' }}>
        <header className="modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p id={subtitleId}>{subtitle}</p>}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть"><X size={19} aria-hidden="true" /></button>
        </header>
        {children}
      </section>
    </div>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}
