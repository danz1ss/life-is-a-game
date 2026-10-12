import { Coins } from 'lucide-react'
import { heroStageForGender } from '../../lib/character'
import { levelProgress } from '../../lib/game'
import type { CharacterAppearance } from '../../lib/types'
import { ProgressBar } from '../Ui'

export function HeroSummary({ totalXp, highestLevel, gold, gender, onRewards }: {
  totalXp: number; highestLevel: number; gold: number; gender: CharacterAppearance['gender']; onRewards: () => void
}) {
  const level = levelProgress(totalXp)
  const stage = heroStageForGender(highestLevel, gender)
  return <section className="g-hero-summary" aria-label="Уровень, опыт и монеты">
    <div className="g-summary-level"><strong>Уровень {level.level}</strong><span>{stage.label}</span></div>
    <div className="g-summary-xp"><div className="g-xp-heading"><strong>Опыт</strong><span>{level.current} / {level.needed} XP</span></div>
      <ProgressBar value={level.percent} color="var(--rpg-xp)" label="Опыт до следующего уровня" />
      <p className="g-level-distance">До уровня {level.level + 1} — {level.needed - level.current} XP</p>
    </div>
    <button type="button" className="g-wallet" aria-label={`Баланс: ${gold} монет. Открыть награды`} onClick={onRewards}><Coins size={17} aria-hidden="true" /><strong>{gold}</strong><span>монет</span></button>
  </section>
}
