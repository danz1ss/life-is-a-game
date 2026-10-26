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
  const accent = accentColors[character.accent]
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const art = `${import.meta.env.BASE_URL}${heroArtFile(character, level)}`
  const fullEquipmentPortrait = art.includes('/equipment/') || art.endsWith('-legend-crystal.png')
  const aura = .16 + stage.maturity * .56

  return <svg className={`character-portrait ${className}`} viewBox={variant === 'bust' ? '228 5 568 610' : '0 0 1024 1536'} preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id={`${id}-portal`} cx="50%" cy="50%" r="50%"><stop stopColor={accent} stopOpacity={aura * .65} /><stop offset=".65" stopColor={accent} stopOpacity={aura * .15} /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}-hair`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={character.gender === 'girl' ? '#6b493b' : '#4a3b3a'} /><stop offset=".6" stopColor={character.gender === 'girl' ? '#382a2b' : '#1b2238'} /><stop offset="1" stopColor="#171b29" /></linearGradient>
      <filter id={`${id}-glow`} x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="18" /></filter>
    </defs>
    <ellipse cx="512" cy="735" rx="410" ry="600" fill={`url(#${id}-portal)`} />
    {!fullEquipmentPortrait && character.gender === 'girl' && character.hair === 'long' && <g fill={`url(#${id}-hair)`} opacity=".9">
      <path d="M358 254 Q334 297 333 356 Q331 387 312 412 Q341 405 357 371 Q373 332 373 274Z" />
      <path d="M666 254 Q690 297 691 356 Q693 387 712 412 Q683 405 667 371 Q651 332 651 274Z" />
      <path d="M347 289 Q340 348 326 382 M677 289 Q684 348 698 382" fill="none" stroke="#a47968" strokeOpacity=".25" strokeWidth="5" />
    </g>}
    <image href={art} x="0" y="0" width="1024" height="1536" preserveAspectRatio="xMidYMid meet" style={{ filter: character.skin === 'light' ? 'brightness(1.055)' : character.skin === 'dark' ? 'brightness(.93) saturate(.9)' : undefined }} />

    {!fullEquipmentPortrait && character.hair === 'hood' && <g opacity=".86"><path d="M336 290 Q313 73 503 38 Q700 48 688 289 L627 290 Q648 170 562 106 Q463 68 388 191 L391 290Z" fill="#152b4f" stroke={accent} strokeOpacity=".7" strokeWidth="7" /><path d="M365 216 Q463 45 620 147" fill="none" stroke="#b4dafa" strokeOpacity=".42" strokeWidth="9" /></g>}
    {!fullEquipmentPortrait && character.hair === 'crown' && <g transform="translate(0 -10)"><path d="M391 111 L411 18 L461 60 L512 0 L563 60 L613 18 L633 111Z" fill="#c99642" stroke="#ffeab5" strokeWidth="7" /><path d="M396 104 L628 104" stroke="#fff0af" strokeWidth="14" /><path d="M512 33 L533 69 L512 94 L491 69Z" fill={accent} stroke="#fff" strokeWidth="5" /></g>}
    {stage.id !== 'child' && <g fill={accent} opacity={.35 + stage.maturity * .5}><path d="M208 317l5 13 13 5-13 5-5 13-5-13-13-5 13-5z" /><path d="M830 460l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" /></g>}
  </svg>
}
