import './RewardChoiceIcon.css'

type RewardSlot = 'hair' | 'outfit' | 'weapon'

type RewardChoiceIconProps = {
  slot: RewardSlot
  id: string
  level: number
}

function rewardGlyph(slot: RewardSlot, id: string) {
  switch (`${slot}:${id}`) {
    case 'hair:short': return <>
      <path d="M12 23c-2-9 1-15 8-15s10 6 8 15l-3 5H15z" fill="#dfaa83" stroke="#654c4c" strokeWidth="1.2" />
      <path d="M10 21c-1-9 3-15 11-15 7 0 10 5 9 12l-4-3-3 2-4-4-6 6z" fill="#263b59" stroke="#8bb8dc" strokeWidth="1.2" />
      <path d="m12 15 8-5 5 2" fill="none" stroke="#547ba5" strokeWidth="1.2" />
    </>
    case 'hair:long': return <>
      <path d="M9 33V21C9 11 13 6 20 6s11 5 11 15v12l-5-3-6 2-6-2z" fill="#33425e" stroke="#8bb8dc" strokeWidth="1.3" />
      <path d="M14 18c2-4 7-5 12-3v12c-4 5-8 5-12 0z" fill="#e7ad8d" stroke="#885e59" strokeWidth="1" />
      <path d="M11 22c-1-9 4-16 13-14l5 6-8-3-5 7-2 13-4 2z" fill="#243650" />
      <path d="M27 18c4 5 2 10 4 15" fill="none" stroke="#6c91b9" strokeWidth="2" />
    </>
    case 'hair:medium': return <>
      <path d="M8 23C7 12 11 6 20 6s13 6 12 17l-2 8-5-3 1-7H14l1 7-5 3z" fill="#263a57" stroke="#8bb8dc" strokeWidth="1.2" />
      <path d="M13 18c2-5 11-6 14 0v8c-2 5-11 6-14 0z" fill="#e7ad8d" stroke="#956557" strokeWidth="1" />
      <path d="M9 20c-1-8 4-14 11-14 6 0 10 3 11 11l-5-3-3-4c-2 4-7 7-12 7z" fill="#23344e" stroke="#8bb8dc" strokeWidth="1.2" />
      <path d="M10 18c-1 5 0 8 2 11m18-12c1 5 0 9-2 12" fill="none" stroke="#476788" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M15 14c4 0 7-2 9-5" fill="none" stroke="#6d92b8" strokeWidth="1.3" strokeLinecap="round" />
    </>
    case 'hair:hood': return <>
      <path d="M5 31c1-15 4-25 15-26 11 1 14 11 15 26l-8 3H13z" fill="#486485" stroke="#9fcdea" strokeWidth="1.4" />
      <path d="M11 27c0-12 3-17 9-18 6 1 9 6 9 18l-9 6z" fill="#112539" stroke="#77a6cf" strokeWidth="1.2" />
      <path d="M14 25c2-3 10-3 12 0l-2 5h-8z" fill="#e7b596" />
      <path d="m6 31 8-4m20 4-8-4" stroke="#c2e8fa" strokeWidth="1.4" />
    </>
    case 'hair:wind': return <>
      <path d="M10 21c-1-9 3-15 11-15s11 6 10 15l-3 8H12z" fill="#263a59" stroke="#8bb8dc" strokeWidth="1.1" />
      <path d="M13 17c2-4 11-4 14 0v9c-3 5-11 5-14 0z" fill="#e8b293" stroke="#925d50" strokeWidth="1" />
      <path d="M8 21c-1-5 0-9 4-12l-1-5 5 3c3-4 7-5 11-3l-1 4 6-2-2 5 4 3-4 2 2 5-7-2-3 3-4-4-6 4z" fill="#263b5c" stroke="#9ac8ed" strokeWidth="1.15" strokeLinejoin="round" />
      <path d="m13 12 5-3 1 5m3-6 5 4-3 3m-9 4 4-3 4 3" fill="none" stroke="#668cb9" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 21c0 3 1 5 3 7m19-7c0 3-1 5-3 7" fill="none" stroke="#43668e" strokeWidth="2" strokeLinecap="round" />
    </>
    case 'hair:crown': return <>
      <path d="m5 13 6 5 4-9 5 8 5-8 4 9 6-5-3 18H8z" fill="#e5a843" stroke="#ffe4a0" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m9 24 11 3 11-3-1 5H10z" fill="#8d552e" stroke="#ffd77c" strokeWidth="1" />
      <path d="m20 17 3 4-3 4-3-4z" fill="#64deff" stroke="#e7ffff" strokeWidth="1" />
      <circle cx="11" cy="21" r="1.4" fill="#9b83ff" /><circle cx="29" cy="21" r="1.4" fill="#9b83ff" />
    </>
    case 'outfit:casual': return <>
      <path d="m13 8-8 5-2 17 7 2 3-8v11h14V24l3 8 7-2-2-17-8-5-7 5z" fill="#3b76a9" stroke="#9ed4f3" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="m13 8 7 7 7-7-2 10-5 5-5-5z" fill="#1b365a" stroke="#b1dafa" strokeWidth="1.1" />
      <path d="M20 23v12m-7-6h5m4 0h5" stroke="#d4eaf5" strokeWidth="1.2" />
    </>
    case 'outfit:traveler': return <>
      <path d="m11 7-7 7-1 18 7 2 4-10-1 11h14l-1-11 4 10 7-2-1-18-7-7-9 6z" fill="#92613f" stroke="#e6bc7d" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="m13 9 7 5 7-5-5 12-2 3-2-3z" fill="#38546b" stroke="#bddeec" strokeWidth="1" />
      <path d="m12 27 16-1m-13-16 13 19" stroke="#e8d2a5" strokeWidth="2.2" />
      <path d="M12 27h16v4H12z" fill="#57452c" stroke="#d5b97b" strokeWidth="1" />
      <path d="M18 27h4v4h-4z" fill="#e2bf71" />
    </>
    case 'outfit:guardian': return <>
      <path d="M11 8 3 12l-2 12 8 3 4-7v15h14V20l4 7 8-3-2-12-8-4-9 5z" fill="#54758f" stroke="#b7d9ee" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M12 8 20 13l8-5 1 14-9 10-9-10z" fill="#b9ccd8" stroke="#eef8fc" strokeWidth="1.2" />
      <path d="m14 14 6 5 6-5m-6 5v12" fill="none" stroke="#376489" strokeWidth="1.6" />
      <path d="M2 16h7v7H2zm29 0h7v7h-7z" fill="#9ab6cc" stroke="#e1f4ff" strokeWidth="1" />
    </>
    case 'outfit:mage': return <>
      <path d="M13 7 6 13 2 34l9 1 3-11-2 11h16l-2-11 3 11 9-1-4-21-7-6-7 7z" fill="#65529a" stroke="#c6b3ed" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="m13 7 7 7 7-7-3 14-4 5-4-5z" fill="#2c315e" stroke="#e1c6ff" strokeWidth="1.2" />
      <path d="M20 18v12m-8 1h16" stroke="#ddb96a" strokeWidth="1.7" />
      <path d="m20 15 1.2 2.8L24 19l-2.8 1.2L20 23l-1.2-2.8L16 19l2.8-1.2z" fill="#80e5ff" />
      <path d="M7 31h6m14 0h6" stroke="#dbc487" strokeWidth="1.5" />
    </>
    case 'outfit:ranger': return <>
      <path d="M12 7 4 13 2 34l10 1 3-12-2 12h15l-2-15 4 15 8-2-4-20-8-6-6 7z" fill="#416e62" stroke="#a6d8b8" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M12 7c3 6 12 8 16 0l4 11-12 9-9-8z" fill="#263f40" stroke="#c4dca8" strokeWidth="1" />
      <path d="m10 10 17 22" stroke="#bb9e68" strokeWidth="2.4" />
      <path d="M20 23c2-4 4-5 8-5-1 4-4 6-8 5z" fill="#8fe0a2" stroke="#d9f4bd" strokeWidth=".8" />
    </>
    case 'outfit:champion': return <>
      <path d="m11 6-9 6-1 14 9 2 3-8v15h14V20l3 8 9-2-1-14-9-6-9 7z" fill="#3a5a82" stroke="#9bc8ee" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="m12 8 8 5 8-5 1 16-9 9-9-9z" fill="#9bbbc9" stroke="#f0f7ee" strokeWidth="1.3" />
      <path d="m14 15 6 6 6-6-2 11-4 4-4-4z" fill="#176a9a" stroke="#83d8fc" strokeWidth="1" />
      <path d="M2 13 10 9l2 8-8 5zm36 0-8-4-2 8 8 5z" fill="#d4b269" stroke="#ffe7a0" strokeWidth="1" />
      <path d="M12 31h16" stroke="#e8ca7d" strokeWidth="2" />
    </>
    case 'outfit:celestial': return <>
      <path d="m11 6-9 7-1 14 9 2 3-9v15h14V20l3 9 9-2-1-14-9-7-9 6z" fill="#426b9f" stroke="#79eaff" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m12 8 8 5 8-5 1 16-9 9-9-9z" fill="#9ee5f1" stroke="#f1ffff" strokeWidth="1.3" />
      <path d="m20 13 6 9-6 9-6-9z" fill="#36b8ec" stroke="#efffff" strokeWidth="1.1" />
      <path d="m20 13 0 18m-6-9 12 0" stroke="#dbffff" strokeWidth=".9" />
      <path d="m3 15 8-6 2 9-9 6zm34 0-8-6-2 9 9 6z" fill="#d2af69" stroke="#ffe1a0" strokeWidth="1" />
      <circle cx="33" cy="5" r="1.4" fill="#c9ffff" />
    </>
    case 'weapon:none': return <>
      <path d="M15 33c-3-3-6-6-8-10-1-3 2-5 4-3l4 3V8c0-3 4-3 4 0v10-12c0-3 4-3 4 0v12-8c0-3 4-3 4 0v10-7c0-3 4-3 4 0v10c0 5-3 8-6 10z" fill="#c5aa8f" stroke="#e9d6ba" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M14 23c4-2 8-2 12 0" fill="none" stroke="#916d60" strokeWidth="1" />
    </>
    case 'weapon:shield': return <>
      <path d="M20 3 34 8v13c0 8-6 13-14 17C12 34 6 29 6 21V8z" fill="#486986" stroke="#b4d5e8" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M20 8 29 11v10c0 5-3 9-9 12-6-3-9-7-9-12V11z" fill="#254563" stroke="#7bb8dc" strokeWidth="1" />
      <path d="m20 12 6 8-6 8-6-8z" fill="#6bcef0" stroke="#d9faff" strokeWidth="1" />
      <path d="M20 12v16m-6-8h12" stroke="#e2ffff" strokeWidth=".9" />
    </>
    case 'weapon:sword': return <>
      <path d="M20 1 23.5 10 22.5 29h-5L16.5 10z" fill="#b7d1dc" stroke="#f0faff" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M20 1v28h2.5l1-19z" fill="#6f9db4" />
      <path d="M20 2v26" stroke="#f8ffff" strokeWidth=".9" strokeLinecap="round" />
      <path d="M10 29c3.7 1 7 1.5 10 1.5s6.3-.5 10-1.5l1.2 2.8C27 33.4 23.2 33.6 20 33.6s-7-.2-11.2-1.8z" fill="#c9914d" stroke="#ffe5a4" strokeWidth="1" strokeLinejoin="round" />
      <path d="M18 33h4v4.5h-4z" fill="#23517b" stroke="#8ac3e4" strokeWidth=".8" />
      <path d="M18 35h4" stroke="#cfad70" strokeWidth=".9" />
      <path d="M16.5 37.4h7l-.8 1.9h-5.4z" fill="#cf9e53" stroke="#fff0ba" strokeWidth=".8" strokeLinejoin="round" />
      <circle cx="20" cy="31" r="1.15" fill="#68d5ef" stroke="#faffff" strokeWidth=".5" />
    </>
    case 'weapon:staff': return <>
      <path d="M18 14 16 36" stroke="#a36f48" strokeWidth="5" strokeLinecap="round" />
      <path d="m18 14-2 22" stroke="#e7ba75" strokeWidth="1.3" />
      <path d="M13 12 9 8l4-4 7 2 7-2 4 4-4 4-7 6z" fill="#d7aa5f" stroke="#ffe19a" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="m20 4 6 7-6 8-6-8z" fill="#71d5f6" stroke="#edffff" strokeWidth="1.2" />
      <path d="M20 4v15m-6-8h12" stroke="#d9ffff" strokeWidth=".8" />
    </>
    case 'weapon:bow': return <>
      <path d="M29 3C17 5 8 12 7 20c1 8 10 15 22 17" fill="none" stroke="#7a4c33" strokeWidth="5" strokeLinecap="round" />
      <path d="M29 3C17 5 8 12 7 20c1 8 10 15 22 17" fill="none" stroke="#dda45d" strokeWidth="2.7" strokeLinecap="round" />
      <path d="M29 4v32" stroke="#e6f1ed" strokeWidth="1.2" />
      <path d="M8 18v4" stroke="#f5cd82" strokeWidth="3.7" strokeLinecap="round" />
      <path d="M4 20h30" stroke="#c5d9dc" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m32 16 5 4-5 4z" fill="#e5eef0" stroke="#ffffff" strokeWidth=".8" strokeLinejoin="round" />
      <path d="m5 20 5-4m-5 4 5 4" stroke="#f2d79d" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m26 5 4-2m-4 32 4 2" stroke="#f7d590" strokeWidth="2" strokeLinecap="round" />
    </>
    case 'weapon:twin': return <>
      <path d="M4 1 8 5l12 24-4 2L5 10z" fill="#b6dce6" stroke="#f5ffff" strokeWidth="1.15" strokeLinejoin="round" />
      <path d="m4 1 12 30 4-2L8 5z" fill="#5d96b8" />
      <path d="M36 1 32 5 20 29l4 2 11-21z" fill="#b6dce6" stroke="#f5ffff" strokeWidth="1.15" strokeLinejoin="round" />
      <path d="M36 1 24 31l-4-2L32 5z" fill="#5d96b8" />
      <path d="m12 30 9 4m7-4-9 4" stroke="#f5d389" strokeWidth="2.8" strokeLinecap="round" />
      <path d="m17 33-3 5m9-5 3 5" stroke="#255077" strokeWidth="3.5" strokeLinecap="round" />
      <path d="m17 33-3 5m9-5 3 5" stroke="#93c9e5" strokeWidth=".8" />
      <circle cx="13" cy="38.5" r="1" fill="#e6ae5a" stroke="#fff0bc" strokeWidth=".6" />
      <circle cx="27" cy="38.5" r="1" fill="#e6ae5a" stroke="#fff0bc" strokeWidth=".6" />
    </>
    case 'weapon:crystal': return <>
      <path d="M20 1 25 10 24 23l-3 8h-2l-3-8-1-13z" fill="#48d7ff" stroke="#f3ffff" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M20 1v30l-5-21z" fill="#d3ffff" />
      <path d="M20 1 25 10l-4 21h-1z" fill="#258cc7" />
      <path d="m15 10 5 5 5-5m-9 13 4-8 4 8" fill="none" stroke="#94ecff" strokeWidth=".8" />
      <path d="M4 27c4 2 8 2.5 12 2.5l4 2 4-2c4 0 8-.5 12-2.5-1 4.5-5.5 7-12 7h-8C9.5 34 5 31.5 4 27z" fill="#d6a150" stroke="#fff0ac" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="m7 30 8 2m18-2-8 2" stroke="#ffdda0" strokeWidth=".9" strokeLinecap="round" />
      <path d="m20 29 2 2-2 2-2-2z" fill="#24c9fa" stroke="#f6ffff" strokeWidth=".8" />
      <path d="M18 34h4v3.2h-4z" fill="#185586" stroke="#81d8f7" strokeWidth=".8" />
      <path d="m18 34.5 4 2m0-2-4 2" stroke="#ecc16c" strokeWidth=".7" />
      <path d="m17 37 3-1 3 1-3 2.5z" fill="#56dfff" stroke="#fff1b5" strokeWidth=".9" strokeLinejoin="round" />
      <path d="m33 3 .8 2.2L36 6l-2.2.8L33 9l-.8-2.2L30 6l2.2-.8z" fill="#f5ffff" />
    </>
    default: return <circle cx="20" cy="20" r="11" fill="#79b5db" />
  }
}

export function RewardChoiceIcon({ slot, id, level }: RewardChoiceIconProps) {
  const tier = level >= 100 ? 'legendary' : level >= 25 ? 'epic' : level >= 8 ? 'rare' : 'common'

  return <span className={`reward-choice-icon reward-choice-icon--${tier}`} aria-hidden="true">
    <svg viewBox="0 0 40 40" focusable="false" aria-hidden="true">
      {rewardGlyph(slot, id)}
    </svg>
  </span>
}
