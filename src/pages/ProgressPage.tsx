import { Check, ChevronRight, Coins, LockKeyhole, PawPrint, Pencil, Plus, Shield, Shirt, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CompanionPortrait } from '../components/CompanionPortrait'
import { CharacterPortrait } from '../components/CharacterPortrait'
import { CharacterStage } from '../components/CharacterStage'
import { LevelRewardsPanel } from '../components/LevelRewards'
import { RewardModal } from '../components/RewardModal'
import { Modal, PageHeader, ProgressBar } from '../components/Ui'
import { availableCharacter, characterOptionsForGender, genderOptions, heroStageForGender, heroStages, normalizeCharacter, petStageForLevel, petStages, skinColors } from '../lib/character'
import { levelProgress } from '../lib/game'
import { exactHeroArt, equipmentArtFile, equipmentForAppearance, equipmentSets, heroEquipmentPortrait, renderedOutfitLabel, tryHeroEquipment } from '../lib/heroEquipment'
import { useStore } from '../lib/store'
import type { CharacterAppearance, Reward, RewardDraft } from '../lib/types'
import './progress.css'

const tabs = [
  { slot: 'outfit', label: 'Образ' },
  { slot: 'weapon', label: 'Оружие' },
] as const
type Slot = (typeof tabs)[number]['slot']

