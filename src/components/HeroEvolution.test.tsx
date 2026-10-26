import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { defaultCharacter } from '../lib/character'
import { createInitialState } from '../lib/game'
import { useStore } from '../lib/store'
import { LevelUpModal } from './LevelRewards'
vi.mock('../lib/store',()=>({useStore:vi.fn()}))
function render(from:number,to:number){
 const state=createInitialState();state.profile.character=defaultCharacter;state.levelRewards.highestLevel=to;state.levelRewards.acknowledgedLevel=from
 vi.mocked(useStore).mockReturnValue({state,acknowledgeLevelRewards:()=>undefined} as unknown as ReturnType<typeof useStore>)
 return renderToStaticMarkup(createElement(LevelUpModal))
}
describe('level-up evolution scene',()=>{
 it('puts the actual previous and new hero in the milestone dialog',()=>{
  const html=render(9,10)
  expect(html).toContain('data-testid="hero-evolution"')
  expect(html).toContain('boy-child.png');expect(html).toContain('boy-teen.png')
  expect(html).toContain('Новый этап героя')
 })
 it('keeps ordinary level-ups compact',()=>{expect(render(6,7)).not.toContain('data-testid="hero-evolution"')})
 it('never replays acknowledged milestones',()=>{expect(render(10,10)).toBe('')})
 it('shows companion-only growth with the same hero',()=>{
  const html=render(4,5);expect(html).toContain('Ваш спутник вырос');expect(html).toContain('fox-cub.png');expect(html).toContain('fox-explorer.png')
 })
})
