import { useId } from 'react'
import { accentColors, availableCharacter, heroStageForLevel } from '../lib/character'
import type { CharacterAppearance } from '../lib/types'
import { heroArtFile } from '../lib/characterVisual'

export function CharacterPortrait({ appearance, level = 1, className = '', variant = 'full' }: {
  appearance?: CharacterAppearance
  level?: number
  className?: string
  variant?: 'full' | 'bust'
}) {
  const character = availableCharacter(appearance, level)
  const stage = heroStageForLevel(level)
  const accent = accentColors.azure
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const art = `${import.meta.env.BASE_URL}${heroArtFile(character, level)}`
  const skinFilter = character.skin === 'light' ? 'brightness(1.055)' : character.skin === 'dark' ? 'brightness(.93) saturate(.9)' : undefined
  const aura = .16 + stage.maturity * .56

  return <svg className={`character-portrait ${className}`} viewBox={variant === 'bust' ? '228 5 568 610' : '0 0 1024 1536'} preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id={`${id}-portal`} cx="50%" cy="50%" r="50%"><stop stopColor={accent} stopOpacity={aura * .65} /><stop offset=".65" stopColor={accent} stopOpacity={aura * .15} /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient>
    </defs>
    <ellipse cx="512" cy="735" rx="410" ry="600" fill={`url(#${id}-portal)`} />
    <g style={{ filter: skinFilter }}>
      <image href={art} x="0" y="0" width="1024" height="1536" preserveAspectRatio="xMidYMid meet" />
    </g>

    {stage.id !== 'child' && <g fill={accent} opacity={.35 + stage.maturity * .5}><path d="M208 317l5 13 13 5-13 5-5 13-5-13-13-5 13-5z" /><path d="M830 460l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" /></g>}
  </svg>
}
