import { useId } from 'react'
import { petStageForLevel, petStages } from '../lib/character'
import type { CharacterAppearance } from '../lib/types'
import { companionArtFile } from '../lib/characterVisual'

type Species = NonNullable<CharacterAppearance['pet']>

export function CompanionPortrait({ species = 'fox', level = 1, className = '', x, y, size }: { species?: Species; level?: number; className?: string; x?: number; y?: number; size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const stage = petStages.findIndex((item) => item.level === petStageForLevel(level).level)
  const color = species === 'owl' ? '#b99bff' : species === 'dragon' ? '#70eeff' : '#74daff'
  const art = `${import.meta.env.BASE_URL}${companionArtFile(species, level)}`

  return <svg className={`companion-portrait ${className}`} x={x} y={y} width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id={`${id}-halo`} cx="50%" cy="58%" r="53%">
        <stop stopColor={color} stopOpacity={stage >= 4 ? '.36' : '.18'} />
        <stop offset=".55" stopColor={color} stopOpacity={stage >= 4 ? '.16' : '.07'} />
        <stop offset="1" stopColor={color} stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="60" cy="68" rx="56" ry="50" fill={`url(#${id}-halo)`} />
    <image href={art} x="0" y="0" width="120" height="120" preserveAspectRatio="xMidYMid meet" />
  </svg>
}
