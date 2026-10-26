import { useEffect, useState } from 'react'
import { heroStageForGender, petStageForLevel } from '../lib/character'
import { evolutionBetween } from '../lib/characterVisual'
import type { CharacterAppearance } from '../lib/types'
import { CharacterStage } from './CharacterStage'
import './HeroEvolution.css'

export function HeroEvolution({ fromLevel, toLevel, appearance }: {
  fromLevel: number; toLevel: number; appearance?: CharacterAppearance
}) {
  const evolution = evolutionBetween(fromLevel, toLevel, appearance)
  const gender = appearance?.gender ?? 'boy'
  const [phase, setPhase] = useState<'loading' | 'playing' | 'complete' | 'error'>('loading')
  const filesKey = evolution.files.join('|')
  useEffect(() => {
    let active = true
    const controllers: HTMLImageElement[] = []
    const timers: ReturnType<typeof setTimeout>[] = []
    setPhase('loading')
    const load = (file: string) => new Promise<void>((resolve, reject) => {
      const image = new Image(); controllers.push(image)
      const timer = setTimeout(() => reject(new Error('Artwork loading timed out')), 8000); timers.push(timer)
      image.onload = () => { clearTimeout(timer); resolve() }
      image.onerror = () => { clearTimeout(timer); reject(new Error(`Missing artwork: ${file}`)) }
      image.src = `${import.meta.env.BASE_URL}${file}`
    })
    Promise.all(evolution.files.map(load)).then(() => {
      if (!active) return
      // Preload both scenes; never begin the crossfade with an empty new portrait.
      setPhase(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'complete' : 'playing')
    }).catch(() => { if (active) setPhase('error') })
    return () => { active = false; controllers.forEach(image => { image.onload = null; image.onerror = null }); timers.forEach(clearTimeout) }
  }, [filesKey])

  const current = heroStageForGender(toLevel, gender)
  const previous = heroStageForGender(fromLevel, gender)
  return <section className="hero-evolution" aria-label="Развитие героя">
    <div className="hero-evolution__scene" data-phase={phase} data-testid="hero-evolution" aria-busy={phase === 'loading'}>
      <div className="hero-evolution__ground" aria-hidden="true" />
      <div className="hero-evolution__layer hero-evolution__before" aria-hidden="true"><CharacterStage appearance={appearance} level={fromLevel} /></div>
      {phase !== 'error' && <div className="hero-evolution__layer hero-evolution__after" aria-hidden="true" onAnimationEnd={event => { if (event.target === event.currentTarget) setPhase('complete') }}><CharacterStage appearance={appearance} level={toLevel} /></div>}
    </div>
    <div className="hero-evolution__caption">
      <span>{evolution.heroChanged ? 'Новый этап героя' : 'Ваш спутник вырос'}</span>
      <strong>{evolution.heroChanged ? current.label : petStageForLevel(toLevel).label}</strong>
      <p>{evolution.heroChanged ? `${previous.label} → ${current.label}` : `${petStageForLevel(fromLevel).label} → ${petStageForLevel(toLevel).label}`}</p>
      {phase === 'error' && <p role="status">Не удалось загрузить новый образ. Уровень сохранён; прежний образ оставлен на экране.</p>}
    </div>
  </section>
}
