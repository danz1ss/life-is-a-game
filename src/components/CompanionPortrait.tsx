import { useId } from 'react'
import { petStageForLevel, petStages } from '../lib/character'
import type { CharacterAppearance } from '../lib/types'

type Species = NonNullable<CharacterAppearance['pet']>

const companionArt: Record<Species, readonly string[]> = {
  fox: ['fox-cub.png', 'fox-explorer.png', 'fox-explorer.png', 'fox-guardian.png', 'fox-guardian.png', 'fox-guardian.png'],
  owl: ['owl-chick.png', 'owl-chick.png', 'owl-chick.png', 'owl-guardian.png', 'owl-guardian.png', 'owl-guardian.png'],
  dragon: Array(6).fill('dragon-legend.png'),
}

export function CompanionPortrait({ species = 'fox', level = 1, className = '', x, y, size }: { species?: Species; level?: number; className?: string; x?: number; y?: number; size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const stage = petStages.findIndex((item) => item.level === petStageForLevel(level).level)
  const color = species === 'owl' ? '#b99bff' : species === 'dragon' ? '#70eeff' : '#74daff'
  const art = `${import.meta.env.BASE_URL}companions/${companionArt[species][stage]}`

  return <svg className={`companion-portrait ${className}`} x={x} y={y} width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id={`${id}-halo`} cx="50%" cy="58%" r="53%">
        <stop stopColor={color} stopOpacity={stage >= 4 ? '.36' : '.18'} />
        <stop offset=".55" stopColor={color} stopOpacity={stage >= 4 ? '.16' : '.07'} />
        <stop offset="1" stopColor={color} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${id}-ring`} x1="0" y1="1" x2="1" y2="0">
        <stop stopColor="#1b6aaa" stopOpacity="0" />
        <stop offset=".55" stopColor={color} stopOpacity=".9" />
        <stop offset="1" stopColor="#fff8c6" stopOpacity=".36" />
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="68" rx="56" ry="50" fill={`url(#${id}-halo)`} />
    {stage >= 4 && <ellipse cx="60" cy="93" rx="41" ry="7" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="1.5" opacity=".8" />}
    <image href={art} x="0" y="0" width="120" height="120" preserveAspectRatio="xMidYMid meet" />
    {stage >= 2 && <g fill={color} opacity=".85">
      <path d="M15 35l1.8 4.2L21 41l-4.2 1.8L15 47l-1.8-4.2L9 41l4.2-1.8z" />
      <circle cx="104" cy="65" r="1.5" />
    </g>}
    {stage >= 4 && <g fill="#d8f9ff" opacity=".92">
      <path d="M100 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
      <circle cx="22" cy="85" r="1.3" />
    </g>}
    {stage >= 5 && <path d="M28 28Q60 6 92 28" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="1.4" opacity=".85" />}
  </svg>
}
