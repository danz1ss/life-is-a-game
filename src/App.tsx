import { Check, ChevronRight, CloudOff, Coins, GitBranch, LayoutDashboard, ListChecks, Palette, Save, TrendingUp, Trash2, Undo2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AppearanceModal } from './components/AppearanceModal'
import { backgroundThemes } from './lib/appearance'
import './backgrounds.css'
import { useStore } from './lib/store'
import { DashboardPage } from './pages/DashboardPage'
import { ProgressPage } from './pages/ProgressPage'
import { QuestsPage } from './pages/QuestsPage'
import { RewardsPage } from './pages/RewardsPage'
import { TreePage } from './pages/TreePage'

const navigation = [
  { id: 'today', label: 'Сегодня', icon: LayoutDashboard },
  { id: 'quests', label: 'Квесты', icon: ListChecks },
  { id: 'tree', label: 'Дерево навыков', icon: GitBranch },
  { id: 'progress', label: 'Прогресс', icon: TrendingUp },
  { id: 'rewards', label: 'Награды', icon: Coins },
]

export function App() {
  const [page, setPage] = useState('today')
  const [treeFocusSkillId, setTreeFocusSkillId] = useState<string | null>(null)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const closeAppearance = useCallback(() => setAppearanceOpen(false), [])
  const { state, saveStatus, toast, dismissToast, deletedQuest, undoDeleteQuest, dismissDeletedQuests, setBackground } = useStore()

  const navigate = (nextPage: string) => {
    setTreeFocusSkillId(null)
    setPage(nextPage)
  }

  const openSkill = (skillId: string) => {
    setTreeFocusSkillId(skillId)
    setPage('tree')
  }

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(dismissToast, 2600)
    return () => window.clearTimeout(timer)
  }, [dismissToast, toast])

  return (
    <div className="app-shell" data-background={state.preferences.background}>
      <aside className="sidebar">
        <div className="brand"><BrandMark /><div><strong>Life is a Game</strong><small>YDN · Личная RPG</small></div></div>
        <nav className="main-nav">
          <span className="nav-label">Приключение</span>
          {navigation.map((item) => {
            const Icon = item.icon
            return <button key={item.id} className={page === item.id ? 'is-active' : ''} onClick={() => navigate(item.id)}><Icon size={19} /><span>{item.label}</span>{item.id === 'rewards' && state.profile.gold > 0 && <em>{state.profile.gold}</em>}</button>
          })}
        </nav>
        <div className="sidebar-bottom">
          <button className="appearance-button" onClick={() => setAppearanceOpen(true)} aria-haspopup="dialog">
            <Palette size={18} /><span>Оформление<small>{backgroundThemes.find((theme) => theme.id === state.preferences.background)?.name}</small></span><ChevronRight size={15} />
          </button>
          <div className="offline-badge"><CloudOff size={15} /><span><strong>Полностью локально</strong><small>Сетевые запросы заблокированы</small></span></div>
          <div className={`save-state save-state--${saveStatus}`}>{saveStatus === 'saving' ? <Save size={14} /> : <Check size={14} />} {saveStatus === 'saving' ? 'Сохраняется…' : saveStatus === 'error' ? 'Ошибка сохранения' : 'Все изменения сохранены'}</div>
        </div>
      </aside>
      <main className="main-content">
        {page === 'today' && <DashboardPage onNavigate={navigate} onOpenSkill={openSkill} />}
        {page === 'quests' && <QuestsPage onNavigate={navigate} />}
        {page === 'tree' && <TreePage initialSelectedId={treeFocusSkillId} />}
        {page === 'progress' && <ProgressPage />}
        {page === 'rewards' && <RewardsPage />}
      </main>
      {appearanceOpen && <AppearanceModal selected={state.preferences.background} onChange={setBackground} onClose={closeAppearance} />}
      {toast && <div className="game-toast"><span>✦</span><strong>{toast}</strong></div>}
      {deletedQuest && <div className={`delete-toast ${toast ? 'delete-toast--raised' : ''}`}>
        <Trash2 size={18} />
        <div role="status"><strong>Квест удалён</strong><span title={deletedQuest.title}>{deletedQuest.title}</span><small>Заработанные XP и золото сохранены</small></div>
        <button className="button button--secondary" type="button" onClick={undoDeleteQuest}><Undo2 size={15} /> Отменить</button>
        <button className="icon-button" type="button" onClick={dismissDeletedQuests} aria-label="Закрыть уведомление об удалении"><X size={17} /></button>
      </div>}
    </div>
  )
}

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true">
    <svg viewBox="0 0 64 72" role="img">
      <defs>
        <linearGradient id="ydn-mark-gradient" x1="8" y1="8" x2="58" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent-bright)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <path
        d="M12 10 32 43 52 10M32 43v21"
        fill="none"
        stroke="url(#ydn-mark-gradient)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
}
