import { Check, CloudOff, Coins, Database, GitBranch, LayoutDashboard, ListChecks, Palette, Save, TrendingUp, Trash2, Undo2, X } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { AppearanceModal } from './components/AppearanceModal'
import { DataModal } from './components/DataModal'
import { NavItem } from './components/NavItem'
import { backgroundThemes } from './lib/appearance'
import './backgrounds.css'
import './planningRewards.css'
import './rpg.css'
import { useStore } from './lib/store'
import { DashboardPage } from './pages/DashboardPage'
import { QuestsPage } from './pages/QuestsPage'
import { LevelUpModal } from './components/LevelRewards'

const ProgressPage = lazy(() => import('./pages/ProgressPage').then((module) => ({ default: module.ProgressPage })))
const TreePage = lazy(() => import('./pages/TreePage').then((module) => ({ default: module.TreePage })))

const navigation = [
  { id: 'today', label: 'Сегодня', icon: LayoutDashboard },
  { id: 'quests', label: 'Квесты', icon: ListChecks },
  { id: 'tree', label: 'Дерево навыков', icon: GitBranch },
  { id: 'progress', label: 'Прогресс', icon: TrendingUp },
]

export function App() {
  const [page, setPage] = useState('today')
  const [treeFocusSkillId, setTreeFocusSkillId] = useState<string | null>(null)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const [plannerFocus, setPlannerFocus] = useState(0)
  const mainContent = useRef<HTMLElement>(null)
  const closeAppearance = useCallback(() => setAppearanceOpen(false), [])
  const { state, saveStatus, toast, dismissToast, deletedQuest, undoDeleteQuest, dismissDeletedQuests, setBackground } = useStore()

  const navigate = (nextPage: string) => {
    setTreeFocusSkillId(null)
    setPlannerFocus(nextPage === 'tomorrow' ? (value) => value + 1 : 0)
    setPage(nextPage === 'tomorrow' ? 'quests' : nextPage)
  }

  const openSkill = (skillId: string) => {
    setTreeFocusSkillId(skillId)
    setPage('tree')
  }

  useEffect(() => {
    mainContent.current?.scrollTo({ top: 0 })
  }, [page, treeFocusSkillId, plannerFocus])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(dismissToast, 2600)
    return () => window.clearTimeout(timer)
  }, [dismissToast, toast])

  return (
    <div className="app-shell" data-ui="golden" data-background={state.preferences.background}>
      <aside className="sidebar">
        <div className="brand"><BrandMark /><div><strong>Life is a Game</strong><small>YDN · Личная RPG</small></div></div>
        <nav className="main-nav" aria-label="Основные разделы">
          <span className="nav-label">Приключение</span>
          {navigation.map((item) => {
            return <NavItem key={item.id} icon={item.icon} label={item.label} active={page === item.id} onClick={() => navigate(item.id)} trailing={item.id === 'progress' && state.profile.gold > 0 ? <span className="nav-item__balance"><Coins size={12} aria-hidden="true" /> {state.profile.gold}</span> : undefined} />
          })}
        </nav>
        <div className="sidebar-bottom">
          <nav className="sidebar-actions" aria-label="Настройки">
            <NavItem icon={Database} label="Данные приложения" onClick={() => setDataOpen(true)} opensDialog />
            <NavItem icon={Palette} label="Оформление" detail={backgroundThemes.find((theme) => theme.id === state.preferences.background)?.name} onClick={() => setAppearanceOpen(true)} opensDialog />
          </nav>
          <div className="offline-badge"><CloudOff size={15} /><span><strong>Полностью локально</strong><small>Сетевые запросы заблокированы</small></span></div>
          <div className={`save-state save-state--${saveStatus}`}>{saveStatus === 'saving' ? <Save size={14} /> : <Check size={14} />} {saveStatus === 'saving' ? 'Сохраняется…' : saveStatus === 'error' ? 'Ошибка сохранения' : 'Все изменения сохранены'}</div>
        </div>
      </aside>
      <main ref={mainContent} className="main-content" id="main-content">
        <Suspense fallback={<div className="app-loading" role="status"><p>Загружаем страницу…</p></div>}>
          {page === 'today' && <DashboardPage onNavigate={navigate} onOpenSkill={openSkill} />}
          {page === 'quests' && <QuestsPage onNavigate={navigate} focusTomorrow={plannerFocus} />}
          {page === 'tree' && <TreePage initialSelectedId={treeFocusSkillId} />}
          {page === 'progress' && <ProgressPage />}
        </Suspense>
      </main>
      {appearanceOpen && <AppearanceModal selected={state.preferences.background} onChange={setBackground} onClose={closeAppearance} />}
      {dataOpen && <DataModal onClose={() => setDataOpen(false)} />}
      <LevelUpModal />
      {toast && <div className="game-toast" role="status"><span>✦</span><strong>{toast}</strong></div>}
      {deletedQuest && <div className={`delete-toast ${toast ? 'delete-toast--raised' : ''}`}>
        <Trash2 size={18} />
        <div role="status"><strong>Квест удалён</strong><span title={deletedQuest.title}>{deletedQuest.title}</span><small>Заработанные XP и монеты сохранены</small></div>
        <button className="button button--secondary" type="button" onClick={undoDeleteQuest}><Undo2 size={15} /> Отменить</button>
        <button className="icon-button" type="button" onClick={dismissDeletedQuests} aria-label="Закрыть уведомление об удалении"><X size={17} /></button>
      </div>}
    </div>
  )
}

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><img src="./hero-icon.png" alt="" /></span>
}
