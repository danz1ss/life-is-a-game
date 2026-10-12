import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type NavItemProps = {
  icon: LucideIcon
  label: string
  onClick: () => void
  active?: boolean
  detail?: string
  trailing?: ReactNode
  opensDialog?: boolean
}

export function NavItem({ icon: Icon, label, onClick, active = false, detail, trailing, opensDialog = false }: NavItemProps) {
  return (
    <button
      className={`nav-item${active ? ' is-active' : ''}`}
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-haspopup={opensDialog ? 'dialog' : undefined}
    >
      <Icon className="nav-item__icon" size={19} aria-hidden="true" />
      <span className="nav-item__content">
        <span className="nav-item__label">{label}</span>
        {detail && <small className="nav-item__detail">{detail}</small>}
      </span>
      {trailing && <span className="nav-item__trailing">{trailing}</span>}
      {opensDialog && <ChevronRight className="nav-item__chevron" size={16} aria-hidden="true" />}
    </button>
  )
}
