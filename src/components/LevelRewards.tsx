import { Gift, PawPrint, Pencil, Plus, Sparkles, Trophy, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { characterMilestonesForGender } from '../lib/character'
import { useStore } from '../lib/store'
import type { PersonalLevelReward } from '../lib/types'
import { Modal } from './Ui'

export function LevelUpModal() {
  const { state, acknowledgeLevelRewards } = useStore()
  const { highestLevel, acknowledgedLevel, personal } = state.levelRewards
  if (highestLevel <= acknowledgedLevel) return null
  const unlocked = personal.filter((reward) => reward.level > acknowledgedLevel && reward.level <= highestLevel)
  const badges = Math.floor(highestLevel / 5) - Math.floor(acknowledgedLevel / 5)
  const newLooks = characterMilestonesForGender(state.profile.character?.gender ?? 'boy').filter((item) => item.level > acknowledgedLevel && item.level <= highestLevel)
  return <Modal title={`Новый уровень: ${highestLevel}!`} subtitle="Ваши действия превращаются в прогресс" onClose={acknowledgeLevelRewards}>
    <div className="level-up" data-testid="level-up">
      <div className="level-up__medal"><Trophy size={36} /><strong>{highestLevel}</strong></div>
      {badges > 0 && <p>Новых памятных значков: {badges}. Они сохранены в профиле.</p>}
      {newLooks.length > 0 && <div className="level-unlocked"><strong>Новые образы и этапы</strong>{newLooks.map((item) => <span key={`${item.level}-${item.title}`}>{item.kind === 'pet' ? <PawPrint size={15} /> : <Sparkles size={15} />} {item.level} уровень · {item.title}</span>)}<small>Они доступны во вкладке «Прогресс».</small></div>}
      {unlocked.length > 0 && <div className="level-unlocked"><strong>Открылись личные поощрения</strong>{unlocked.map((reward) => <span key={reward.id}><Gift size={15} /> {reward.title}</span>)}<small>Заберите их в разделе развития во вкладке «Прогресс».</small></div>}
      <button className="button button--primary" onClick={acknowledgeLevelRewards}>Продолжить приключение</button>
    </div>
  </Modal>
}

export function LevelRewardsPanel() {
  const { state, savePersonalLevelReward, deletePersonalLevelReward, claimPersonalLevelReward } = useStore()
  const [editing, setEditing] = useState<PersonalLevelReward | 'new' | null>(null)
  const { highestLevel, personal } = state.levelRewards
  const nextMilestone = (Math.floor(highestLevel / 5) + 1) * 5
  const sorted = [...personal].sort((a, b) => a.level - b.level)
  return <section className="level-rewards-section">
    <div className="rewards-heading"><div><span className="eyebrow">Новые вершины</span><h2>Личные цели по уровням</h2></div><button className="button button--secondary" onClick={() => setEditing('new')}><Plus size={16} /> Личная цель</button></div>
    <div className="panel level-rewards-rules"><Trophy size={25} /><div><strong>Новые уровни — новые возможности</strong><p>На уровнях 5, 10, 15… открывается памятный значок. Запланированное личное поощрение доступно бесплатно на выбранном уровне.</p></div><span>Следующая веха<br /><b>Уровень {nextMilestone}</b></span></div>
    {sorted.length === 0 ? <div className="panel level-rewards-empty"><Gift size={24} /><strong>Выберите подарок будущему себе</strong><p>Например, книга за 5 уровень или поездка за 10. Назначьте награду заранее и заберите её после достижения.</p></div>
      : <div className="rewards-grid">{sorted.map((reward) => {
        const unlocked = reward.level <= highestLevel
        return <article className={`reward-card panel level-reward-card ${unlocked ? 'is-unlocked' : ''}`} key={reward.id}>
          {!unlocked && <div className="reward-card__actions"><button className="icon-button" aria-label={`Изменить награду: ${reward.title}`} onClick={() => setEditing(reward)}><Pencil size={15} /></button><button className="icon-button icon-button--danger" aria-label={`Удалить награду: ${reward.title}`} onClick={() => { if (window.confirm(`Удалить награду «${reward.title}»?`)) deletePersonalLevelReward(reward.id) }}><Trash2 size={15} /></button></div>}
          <span className="level-reward-tier"><Trophy size={16} /> Уровень {reward.level}</span><h3>{reward.title}</h3>
          <p>{reward.claimedAt ? 'Подарок получен. Вы это заслужили!' : unlocked ? 'Уровень достигнут — подарок доступен.' : `Откроется на уровне ${reward.level}`}</p>
          <button className="button button--secondary" disabled={!unlocked || Boolean(reward.claimedAt)} onClick={() => claimPersonalLevelReward(reward.id)}><Gift size={16} />{reward.claimedAt ? 'Получено' : unlocked ? 'Забрать бесплатно' : 'Пока закрыто'}</button>
        </article>
      })}</div>}
    {editing && <PersonalRewardModal reward={editing === 'new' ? null : editing} minLevel={highestLevel + 1} defaultLevel={nextMilestone}
      onClose={() => setEditing(null)} onSave={(title, level) => { savePersonalLevelReward(title, level, editing === 'new' ? undefined : editing.id); setEditing(null) }} />}
  </section>
}

export function LevelBadges() {
  const { state } = useStore()
  const count = Math.floor(state.levelRewards.highestLevel / 5)
  if (!count) return <p className="level-badges-empty">Первый памятный значок — на уровне 5.</p>
  // Keep very large imported profiles compact while retaining the full milestone count.
  const start = Math.max(1, count - 7)
  return <div className="level-badges" aria-label="Достигнутые уровни">{start > 1 && <span>Ещё {start - 1} значков</span>}{Array.from({ length: count - start + 1 }, (_, index) => (start + index) * 5).map((level) => <span key={level} title={`Достигнут уровень ${level}`}><Trophy size={15} /> {level} уровень</span>)}</div>
}

function PersonalRewardModal({ reward, minLevel, defaultLevel, onClose, onSave }: {
  reward: PersonalLevelReward | null; minLevel: number; defaultLevel: number; onClose: () => void; onSave: (title: string, level: number) => void
}) {
  const [title, setTitle] = useState(reward?.title ?? '')
  const [level, setLevel] = useState(reward?.level ?? defaultLevel)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (title.trim() && Number.isSafeInteger(level) && level >= minLevel) onSave(title.trim(), level)
  }
  return <Modal title={reward ? 'Изменить личное поощрение' : 'Поощрение за будущий уровень'} subtitle="Выберите то, чему будете рады" onClose={onClose}>
    <form className="form" onSubmit={submit}>
      <label className="field field--full"><span>Подарок себе</span><input autoFocus required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например: купить книгу" /></label>
      <label className="field field--full"><span>Уровень персонажа</span><input required type="number" min={minLevel} step={1} value={level} onChange={(event) => setLevel(Number(event.target.value))} /></label>
      <p className="field--full">Поощрение можно изменить до достижения уровня. После открытия оно останется доступным, даже если вы отмените выполненный квест.</p>
      <footer className="form-actions field--full"><button type="button" className="button button--ghost" onClick={onClose}>Отмена</button><button className="button button--primary" type="submit">Сохранить</button></footer>
    </form>
  </Modal>
}
