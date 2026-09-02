import { Coins, Database, Download, Pencil, Plus, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { RewardModal } from '../components/RewardModal'
import { EmptyState, PageHeader } from '../components/Ui'
import { useStore } from '../lib/store'
import type { Reward, RewardDraft } from '../lib/types'

export function RewardsPage() {
  const { state, addReward, updateReward, deleteReward, redeemReward, updateProfile, exportBackup, importBackup } = useStore()
  const [modal, setModal] = useState<Reward | 'new' | null>(null)
  const [name, setName] = useState(state.profile.name)
  const [avatar, setAvatar] = useState(state.profile.avatar)
  const [storagePath, setStoragePath] = useState('Локальное хранилище приложения')
  const [message, setMessage] = useState('')

  useEffect(() => {
    window.lifeGame?.getStorageInfo().then((info) => setStoragePath(info.databasePath)).catch(() => undefined)
  }, [])

  const save = (draft: RewardDraft) => {
    if (modal === 'new') addReward(draft)
    else if (modal) updateReward(modal.id, draft)
    setModal(null)
  }

  const saveProfile = () => {
    updateProfile({ name: name.trim() || 'Игрок', avatar: avatar.trim() || '⚔️' })
    setMessage('Профиль сохранён')
  }

  return <div className="page rewards-page">
    <PageHeader eyebrow="Личные сокровища" title="Награды" description="Обменивайте заработанное золото на приятные вещи, которые выбрали сами." actions={<div className="wallet"><Coins size={19} /><strong>{state.profile.gold}</strong><span>золота</span></div>} />
    <div className="rewards-heading"><h2>Магазин наград</h2><button className="button button--secondary" onClick={() => setModal('new')}><Plus size={17} /> Добавить награду</button></div>
    {state.rewards.length === 0 ? <EmptyState icon="🎁" title="Магазин пуст" text="Добавьте то, чем хотите честно награждать себя за прогресс." /> : <section className="rewards-grid">{state.rewards.map((reward) => {
      const affordable = state.profile.gold >= reward.cost
      return <article className="reward-card panel" key={reward.id}><div className="reward-card__actions"><button className="icon-button" onClick={() => setModal(reward)}><Pencil size={15} /></button><button className="icon-button icon-button--danger" onClick={() => { if (window.confirm(`Удалить награду «${reward.title}»?`)) deleteReward(reward.id) }}><Trash2 size={15} /></button></div><div className="reward-card__icon">{reward.icon}</div><h3>{reward.title}</h3><p>{reward.description || 'Личная награда за честно заработанное золото.'}</p><button className={`reward-buy ${affordable ? '' : 'is-disabled'}`} onClick={() => { if (!redeemReward(reward.id)) setMessage(`Нужно ещё ${reward.cost - state.profile.gold} золота`) }}><Coins size={16} /> {reward.cost}<span>{affordable ? 'Получить' : 'Недостаточно'}</span></button></article>
    })}</section>}

    <section className="settings-section">
      <div className="section-heading"><span className="eyebrow">Локальные настройки</span><h2>Профиль и данные</h2></div>
      <div className="settings-grid">
        <article className="panel profile-settings">
          <div className="settings-icon"><span>{avatar || '⚔️'}</span></div>
          <div className="settings-fields"><label className="field"><span>Имя персонажа</span><input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="field"><span>Иконка</span><input value={avatar} maxLength={4} onChange={(event) => setAvatar(event.target.value)} /></label><button className="button button--primary" onClick={saveProfile}>Сохранить профиль</button></div>
        </article>
        <article className="panel data-settings">
          <div className="data-settings__head"><span className="settings-icon settings-icon--small"><Database size={22} /></span><div><h3>Локальная база</h3><p><ShieldCheck size={14} /> Только на этом компьютере</p></div></div>
          <code title={storagePath}>{storagePath}</code>
          <p className="data-description">Приложение блокирует внешние сетевые запросы. Резервная копия содержит профиль, квесты, дерево и историю.</p>
          <div className="data-actions"><button className="button button--secondary" onClick={async () => { const path = await exportBackup(); if (path) setMessage('Резервная копия сохранена') }}><Download size={16} /> Экспорт</button><button className="button button--ghost" onClick={async () => { if (window.confirm('Текущие данные будут заменены содержимым резервной копии. Продолжить?') && await importBackup()) setMessage('Данные восстановлены') }}><Upload size={16} /> Импорт</button></div>
        </article>
      </div>
    </section>
    {message && <div className="inline-toast" onAnimationEnd={() => window.setTimeout(() => setMessage(''), 1200)}>{message}</div>}
    {modal && <RewardModal reward={modal === 'new' ? null : modal} onSave={save} onClose={() => setModal(null)} />}
  </div>
}
