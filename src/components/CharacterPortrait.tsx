import { useId } from 'react'
import { accentColors, availableCharacter, heroStageForLevel } from '../lib/character'
import type { CharacterAppearance } from '../lib/types'

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
  const isCrystal = stage.id === 'legend' && character.weapon === 'crystal'
  const imageName = `${character.gender}-${stage.id}${isCrystal ? '-crystal' : ''}.png`
  const art = `${import.meta.env.BASE_URL}heroes/${imageName}`
  const aura = .16 + stage.maturity * .56

  return <svg className={`character-portrait ${className}`} viewBox={variant === 'bust' ? '228 5 568 610' : '0 0 1024 1536'} preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id={`${id}-portal`} cx="50%" cy="50%" r="50%"><stop stopColor={accent} stopOpacity={aura * .65} /><stop offset=".65" stopColor={accent} stopOpacity={aura * .15} /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}-blade`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" /><stop offset=".35" stopColor="#cdf7ff" /><stop offset=".7" stopColor="#5ebff1" /><stop offset="1" stopColor="#1b68bb" /></linearGradient>
      <linearGradient id={`${id}-hair`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={character.gender === 'girl' ? '#6b493b' : '#4a3b3a'} /><stop offset=".6" stopColor={character.gender === 'girl' ? '#382a2b' : '#1b2238'} /><stop offset="1" stopColor="#171b29" /></linearGradient>
      <filter id={`${id}-glow`} x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="18" /></filter>
    </defs>
    <ellipse cx="512" cy="735" rx="410" ry="600" fill={`url(#${id}-portal)`} />
    {character.gender === 'girl' && character.hair === 'long' && <g fill={`url(#${id}-hair)`} opacity=".9">
      <path d="M358 254 Q334 297 333 356 Q331 387 312 412 Q341 405 357 371 Q373 332 373 274Z" />
      <path d="M666 254 Q690 297 691 356 Q693 387 712 412 Q683 405 667 371 Q651 332 651 274Z" />
      <path d="M347 289 Q340 348 326 382 M677 289 Q684 348 698 382" fill="none" stroke="#a47968" strokeOpacity=".25" strokeWidth="5" />
    </g>}
    <image href={art} x="0" y="0" width="1024" height="1536" preserveAspectRatio="xMidYMid meet" style={{ filter: character.skin === 'light' ? 'brightness(1.055)' : character.skin === 'dark' ? 'brightness(.93) saturate(.9)' : undefined }} />

    {character.hair === 'hood' && <g opacity=".86"><path d="M336 290 Q313 73 503 38 Q700 48 688 289 L627 290 Q648 170 562 106 Q463 68 388 191 L391 290Z" fill="#152b4f" stroke={accent} strokeOpacity=".7" strokeWidth="7" /><path d="M365 216 Q463 45 620 147" fill="none" stroke="#b4dafa" strokeOpacity=".42" strokeWidth="9" /></g>}
    {character.hair === 'crown' && <g transform="translate(0 -10)"><path d="M391 111 L411 18 L461 60 L512 0 L563 60 L613 18 L633 111Z" fill="#c99642" stroke="#ffeab5" strokeWidth="7" /><path d="M396 104 L628 104" stroke="#fff0af" strokeWidth="14" /><path d="M512 33 L533 69 L512 94 L491 69Z" fill={accent} stroke="#fff" strokeWidth="5" /></g>}
    {!isCrystal && character.weapon !== 'none' && character.weapon !== 'crystal' && <WeaponArt weapon={character.weapon} accent={accent} blade={`url(#${id}-blade)`} glow={`${id}-glow`} />}
    {stage.id !== 'child' && <g fill={accent} opacity={.35 + stage.maturity * .5}><path d="M208 317l5 13 13 5-13 5-5 13-5-13-13-5 13-5z" /><path d="M830 460l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" /></g>}
  </svg>
}

function WeaponArt({ weapon, accent, blade, glow }: { weapon: Exclude<CharacterAppearance['weapon'], 'none' | 'crystal'>; accent: string; blade: string; glow: string }) {
  if (weapon === 'shield') return <g transform="translate(740 698)"><path d="M-70 -54 L48 -54 L75 -16 L58 134 Q11 183 -60 142 L-83 4Z" fill="#172d4c" stroke="#a7d5ed" strokeWidth="11" /><path d="M-56 -35 L36 -35 L55 -9 L41 114 Q4 151 -42 120 L-64 4Z" fill="#3975a1" stroke={accent} strokeWidth="6" /><path d="M-6 -17 L-6 126 M-47 42 L43 42" stroke="#dff8ff" strokeWidth="10" opacity=".8" /></g>
  if (weapon === 'staff') return <g><path d="M803 331 L762 1299" stroke="#654a38" strokeWidth="26" strokeLinecap="round" /><path d="M803 342 L762 1299" stroke="#c69b62" strokeWidth="7" strokeLinecap="round" /><path d="M800 214 L846 289 L800 369 L754 289Z" fill={accent} opacity=".7" filter={`url(#${glow})`} /><path d="M800 214 L846 289 L800 369 L754 289Z" fill={accent} stroke="#efffff" strokeWidth="9" /><path d="M800 249 L820 289 L800 336 L780 289Z" fill="#eaffff" opacity=".8" /></g>
  if (weapon === 'bow') return <g><path d="M822 267 Q983 749 804 1247" fill="none" stroke="#8a5a31" strokeWidth="27" /><path d="M822 267 Q744 755 804 1247" fill="none" stroke="#effaff" strokeWidth="4" /><path d="M755 761 L916 761" stroke={accent} strokeWidth="12" /><path d="M918 761 L858 737 L858 785Z" fill="#e7faff" /></g>
  const twin = weapon === 'twin'
  return <g><g transform={twin ? 'translate(685 766) rotate(22)' : 'translate(744 780) rotate(22)'}><path d="M0 -510 L37 -99 L0 -62 L-37 -99Z" fill={blade} stroke="#e8fcff" strokeWidth="8" /><path d="M0 -506 L0 -65" fill="none" stroke="#fcffff" strokeWidth="5" opacity=".8" /><path d="M-84 -91 Q-40 -76 0 -53 Q40 -76 84 -91 L69 -50 Q29 -47 0 -23 Q-29 -47 -69 -50Z" fill="#b38b4f" stroke="#ffe2a2" strokeWidth="7" /><path d="M-13 -20 L13 -20 L13 120 L-13 120Z" fill="#1e4169" stroke={accent} strokeWidth="6" /><path d="M-24 111 L24 111 L22 148 L0 167 L-22 148Z" fill={accent} stroke="#fff0c2" strokeWidth="7" /></g>{twin && <g transform="translate(343 845) rotate(-24) scale(.82)"><path d="M0 -510 L37 -99 L0 -62 L-37 -99Z" fill={blade} stroke="#e8fcff" strokeWidth="8" /><path d="M-84 -91 Q-40 -76 0 -53 Q40 -76 84 -91 L69 -50 Q29 -47 0 -23 Q-29 -47 -69 -50Z" fill="#b38b4f" stroke="#ffe2a2" strokeWidth="7" /><path d="M-13 -20 L13 -20 L13 120 L-13 120Z" fill="#1e4169" stroke={accent} strokeWidth="6" /></g>}</g>
}
