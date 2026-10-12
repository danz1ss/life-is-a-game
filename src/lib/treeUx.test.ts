import { describe, expect, it } from 'vitest'
import { createInitialState } from './game'
import { selectionForBranch, skillAncestorPath, viewportForVisibleNode, moveSkillWithKey, fromTreePosition, toTreePosition } from './treeLayout'

const skills = createInitialState().skills
describe('skill tree selection and ancestry', () => {
  it('finds the full visible chain from the hero and limits a branch path to its root', () => {
    expect(skillAncestorPath(skills, 'reading', null)).toEqual(['player-root', 'growth', 'reading'])
    expect(skillAncestorPath(skills, 'reading', 'growth')).toEqual(['growth', 'reading'])
    expect(skillAncestorPath(skills, 'growth', 'growth')).toEqual(['growth'])
    expect(skillAncestorPath(skills, 'reading', 'health')).toEqual([])
    expect(skillAncestorPath(skills, 'missing', null)).toEqual([])
    expect(skillAncestorPath(skills, null, null)).toEqual([])
  })
  it('clears only a selection that is missing or outside the selected branch', () => {
    expect(selectionForBranch(skills, 'reading', 'health')).toBeNull()
    expect(selectionForBranch(skills, 'reading', 'growth')).toBe('reading')
    expect(selectionForBranch(skills, 'reading', null)).toBe('reading')
    expect(selectionForBranch(skills, 'missing', null)).toBeNull()
  })
  it('terminates safely for historical cycles and long parent chains', () => {
    const sample=skills[0]
    expect(skillAncestorPath([{...sample,id:'a',parentId:'b'},{...sample,id:'b',parentId:'a'}],'a',null)).toEqual([])
    const chain=Array.from({length:10000},(_,index)=>({...sample,id:String(index),parentId:index?String(index-1):null}))
    expect(skillAncestorPath(chain,'9999',null)).toHaveLength(10001)
  })
})

describe('minimal camera movement and saved coordinates', () => {
  const free={left:20,top:30,right:620,bottom:530}
  const viewport={x:100,y:-200,zoom:1.25}
  it('leaves a fully visible node and zoom unchanged', () => {
    expect(viewportForVisibleNode({left:40,top:50,right:340,bottom:300},free,viewport)).toBe(viewport)
  })
  it('moves by exactly the overlap in screen pixels while keeping zoom', () => {
    expect(viewportForVisibleNode({left:500,top:400,right:800,bottom:650},free,viewport)).toEqual({x:-80,y:-320,zoom:1.25})
    expect(viewportForVisibleNode({left:-50,top:-10,right:200,bottom:200},free,viewport)).toEqual({x:170,y:-160,zoom:1.25})
  })
  it('keeps both pointer and keyboard movement in the existing coordinate system', () => {
    const original={x:-120.5,y:310.25}
    const moved=moveSkillWithKey(original,'ArrowRight')!
    expect(toTreePosition(moved).x-toTreePosition(original).x).toBeCloseTo(16)
    expect(moved.y).toBe(original.y)
    expect(moveSkillWithKey(moved,'ArrowLeft')!.x).toBeCloseTo(original.x)
    expect(moveSkillWithKey(original,'Enter')).toBeNull()
    const restored=fromTreePosition(toTreePosition(moved))
    expect(restored.x).toBeCloseTo(moved.x);expect(restored.y).toBeCloseTo(moved.y)
  })
})
