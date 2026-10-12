const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

module.exports = async ({ window, evaluate: run, waitFor, navigate }) => {
  window.showInactive(); window.setContentSize(1440,1000)
  const evaluate = async code => { try { return await run(code) } catch(error) { throw new Error(`Tree check: ${code}`,{cause:error}) } }
  const click = async selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const key = code => { window.webContents.sendInputEvent({type:'keyDown',keyCode:code});window.webContents.sendInputEvent({type:'keyUp',keyCode:code}) }
  const saved = async () => { await waitFor("Boolean(document.querySelector('.save-state--saved'))");return evaluate('window.lifeGame.loadState()') }
  const viewport = () => evaluate("{const m=new DOMMatrix(getComputedStyle(document.querySelector('.react-flow__viewport')).transform);({x:m.e,y:m.f,zoom:m.a})}")
  const settle = () => evaluate("new Promise(resolve=>setTimeout(resolve,250))")
  const select = async id => {
    await click(`.react-flow__node[data-id="${id}"] .skill-node-name`)
    await waitFor(`document.querySelector('.skill-flow-node.is-selected')?.dataset.id===${JSON.stringify(id)}`)
    await settle()
  }
  const visible = id => evaluate(`{
    const map=document.querySelector('.tree-map').getBoundingClientRect(), node=document.querySelector('.react-flow__node[data-id="${id}"]').getBoundingClientRect(), panel=document.querySelector('.skill-details').getBoundingClientRect();
    const overlays=panel.top<map.bottom && panel.left<map.right;
    node.left>=map.left+18 && node.top>=map.top+18 && node.right<=(overlays?panel.left-14:map.right-18) && node.bottom<=map.bottom-44;
  }`)
  const pan = async (dx,dy) => {
    await evaluate(`{
      const pane=document.querySelector('.react-flow__pane'), r=pane.getBoundingClientRect(), x=r.left+20,y=r.top+20;
      pane.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,view:window,button:0,buttons:1,clientX:x,clientY:y}));
      window.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,view:window,buttons:1,clientX:x+${dx},clientY:y+${dy}}));
      window.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,view:window,button:0,buttons:0,clientX:x+${dx},clientY:y+${dy}}));
    }`)
    await evaluate("new Promise(resolve=>setTimeout(resolve,40))")
  }
  const fill = async value => evaluate(`{const input=document.querySelector('.skill-form input[maxlength="60"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));}`)
  const submit = async () => { await click('.skill-form button[type=submit]');await waitFor("!document.querySelector('.skill-form')");await saved();await settle() }
  const shot = async (name,selector) => {
    if(!process.env.LIFE_GAME_SCREENSHOTS)return
    await evaluate("document.getAnimations().forEach(a=>{if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish()});document.fonts.ready")
    await settle()
    const rect=await evaluate(`{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();({x:Math.floor(r.left-4),y:Math.floor(r.top-4),width:Math.ceil(r.width+8),height:Math.ceil(r.height+8)})}`)
    fs.mkdirSync(process.env.LIFE_GAME_SCREENSHOTS,{recursive:true})
    fs.writeFileSync(path.join(process.env.LIFE_GAME_SCREENSHOTS,name+'.png'),(await window.webContents.capturePage(rect)).toPNG())
  }
  await navigate(2,'.react-flow__node');await waitFor("document.querySelector('.tree-map')?.dataset.viewportReady==='true'");await settle()
  if(process.env.LIFE_GAME_SMOKE==='tree-ux-persist') {
    const expected=JSON.parse(fs.readFileSync(path.join(process.env.LIFE_GAME_USER_DATA,'tree-ux-position.json'),'utf8'))
    const restored=(await saved()).skills.find(skill=>skill.id==='reading')
    assert.deepEqual(restored.position,expected)
    const shown=await evaluate("{const m=new DOMMatrix(getComputedStyle(document.querySelector('.react-flow__node[data-id=reading]')).transform);({x:m.e,y:m.f})}")
    assert.ok(Math.abs(shown.x-expected.x*1.4)<.01 && Math.abs(shown.y-expected.y*1.15)<.01)
    return
  }
  let initial=await saved()
  await select('career')
  const heroBefore=await evaluate("document.querySelector('.react-flow__node[data-id=player-root]').style.transform")
  const rootBefore=(await saved()).skills.find(skill=>skill.id==='career').position
  await evaluate("document.querySelector('.skill-flow-node.is-selected .skill-node-name').focus()")
  key('Right')
  await waitFor(`window.lifeGame.loadState().then(state=>state.skills.find(skill=>skill.id==='career').position.x>${rootBefore.x})`)
  assert.equal(await evaluate("document.querySelector('.react-flow__node[data-id=player-root]').style.transform"),heroBefore,'Hero coordinates stay fixed when a root skill moves')
  key('Left')
  await waitFor(`window.lifeGame.loadState().then(state=>Math.abs(state.skills.find(skill=>skill.id==='career').position.x-${rootBefore.x})<.001)`)
  await click('.skill-details__close');await settle()
  initial=await saved()
  const target='reading'
  const box=await evaluate("{const map=document.querySelector('.tree-map').getBoundingClientRect(),node=document.querySelector('.react-flow__node[data-id=reading]').getBoundingClientRect();({dx:map.right-160-node.left,dy:map.top+150-node.top})}")
  await pan(box.dx,box.dy)
  const beforeSelect=await viewport()
  await select(target)
  await waitFor("{const n=document.querySelector('.react-flow__node[data-id=reading]').getBoundingClientRect(),p=document.querySelector('.skill-details').getBoundingClientRect();n.right<=p.left-14}")
  const afterSelect=await viewport()
  assert.ok(Math.abs(afterSelect.zoom-beforeSelect.zoom)<.00001,'Selection preserves zoom')
  const focusGeometry=await evaluate("{const m=document.querySelector('.tree-map').getBoundingClientRect(),n=document.querySelector('.react-flow__node[data-id=reading]').getBoundingClientRect(),p=document.querySelector('.skill-details').getBoundingClientRect();({map:m.toJSON(),node:n.toJSON(),panel:p.toJSON()})}")
  assert.equal(await visible(target),true,`Selected node must be left of the actual panel: ${JSON.stringify({focusGeometry,beforeSelect,afterSelect})}`)
  assert.notEqual(afterSelect.x,beforeSelect.x,'Overlapped node triggers camera movement')
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.react-flow__edge.is-path-highlighted')].map(edge=>edge.dataset.id).sort()"),['growth-reading','player-root-growth'])
  assert.equal(await evaluate("document.querySelectorAll('.skill-node-add-child').length"),1)
  assert.equal(await evaluate("document.querySelectorAll('.skill-node-drag-handle').length"),0)
  const stable=await viewport();await select(target)
  assert.deepEqual(await viewport(),stable,'Repeated selection does not jump')
  await click('.skill-details__close');await settle()
  assert.equal(await evaluate("document.querySelectorAll('.is-path-highlighted').length"),0)
  assert.deepEqual(await viewport(),stable,'Closing details does not reset the viewport')
  await select(target)
  assert.deepEqual(await viewport(),stable,'Already visible node needs no camera movement')
  await evaluate("[...document.querySelectorAll('.tree-view-actions button')].find(button=>button.textContent==='Показать всё').click()")
  await evaluate("new Promise(resolve=>setTimeout(resolve,500))")
  assert.equal(await visible(target),true,'Explicit fit keeps the selected node outside the panel')
  const cancelViewport=await viewport()
  await shot('tree-selected-panel','.tree-canvas')
  await shot('tree-node-actions','.skill-flow-node.is-selected')
  // Cancelling from either add action preserves selection, camera and stored skills.
  await click('.skill-node-add-child');await waitFor("document.querySelector('.skill-form select')?.value==='reading'")
  await fill('Одинаковое название')
  await click('.skill-form .form-actions button[type=button]');await waitFor("!document.querySelector('.skill-form')")
  assert.deepEqual((await saved()).skills,initial.skills);assert.deepEqual(await viewport(),cancelViewport)
  assert.equal(await evaluate("document.querySelector('.skill-flow-node.is-selected').dataset.id"),target)
  // Exact ids, not titles: both children use the same title, but each selects itself.
  const beforeIds=new Set(initial.skills.map(skill=>skill.id))
  await click('.skill-node-add-child');await waitFor("document.querySelector('.skill-form select')?.value==='reading'")
  await fill('Одинаковое название');await submit()
  let state=await saved()
  const first=state.skills.find(skill=>!beforeIds.has(skill.id))
  assert.equal(first.parentId,target)
  assert.equal(await evaluate("document.querySelector('.skill-flow-node.is-selected').dataset.id"),first.id)
  assert.equal(await visible(first.id),true)
  for(const skill of initial.skills)assert.deepEqual(state.skills.find(value=>value.id===skill.id).position,skill.position)
  await select(target)
  await click('.skill-add-child');await waitFor("document.querySelector('.skill-form select')?.value==='reading'")
  await fill('Одинаковое название');await submit()
  state=await saved()
  const second=state.skills.find(skill=>!beforeIds.has(skill.id)&&skill.id!==first.id)
  assert.equal(second.parentId,target);assert.notEqual(second.id,first.id)
  assert.equal(await evaluate("document.querySelector('.skill-flow-node.is-selected').dataset.id"),second.id)
  assert.equal(await visible(second.id),true)
  await evaluate("[...document.querySelectorAll('.branch-tabs > button')].find(button=>button.textContent==='Развитие').click()")
  await waitFor("!document.querySelector('.react-flow__node[data-id=player-root]')")
  await waitFor("document.querySelectorAll('.react-flow__edge.is-path-highlighted').length===2")
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.react-flow__edge.is-path-highlighted')].map(edge=>edge.dataset.id).sort()"),[`growth-reading`,`reading-${second.id}`].sort())
  await evaluate("[...document.querySelectorAll('.branch-tabs > button')].find(button=>button.textContent==='Здоровье').click()")
  await waitFor("!document.querySelector('.skill-details')")
  assert.equal(await evaluate("document.querySelectorAll('.skill-node-add-child').length"),0)
  await click('.branch-tabs > button');await waitFor("Boolean(document.querySelector('.react-flow__node[data-id=reading]'))")
  await select(target)
  const original=(await saved()).skills.find(skill=>skill.id===target)
  // Both the title and the card body can drag; + remains a separate creation action.
  const drag = async (selector,dx,dy) => {
    const point=await evaluate(`{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})}`)
    window.webContents.sendInputEvent({type:'mouseDown',...point,button:'left',clickCount:1})
    window.webContents.sendInputEvent({type:'mouseMove',x:point.x+2,y:point.y+1,button:'left'})
    await evaluate("new Promise(resolve=>setTimeout(resolve,20))")
    window.webContents.sendInputEvent({type:'mouseMove',x:point.x+dx,y:point.y+dy,button:'left'})
    await evaluate("new Promise(resolve=>setTimeout(resolve,30))")
    window.webContents.sendInputEvent({type:'mouseUp',x:point.x+dx,y:point.y+dy,button:'left',clickCount:1})
    await settle()
  }
  await drag('.skill-flow-node.is-selected .skill-node-name',35,15)
  const afterTitle=(await saved()).skills.find(skill=>skill.id===target)
  assert.notDeepEqual(afterTitle.position,original.position)
  const dragZoom=(await viewport()).zoom
  await drag('.skill-flow-node.is-selected .skill-node-label__top > span',40,20)
  let moved=(await saved()).skills.find(skill=>skill.id===target)
  assert.ok(Math.abs((moved.position.x-afterTitle.position.x)*1.4-38/dragZoom)<3,JSON.stringify({original:afterTitle.position,moved:moved.position,dragZoom,viewport:await viewport()}))
  assert.equal(moved.parentId,original.parentId)
  await evaluate("document.querySelector('.skill-flow-node.is-selected .skill-node-name').focus()")
  const beforeKey=moved.position
  key('Right');await waitFor(`window.lifeGame.loadState().then(state=>state.skills.find(skill=>skill.id==='reading').position.x>${beforeKey.x})`)
  moved=(await saved()).skills.find(skill=>skill.id===target)
  assert.ok(Math.abs((moved.position.x-beforeKey.x)*1.4-16)<.01)
  assert.equal(await evaluate("document.activeElement.matches('.skill-node-name:focus-visible')"),true)
  key('Backspace');await settle()
  assert.equal(await evaluate("document.querySelectorAll('.skill-flow-node').length"),(await saved()).skills.length,'Keyboard handle cannot delete unsaved visual nodes')
  // Persist coordinates through a real renderer restart without rearranging other nodes.
  const loaded=new Promise(resolve=>window.webContents.once('did-finish-load',resolve))
  window.reload();await loaded;await waitFor("Boolean(document.querySelector('.main-nav button'))");await navigate(2,'.react-flow__node')
  assert.deepEqual((await saved()).skills.find(skill=>skill.id===target).position,moved.position)
  await select(target)
  window.setMinimumSize(360,600)
  for(const theme of ['minimalism','texture','night-sky']) {
    await evaluate(`document.querySelector('.app-shell').dataset.background=${JSON.stringify(theme)}`)
    window.setContentSize(390,1000);await settle()
    assert.equal(await evaluate("{const map=document.querySelector('.tree-map').getBoundingClientRect(),panel=document.querySelector('.skill-details').getBoundingClientRect();panel.top>=map.bottom && panel.right<=innerWidth}"),true)
    assert.equal(await visible(target),true)
    assert.equal(await evaluate("document.querySelector('.tree-canvas').scrollWidth<=document.querySelector('.tree-canvas').clientWidth"),true)
  }
  // Root creation remains independent even in a branch view.
  window.setContentSize(1440,1000);await settle()
  await click('.tree-page .page-header button');await waitFor("Boolean(document.querySelector('.skill-form'))")
  assert.equal(await evaluate("document.querySelector('.skill-form select').value"),'')
  await fill('Самостоятельная ветка');await submit()
  state=await saved();const root=state.skills.find(skill=>skill.name==='Самостоятельная ветка')
  assert.equal(root.parentId,null);assert.equal(await evaluate("document.querySelector('.skill-flow-node.is-selected').dataset.id"),root.id)
  // Large trees, a locked long title and reduced motion use the same camera/path mechanisms.
  await evaluate(`(async()=>{const state=await window.lifeGame.loadState(),sample=state.skills.find(skill=>skill.id==='reading');
    state.skills.find(skill=>skill.id==='reading').name='Длинное название выбранного навыка для проверки дерева';
    state.skills.find(skill=>skill.id==='reading').requiredParentLevel=5;
    for(let i=0;i<30;i++)state.skills.push({...sample,id:'tree-extra-'+i,name:'Дополнительный навык '+i,parentId:'growth',position:{x:600+(i%5)*210,y:800+Math.floor(i/5)*220}});
    await window.lifeGame.saveState(state);
  })()`)
  const reloaded=new Promise(resolve=>window.webContents.once('did-finish-load',resolve));window.reload();await reloaded;await waitFor("Boolean(document.querySelector('.main-nav button'))");await navigate(2,'.react-flow__node')
  window.webContents.debugger.attach('1.3')
  await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  assert.equal(await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"),true)
  await select(target);assert.equal(await visible(target),true)
  assert.equal(await evaluate("document.querySelector('.skill-flow-node.is-selected').classList.contains('is-locked')"),true)
  assert.match(await evaluate("document.querySelector('.skill-details').textContent"),/Требуется 5 уровень/)
  const noAnimation=await viewport();await settle();assert.deepEqual(await viewport(),noAnimation)
  window.webContents.debugger.detach()
  state=await saved();assert.deepEqual(state.profile,initial.profile);assert.deepEqual(state.quests,initial.quests);assert.deepEqual(state.history,initial.history)
  fs.writeFileSync(path.join(process.env.LIFE_GAME_USER_DATA,'tree-ux-position.json'),JSON.stringify(state.skills.find(skill=>skill.id===target).position))
}
