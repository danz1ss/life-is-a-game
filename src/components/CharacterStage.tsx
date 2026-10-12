import { availableCharacter } from '../lib/character'
import type { CharacterAppearance } from '../lib/types'
import { CharacterPortrait } from './CharacterPortrait'
import { CompanionPortrait } from './CompanionPortrait'
import './CharacterStage.css'

/**
 * The two portraits share one SVG coordinate space. The companion's feet line up
 * with the hero's, so resizing the stage cannot change their distance or overlap.
 */
export function CharacterStage({ appearance, level = 1, className = '' }: {
  appearance?: CharacterAppearance
  level?: number
  className?: string
}) {
  const character = availableCharacter(appearance, level)

  return <svg
    className={`character-stage ${className}`.trim()}
    viewBox="0 0 1380 1536"
    preserveAspectRatio="xMidYMid meet"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Герой и питомец"
  >
    <svg x="0" y="0" width="1024" height="1536" viewBox="0 0 1024 1536">
      <CharacterPortrait appearance={character} level={level} />
    </svg>
    <CompanionPortrait species={character.pet} level={level} x={925} y={1091} size={445} />
  </svg>
}