export function ProgressPage({ tryEquipment, onEquipmentOpened }: { tryEquipment: number; onEquipmentOpened: () => void }) {
  const { state, addReward, updateReward, deleteReward, redeemReward, usePurchasedReward } = useStore()
  const progress = levelProgress(state.profile.totalXp)
  const level = Math.max(state.levelRewards.highestLevel, progress.level)
  const character = availableCharacter(state.profile.character, level)
  const options = characterOptionsForGender(character.gender)
  const stage = heroStageForGender(level, character.gender)
  const equipment = equipmentForAppearance(character, level)
  const renderedWeapon = heroEquipmentPortrait(character, level) ? character.weapon : equipment?.weapon ?? 'none'
  const future = roadmapEntries(character.gender).filter((entry) => entry.level > level)
  const nextLevels = [...new Set(future.map((entry) => entry.level))].slice(0, 3)
  const [settings, setSettings] = useState<'hero' | 'pet' | null>(null)
  const [roadmapOpen, setRoadmapOpen] = useState(false)
  const [rewardModal, setRewardModal] = useState<Reward | 'new' | null>(null)
  const [purchase, setPurchase] = useState<Reward | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!tryEquipment) return
    setSettings('hero')
    onEquipmentOpened()
  }, [tryEquipment, onEquipmentOpened])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 3500)
    return () => window.clearTimeout(timer)
  }, [message])

  const saveReward = (draft: RewardDraft) => {
    if (rewardModal === 'new') addReward(draft)
    else if (rewardModal) updateReward(rewardModal.id, draft)
    setRewardModal(null)
  }
  const buyReward = () => {
    if (!purchase) return
    if (!redeemReward(purchase.id)) setMessage('Не удалось купить награду. Проверьте баланс монет.')
    setPurchase(null)
  }
  const inventory = state.purchasedRewards.reduce<Array<{ key: string; title: string; icon: string; ids: string[] }>>((groups, item) => {
    const key = JSON.stringify([item.rewardId, item.title, item.icon])
    const group = groups.find((candidate) => candidate.key === key)
    if (group) group.ids.push(item.id)
    else groups.push({ key, title: item.title, icon: item.icon, ids: [item.id] })
    return groups
  }, [])

  return <div className="page progress-page">
    <PageHeader title="Прогресс" />
    <section className="panel progress-summary" aria-label="Уровень, опыт и монеты">
      <div className="progress-summary__level">
        <div className="progress-summary__heading"><h2>Уровень {progress.level}</h2><span className="progress-rank">{stage.label}</span></div>
      </div>
      <div className="progress-summary__xp">
        <div><span>Опыт</span><strong>{progress.current} / {progress.needed} XP</strong></div>
        <ProgressBar value={progress.percent} />
        <small>{progress.needed - progress.current} XP до уровня {progress.level + 1}</small>
      </div>
      <div className="progress-summary__wallet" aria-label={`${state.profile.gold} монет`}><Coins size={21} /><strong>{state.profile.gold}</strong><span>монет</span></div>
    </section>
    <section className="progress-hero-section" aria-labelledby="progress-hero-title">
      <h2 id="progress-hero-title" className="progress-section-title">Герой</h2>
      <div className="panel progress-hero">
        <div className="progress-hero__visual">
          <div className="progress-hero__scene"><div className="character-podium" aria-hidden="true" /><CharacterStage appearance={character} level={level} className="progress-hero__stage" /></div>
        </div>
        <div className="progress-hero__details">
          <h3>{state.profile.name.trim() || 'Игрок'}</h3>
          <p className="progress-hero__rank"><span className="progress-rank">{stage.label}</span></p>
          <div className="progress-hero__group"><h4><Shirt size={16} aria-hidden="true" />Экипировка</h4><span>{renderedOutfitLabel(character, level)}</span><span>{options.weapon.find((item) => item.id === renderedWeapon)?.label}</span></div>
          <div className="progress-hero__group progress-hero__pet"><h4><PawPrint size={16} aria-hidden="true" />Питомец · {petStageForLevel(level).label}</h4><span>{state.profile.petName?.trim() || 'Искра'} · {options.pet.find((item) => item.id === character.pet)?.label}</span></div>
          <div className="progress-hero__actions"><button className="button button--primary" aria-haspopup="dialog" onClick={() => setSettings('hero')}>Настроить героя</button><button className="button button--secondary" aria-haspopup="dialog" onClick={() => setSettings('pet')}>Настроить питомца</button></div>
        </div>
      </div>
    </section>
    <section className="progress-next" aria-labelledby="progress-next-title"><div className="progress-section-heading"><h2 id="progress-next-title">Что откроется дальше</h2><button className="button button--secondary" onClick={() => setRoadmapOpen(true)}>Весь путь развития <ChevronRight size={16} /></button></div>
      {nextLevels.length ? <div className="progress-next__grid">{nextLevels.map((nextLevel, index) => <article className={`panel progress-next__card ${index === 0 ? 'is-next' : ''}`} key={nextLevel}><span className="progress-next__level">Уровень {nextLevel}</span><div>{future.filter((entry) => entry.level === nextLevel).map((entry) => <div className="progress-next__item" key={entry.key}><UnlockIcon kind={entry.kind} /><strong>{entry.title}</strong></div>)}</div>{index === 0 && <small>Следующее открытие</small>}</article>)}</div> : <div className="panel progress-next__complete">Все открытия до 100 уровня уже доступны. Ваш путь продолжается.</div>}
    </section>
    <section className="progress-shop" aria-labelledby="progress-shop-title"><div className="progress-section-heading"><div><h2 id="progress-shop-title">Награды для себя</h2><p>Трать заработанные монеты на то, что действительно хочешь.</p></div><button className="button button--secondary" onClick={() => setRewardModal('new')}><Plus size={17} /> Добавить награду</button></div>
      {state.rewards.length ? <div className="progress-shop__grid">{state.rewards.map((reward) => {
        const missing = reward.cost - state.profile.gold
        return <article className="panel progress-reward" key={reward.id}><div className="progress-reward__actions"><button className="icon-button" onClick={() => setRewardModal(reward)} aria-label={`Изменить награду ${reward.title}`}><Pencil size={16} /></button><button className="icon-button icon-button--danger" onClick={() => { if (window.confirm(`Удалить награду «${reward.title}»?`)) deleteReward(reward.id) }} aria-label={`Удалить награду ${reward.title}`}><Trash2 size={16} /></button></div><span className="progress-reward__icon" aria-hidden="true">{reward.icon}</span><h3>{reward.title}</h3><p>{reward.description}</p><div className="progress-reward__bottom"><span><Coins size={16} /> {reward.cost}</span><button className="button button--primary" disabled={missing > 0} onClick={() => setPurchase(reward)}>{missing > 0 ? `Нужно ещё ${missing} 🪙` : `Купить · ${reward.cost} 🪙`}</button></div></article>
      })}</div> : <div className="panel progress-empty">Добавьте первую награду, на которую захотите потратить монеты.</div>}
    </section>
    {inventory.length > 0 && <section className="progress-inventory" aria-labelledby="progress-inventory-title"><div className="progress-section-heading"><div><h2 id="progress-inventory-title">Мои награды</h2><p>Куплены и ждут подходящего момента.</p></div></div><div className="progress-inventory__list">{inventory.map((item) => <div className="panel progress-inventory__item" key={item.key}><span className="progress-inventory__icon" aria-hidden="true">{item.icon}</span><strong>{item.title} ×{item.ids.length}</strong><button className="button button--secondary" onClick={() => usePurchasedReward(item.ids[0])}><Check size={16} /> Использовать</button></div>)}</div></section>}
    {settings === 'hero' && <AppearanceEditor level={level} onClose={() => setSettings(null)} />}
    {settings === 'pet' && <PetEditor level={level} onClose={() => setSettings(null)} />}
    {roadmapOpen && <Roadmap level={level} gender={character.gender} onClose={() => setRoadmapOpen(false)} />}
    {rewardModal && <RewardModal reward={rewardModal === 'new' ? null : rewardModal} onSave={saveReward} onClose={() => setRewardModal(null)} />}
    {purchase && <Modal title={`Использовать ${purchase.cost} монет?`} subtitle={`Купить «${purchase.title}»`} onClose={() => setPurchase(null)}><div className="progress-confirm"><p>После покупки {purchase.useImmediately ? 'награда будет использована сразу.' : 'награда появится в разделе «Мои награды».'}</p><div className="form-actions"><button className="button button--ghost" onClick={() => setPurchase(null)}>Отмена</button><button className="button button--primary" onClick={buyReward}>Купить за {purchase.cost} 🪙</button></div></div></Modal>}
    {message && <div className="inline-toast" role="status">{message}</div>}
  </div>
}

