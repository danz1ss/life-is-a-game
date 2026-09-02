import { Check, CloudOff, Coins, GitBranch, LayoutDashboard, ListChecks, Save, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
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
  const { state, saveStatus, toast, dismissToast } = useStore()

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(dismissToast, 2600)
    return () => window.clearTimeout(timer)
  }, [dismissToast, toast])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✦</span><div><strong>Life is a Game</strong><small>Личная RPG</small></div></div>
        <nav className="main-nav">
          <span className="nav-label">Приключение</span>
          {navigation.map((item) => {
            const Icon = item.icon
            return <button key={item.id} className={page === item.id ? 'is-active' : ''} onClick={() => setPage(item.id)}><Icon size={19} /><span>{item.label}</span>{item.id === 'rewards' && state.profile.gold > 0 && <em>{state.profile.gold}</em>}</button>
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="offline-badge"><CloudOff size={15} /><span><strong>Полностью локально</strong><small>Сетевые запросы заблокированы</small></span></div>
          <div className={`save-state save-state--${saveStatus}`}>{saveStatus === 'saving' ? <Save size={14} /> : <Check size={14} />} {saveStatus === 'saving' ? 'Сохраняется…' : saveStatus === 'error' ? 'Ошибка сохранения' : 'Все изменения сохранены'}</div>
        </div>
      </aside>
      <main className="main-content">
        {page === 'today' && <DashboardPage onNavigate={setPage} />}
        {page === 'quests' && <QuestsPage onNavigate={setPage} />}
        {page === 'tree' && <TreePage />}
        {page === 'progress' && <ProgressPage />}
        {page === 'rewards' && <RewardsPage />}
      </main>
      {toast && <div className="game-toast"><span>✦</span><strong>{toast}</strong></div>}
    </div>
  )
}
