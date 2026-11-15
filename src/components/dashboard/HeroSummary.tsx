import { Coins } from 'lucide-react'
import { levelProgress } from '../../lib/game'
import { ProgressBar } from '../Ui'

export function HeroSummary({ totalXp, gold, onRewards }: {
  totalXp: number; gold: number; onRewards: () => void
}) {
  const level = levelProgress(totalXp)
  return <section className="g-hero-summary" aria-label="Уровень, опыт и монеты">
    <div className="g-summary-level"><strong>{level.level}</strong><span>Уровень</span></div>
    <div className="g-summary-xp"><div className="g-xp-heading"><strong>Опыт</strong><span>{level.current} / {level.needed} XP</span></div>
      <ProgressBar value={level.percent} color="var(--rpg-xp)" label="Опыт до следующего уровня" />
      <p className="g-level-distance">До уровня {level.level + 1} — {level.needed - level.current} XP</p>
    </div>
    <button type="button" className={`g-wallet${String(gold).length > 5 ? ' g-wallet--large' : ''}`} aria-label={`Баланс: ${gold} монет. Открыть награды`} onClick={onRewards}><Coins size={17} aria-hidden="true" /><strong>{gold}</strong><span>монет</span></button>
  </section>
}