function AppearanceEditor({ level, onClose }: { level: number; onClose: () => void }) {
  const { state, updateProfile } = useStore()
  const [name, setName] = useState(state.profile.name)
  const [character, setCharacter] = useState(() => normalizeCharacter(state.profile.character))
  const [tab, setTab] = useState<Slot>('outfit')
  const options = characterOptionsForGender(character.gender)
  const available = availableCharacter(character, level)
  const current = !heroEquipmentPortrait(available, level) && available.weapon !== 'crystal'
    ? { ...available, weapon: 'none' as const }
    : available
  const save = () => {
    updateProfile({ name: name.trim() || 'Игрок', character })
    onClose()
  }
  return <Modal title="Настройки героя" onClose={onClose} wide>
    <div className="appearance-editor">
      <div className="appearance-editor__preview"><CharacterPortrait appearance={character} level={level} /></div>
      <div className="appearance-editor__controls">
        <div className="appearance-editor__identity-grid">
          <label className="field"><span>Имя героя</span><input maxLength={40} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <fieldset className="field"><legend>Герой</legend><div className="appearance-editor__small-options">{genderOptions.map((item) => <button type="button" className={character.gender === item.id ? 'is-selected' : ''} key={item.id} onClick={() => setCharacter((current) => ({ ...current, gender: item.id }))}>{item.label}</button>)}</div></fieldset>
          <fieldset className="field"><legend>Оттенок кожи</legend><div className="appearance-editor__small-options">{options.skin.map((item) => <button type="button" className={character.skin === item.id ? 'is-selected' : ''} key={item.id} onClick={() => setCharacter((current) => ({ ...current, skin: item.id }))}><i style={{ background: skinColors[item.id] }} />{item.label}</button>)}</div></fieldset>
        </div>
        <div className="appearance-editor__tabs" role="group" aria-label="Элементы образа">{tabs.map((item) =>
          <button type="button" aria-pressed={tab === item.slot} aria-controls="appearance-choices" className={tab === item.slot ? 'is-active' : ''} key={item.slot} onClick={() => setTab(item.slot)}>{item.label}</button>
        )}</div>
        <div id="appearance-choices" className="appearance-editor__choices appearance-editor__equipment-choices" role="group" aria-label={tab === 'outfit' ? 'Выбор образа' : 'Выбор оружия'}>
          {options[tab].map((item) => {
            const change = tab === 'outfit'
              ? { outfit: item.id as CharacterAppearance['outfit'] }
              : { weapon: item.id as CharacterAppearance['weapon'] }
            const locked = item.level > level
            const selected = current[tab] === item.id
            const next = tryHeroEquipment(current, change, level)
            const thumbnailLevel = Math.max(level, item.level)
            const preset = equipmentSets.find(set => set[tab] === item.id)
            const outfitArt = exactHeroArt({ ...current, ...change, weapon: 'none' }, thumbnailLevel)
              ?? heroEquipmentPortrait({ ...current, ...change, weapon: 'none' }, thumbnailLevel)
              ?? (preset && equipmentArtFile(preset.id, character.gender, thumbnailLevel))
            const thumbnail = tab === 'outfit'
              ? outfitArt && `${import.meta.env.BASE_URL}${outfitArt}`
              : change.weapon && change.weapon !== 'none'
                ? `${import.meta.env.BASE_URL}heroes/weapons/${change.weapon === 'twin' ? 'sword' : change.weapon}.webp`
                : undefined
            const label = item.id === 'casual' ? renderedOutfitLabel({ ...current, outfit: 'casual', weapon: 'none' }, level) : item.label
            return <button key={item.id} data-equipment-id={item.id} type="button" className={`appearance-editor__choice appearance-editor__equipment-choice ${selected ? 'is-selected' : ''} ${locked || !next ? 'is-locked' : ''}`} disabled={locked || !next} aria-pressed={selected} onClick={() => next && setCharacter(next)}>
              <span className="appearance-editor__equipment-thumbnail" aria-hidden="true">
                {thumbnail ? change.weapon === 'twin'
                  ? <span className="appearance-editor__paired-blades"><img src={thumbnail} alt="" /><img src={thumbnail} alt="" /></span>
                  : <img src={thumbnail} alt="" />
                  : tab === 'outfit' ? <Shirt size={24} /> : <Shield size={24} />}
              </span>
              <span className="appearance-editor__choice-copy"><strong>{label}</strong>
                {!locked && (change.weapon === 'crystal'
                  ? <small>Надевается со звёздным доспехом</small>
                  : !next && <small>Нет портрета для этого сочетания</small>)}
              </span>
              {locked ? <em><LockKeyhole size={14} aria-hidden="true" /> Ур. {item.level}</em> : selected && <Check className="appearance-editor__selected-icon" size={17} aria-hidden="true" />}
            </button>
          })}
        </div>
        <fieldset className="field appearance-editor__presets">
          <legend>Готовые сочетания</legend>
          <div className="appearance-editor__small-options">{equipmentSets.filter(set => set.level <= level).map(set =>
            <button type="button" key={set.id} aria-pressed={current.outfit === set.outfit && current.weapon === set.weapon}
              onClick={() => setCharacter({ ...character, outfit: set.outfit, weapon: set.weapon })}>{set.label}</button>
          )}</div>
        </fieldset>
      </div>

      <div className="appearance-editor__footer"><button className="button button--secondary" onClick={onClose}>Отмена</button><button className="button button--primary" onClick={save}>Сохранить</button></div>
    </div>
  </Modal>
}

