const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

module.exports = async ({ window, evaluate: run, waitFor, navigate }) => {
  const evaluate = async code => {
    try { return await run(code) }
    catch(error) { throw new Error(`Skill picker renderer check failed: ${code}`, { cause:error }) }
  }
  await navigate(2, '.react-flow__node')
  await waitFor("Boolean(document.querySelector('.save-state--saved'))")
  await evaluate(`(async () => {
    const state=await window.lifeGame.loadState();
    state.skills.find(skill=>skill.id==='reading').icon='🐙';
    state.skills.find(skill=>skill.id==='health').icon='❤️';
    await window.lifeGame.saveState(state);
  })()`)
  const loaded=new Promise(resolve=>window.webContents.once('did-finish-load',resolve))
  window.reload();await loaded
  await waitFor("Boolean(document.querySelector('.main-nav button'))")
  await navigate(2,'.react-flow__node')
  const click=async selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const fill=async (selector,value)=>evaluate(`{
    const input=document.querySelector(${JSON.stringify(selector)});
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }`)
  const saved=async()=>{await waitFor("Boolean(document.querySelector('.save-state--saved'))");return evaluate('window.lifeGame.loadState()')}
  const openPicker=async()=>{await click('.skill-icon-trigger');await waitFor("Boolean(document.querySelector('.skill-icon-panel'))")}
  const choose=async name=>{
    await click(`.skill-icon-picker button[aria-label="${name}"]`)
    await waitFor("!document.querySelector('.skill-icon-panel')")
    assert.equal(await evaluate("document.activeElement.matches('.skill-icon-trigger')"),true)
  }
  const openEdit=async id=>{
    const name=await evaluate(`window.lifeGame.loadState().then(state=>state.skills.find(skill=>skill.id===${JSON.stringify(id)}).name)`)
    await click(`.react-flow__node[data-id="${id}"]`)
    await waitFor(`document.querySelector('.skill-details h2')?.textContent===${JSON.stringify(name)}`)
    await click('.skill-details__actions button')
    await waitFor(`document.querySelector('.skill-form input[maxlength="60"]')?.value===${JSON.stringify(name)}`)
    assert.equal(await evaluate("Boolean(document.querySelector('.skill-icon-panel'))"),false)
  }
  const cancel=async()=>{await click('.skill-form .form-actions button[type=button]');await waitFor("!document.querySelector('.skill-form')")}
  const key=code=>{
    window.webContents.sendInputEvent({type:'keyDown',keyCode:code})
    if(code==='Enter')window.webContents.sendInputEvent({type:'char',keyCode:'\r'})
    window.webContents.sendInputEvent({type:'keyUp',keyCode:code})
  }
  const screenshot=async name=>{
    if(!process.env.LIFE_GAME_SCREENSHOTS)return
    window.showInactive()
    await evaluate("document.querySelector('[role=dialog]').scrollTop=0;document.getAnimations().forEach(a=>{if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish()});document.fonts.ready")
    await evaluate("new Promise(resolve=>setTimeout(resolve,200))")
    const rect=await evaluate("{const r=document.querySelector('[role=dialog]').getBoundingClientRect();({x:Math.floor(r.left),y:Math.floor(r.top),width:Math.ceil(r.width),height:Math.ceil(r.height)})}")
    fs.mkdirSync(process.env.LIFE_GAME_SCREENSHOTS,{recursive:true})
    fs.writeFileSync(path.join(process.env.LIFE_GAME_SCREENSHOTS,name+'.png'),(await window.webContents.capturePage(rect)).toPNG())
  }
  // Unknown original icon remains available even after another draft choice.
  await openEdit('reading')
  assert.match(await evaluate("document.querySelector('.skill-icon-trigger').textContent"),/Пользовательская иконка/)
  await openPicker()
  assert.equal(await evaluate("document.activeElement.type"),'search')
  assert.equal(await evaluate("document.querySelector('.skill-icon-trigger').getAttribute('aria-controls')===document.querySelector('.skill-icon-panel').id"),true)
  await fill('.skill-icon-panel input','  КОД  ')
  await waitFor("Boolean(document.querySelector('.skill-icon-picker button[aria-label=Программирование]'))")
  await choose('Программирование')
  assert.match(await evaluate("document.querySelector('.skill-icon-trigger').textContent"),/Программирование/)
  assert.equal((await saved()).skills.find(skill=>skill.id==='reading').icon,'🐙','Choosing an icon must not save the skill')
  await openPicker()
  assert.equal(await evaluate("document.querySelector('.skill-icon-panel input').value"),'')
  await choose('Пользовательская иконка')
  assert.equal(await evaluate("document.querySelector('.skill-icon-trigger span').textContent"),'🐙')
  await openPicker();await fill('.skill-icon-panel input','zzzz-no-match')
  await waitFor("document.querySelector('.skill-icon-panel [role=status]')?.textContent==='Иконки не найдены'")
  assert.equal(await evaluate("document.querySelectorAll('.skill-icon-picker button').length"),0)
  key('Escape')
  await waitFor("!document.querySelector('.skill-icon-panel')")
  assert.equal(await evaluate("Boolean(document.querySelector('.skill-form'))"),true)
  assert.equal(await evaluate("document.activeElement.className"),'skill-icon-trigger','Keyboard selection returns focus to the trigger')
  assert.equal(await evaluate("document.activeElement.matches('.skill-icon-trigger')"),true)
  await openPicker()
  await evaluate("document.querySelector('[role=dialog] .modal-header button').focus()")
  key('Escape')
  await waitFor("!document.querySelector('.skill-icon-panel')")
  assert.equal(await evaluate("Boolean(document.querySelector('.skill-form'))"),true,'Escape from the dialog header only closes the picker')
  assert.equal(await evaluate("document.activeElement.matches('.skill-icon-trigger')"),true)
  await openPicker();await choose('Гитара');await cancel()
  assert.equal((await saved()).skills.find(skill=>skill.id==='reading').icon,'🐙','Cancelling discards draft icon')
  await openEdit('reading');await click('.skill-form button[type=submit]')
  await waitFor("!document.querySelector('.skill-form')")
  assert.equal((await saved()).skills.find(skill=>skill.id==='reading').icon,'🐙','Saving unchanged custom icon preserves it')
  await openEdit('health')
  assert.match(await evaluate("document.querySelector('.skill-icon-trigger').textContent"),/Здоровье/)
  await click('.skill-form button[type=submit]');await waitFor("!document.querySelector('.skill-form')")
  assert.equal((await saved()).skills.find(skill=>skill.id==='health').icon,'❤️','Saving keeps the existing alias as stored')
  // Create a root skill; selecting an icon never submits the populated form.
  await click('.tree-page .page-header button')
  await waitFor("Boolean(document.querySelector('.skill-form'))")
  await fill('.skill-form input[maxlength="60"]','Дизайн интерфейсов')
  await openPicker();await choose('Рисование')
  assert.equal((await saved()).skills.length,8)
  window.setMinimumSize(360,600);window.setContentSize(1100,1100)
  await screenshot('skill-picker-closed')
  await openPicker()
  assert.equal(await evaluate("document.querySelectorAll('.skill-icon-picker button').length"),120)
  assert.equal(await evaluate("document.querySelectorAll('.skill-icon-picker button[aria-pressed=true]').length"),1)
  await screenshot('skill-picker-open')
  // Measure settled hit areas even when screenshots (which finish animations) are disabled.
  await evaluate("document.getAnimations().forEach(a=>{if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish()})")
  for(const theme of ['minimalism','texture','night-sky']) {
    await evaluate(`document.querySelector('.app-shell').dataset.background=${JSON.stringify(theme)}`)
    for(const width of [1100,390]) {
      window.setContentSize(width,1100)
      await evaluate("new Promise(resolve=>setTimeout(resolve,30))")
      const layout=await evaluate(`{
        const grid=document.querySelector('.skill-icon-picker'), panel=document.querySelector('.skill-icon-panel');
        ({overflow:grid.scrollWidth>grid.clientWidth||panel.scrollWidth>panel.clientWidth,
          height:grid.clientHeight,scrolls:grid.scrollHeight>grid.clientHeight,
          targets:[...grid.querySelectorAll('button')].every(button=>{const r=button.getBoundingClientRect();return r.width>=43.5&&r.height>=43.5}),
          buttonTypes:[...panel.querySelectorAll('button')].every(button=>button.type==='button')});
      }`)
      assert.equal(layout.overflow,false);assert.ok(layout.height<=280)
      assert.equal(layout.scrolls,true);assert.equal(layout.targets,true);assert.equal(layout.buttonTypes,true)
    }
  }
  await evaluate("document.querySelector('.skill-icon-picker').scrollTop=200")
  assert.ok(await evaluate("document.querySelector('.skill-icon-picker').scrollTop>0"))
  await click('.skill-icon-trigger');await waitFor("!document.querySelector('.skill-icon-panel')")
  await openPicker()
  key('Tab')
  await waitFor("document.activeElement.matches('.skill-icon-picker button')")
  assert.equal(await evaluate("document.activeElement.matches(':focus-visible')"),true)
  assert.notEqual(await evaluate("getComputedStyle(document.activeElement).outlineStyle"),'none')
  window.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab',modifiers:['shift']})
  window.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab',modifiers:['shift']})
  await waitFor("document.activeElement.type==='search'")
  key('Tab');key('Space')
  await waitFor("!document.querySelector('.skill-icon-panel')")
  assert.equal(await evaluate("Boolean(document.querySelector('.skill-form'))"),true)
  key('Enter');await waitFor("Boolean(document.querySelector('.skill-icon-panel'))")
  await choose('Рисование')
  await click('.skill-form button[type=submit]');await waitFor("!document.querySelector('.skill-form')")
  const root=(await saved()).skills.find(skill=>skill.name==='Дизайн интерфейсов')
  assert.equal(root.icon,'palette');assert.equal(root.parentId,null)
  window.setContentSize(1440,900)
  await openEdit(root.id)
  assert.match(await evaluate("document.querySelector('.skill-icon-trigger').textContent"),/Рисование/)
  key('Escape');await waitFor("!document.querySelector('.skill-form')")
  // Add a child through the existing tree action and keep its parent.
  await click('.react-flow__node[data-id="growth"]');await waitFor("document.querySelector('.skill-details h2')?.textContent==='Развитие'")
  await click('.skill-add-child');await waitFor("document.querySelector('.skill-form select')?.value==='growth'")
  assert.equal(await evaluate("document.querySelector('.skill-form select').value"),'growth')
  await fill('.skill-form input[maxlength="60"]','История искусства')
  await openPicker();await choose('История')
  await click('.skill-form button[type=submit]');await waitFor("!document.querySelector('.skill-form')")
  const state=await saved(), child=state.skills.find(skill=>skill.name==='История искусства')
  assert.equal(child.icon,'history');assert.equal(child.parentId,'growth')
  await openEdit(child.id);await openPicker();await choose('Чтение')
  await click('.skill-form button[type=submit]');await waitFor("!document.querySelector('.skill-form')")
  assert.equal((await saved()).skills.find(skill=>skill.id===child.id).icon,'▤')
  const reloaded=new Promise(resolve=>window.webContents.once('did-finish-load',resolve))
  window.reload();await reloaded;await waitFor("Boolean(document.querySelector('.main-nav button'))");await navigate(2,'.react-flow__node')
  await openEdit(child.id)
  assert.match(await evaluate("document.querySelector('.skill-icon-trigger').textContent"),/Чтение/)
  assert.equal(await evaluate("Boolean(document.querySelector('.skill-icon-panel'))"),false)
  await cancel()
}