function PetEditor({ level, onClose }: { level: number; onClose: () => void }) {
  const { state, updateProfile } = useStore()
  const [name, setName] = useState(state.profile.petName ?? 'Искра')
  const character = normalizeCharacter(state.profile.character)
  const [choice, setChoice] = useState<CharacterAppearance['pet']>()
  const pet = choice ?? availableCharacter(character, level).pet
  const options = characterOptionsForGender(character.gender).pet
  const save = () => {
    updateProfile({ petName: name.trim() || 'Искра', ...(choice && { character: { ...character, pet: choice } }) })
    onClose()
  }
  return <Modal title="Настройки питомца" onClose={onClose} wide>
    <div className="appearance-editor">
      <div className="appearance-editor__preview appearance-editor__preview--pet"><CompanionPortrait species={pet} level={level} /></div>
      <div className="appearance-editor__controls">
        <label className="field"><span>Имя питомца</span><input maxLength={32} value={name} onChange={event => setName(event.target.value)} /></label>
        <div className="appearance-editor__choices" role="group" aria-label="Выбор питомца">{options.map(item => {
          const locked = item.level > level
          const selected = pet === item.id
          return <button type="button" key={item.id} disabled={locked} aria-pressed={selected} className={`appearance-editor__choice ${selected ? 'is-selected' : ''} ${locked ? 'is-locked' : ''}`} onClick={() => setChoice(item.id)}>
            <span className="appearance-editor__equipment-thumbnail"><CompanionPortrait species={item.id} level={Math.max(item.level, level)} /></span>
            <span className="appearance-editor__choice-copy"><strong>{item.label}</strong></span>
            {locked ? <em><LockKeyhole size={14} aria-hidden="true" /> Ур. {item.level}</em> : selected && <Check size={17} aria-hidden="true" />}
          </button>
        })}</div>
      </div>
      <div className="appearance-editor__footer"><button className="button button--secondary" onClick={onClose}>Отмена</button><button className="button button--primary" onClick={save}>Сохранить</button></div>
    </div>
  </Modal>
}

function roadmapEntries(gender: CharacterAppearance['gender']) {
  const options = characterOptionsForGender(gender)
  const entries = [
    { key: 'start', level: 1, title: 'Начало пути · Лисёнок', kind: 'Герой и питомец' },
    ...options.outfit.filter(item => item.level > 1).map(item => ({ key: `outfit-${item.id}`, level: item.level, title: item.label, kind: 'Образ' })),
    ...options.weapon.filter(item => item.level > 1).map(item => ({ key: `weapon-${item.id}`, level: item.level, title: item.label, kind: 'Оружие' })),
    ...options.pet.filter((item) => item.level > 1).map((item) => ({ key: `pet-${item.id}`, level: item.level, title: item.label, kind: 'Питомец' })),
    ...heroStages.filter((item) => item.level > 1).map((item) => ({ key: `stage-${item.id}`, level: item.level, title: heroStageForGender(item.level, gender).label, kind: 'Этап героя' })),
    ...petStages.filter((item) => item.level > 1 && item.level < 100).map((item) => ({ key: `pet-stage-${item.level}`, level: item.level, title: `Спутник: ${petStageForLevel(item.level).label}`, kind: 'Развитие питомца' })),
  ]
  return entries.sort((a, b) => a.level - b.level || a.kind.localeCompare(b.kind, 'ru'))
}

function UnlockIcon({ kind }: { kind: string }) {
  const Icon = kind === 'Образ' ? Shirt : kind === 'Оружие' ? Shield : kind === 'Питомец' || kind === 'Развитие питомца' ? PawPrint : Sparkles
  return <Icon size={18} aria-hidden="true" />
}

function Roadmap({ level, gender, onClose }: { level: number; gender: CharacterAppearance['gender']; onClose: () => void }) {
  const entries = roadmapEntries(gender)
  return <Modal title="Весь путь" subtitle="Открытия героя и питомца до 100 уровня" onClose={onClose} wide><div className="progress-roadmap"><div className="progress-roadmap__list">{[...new Set(entries.map((entry) => entry.level))].map((entryLevel) => <div className={`progress-roadmap__level ${entryLevel <= level ? 'is-unlocked' : ''}`} key={entryLevel}><span>Ур. {entryLevel}</span><div>{entries.filter((entry) => entry.level === entryLevel).map((entry) => <p key={entry.key}><strong>{entry.title}</strong><small>{entry.kind}</small></p>)}</div>{entryLevel <= level && <Check size={17} aria-label="Открыто" />}</div>)}</div><LevelRewardsPanel /></div></Modal>
}
