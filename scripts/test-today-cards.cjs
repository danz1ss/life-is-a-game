const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

module.exports = async ({ window, evaluate, waitFor, navigate }) => {
  await navigate(0, '.g-day-board')
  await waitFor("Boolean(document.querySelector('.save-state--saved'))")
  await evaluate(`(async () => {
    const state = await window.lifeGame.loadState();
    const base = state.quests[0], today = base.dueDate;
    state.quests = [
      {...base,id:'today-main',title:'Подготовить первую версию приложения',description:'Проверить основные сценарии и собрать изменения для следующего выпуска.',difficulty:'medium',scheduledTime:'10:00',durationMinutes:90,repeatDays:[],completedDates:[],skippedDates:[],order:0},
      {...base,id:'today-long',title:'Разобрать заметки по проекту и подготовить подробный план дальнейших изменений',description:'Собрать вопросы, проверить длинное описание и уточнить следующий шаг. '.repeat(2),skillId:null,difficulty:'easy',scheduledTime:'11:00',durationMinutes:30,repeatDays:[],completedDates:[],skippedDates:[],order:1},
      {...base,id:'today-done',title:'Прочитать главу книги',description:'Выполненная задача остаётся различимой.',skillId:'reading',difficulty:'easy',scheduledTime:'12:00',durationMinutes:30,repeatDays:[],completedDates:[today],skippedDates:[],order:2},
      {...base,id:'today-skipped',title:'Сделать тренировку',description:'',skillId:'sport',difficulty:'hard',scheduledTime:null,durationMinutes:45,repeatDays:[],completedDates:[],skippedDates:[today],order:3}
    ];
    state.dayPlans[today] = {mainQuestId:'today-main',questOrder:state.quests.map(q=>q.id)};
    await window.lifeGame.saveState(state);
  })()`)
  const loaded = new Promise(resolve => window.webContents.once('did-finish-load', resolve))
  window.reload(); await loaded
  await waitFor("document.querySelectorAll('.g-list .quest-card').length === 4")
  const focusTrigger = '.g-skills-focus-trigger'
  const openFocus = async () => {
    await evaluate(`document.querySelector('${focusTrigger}').focus(); document.querySelector('${focusTrigger}').click()`)
    await waitFor("Boolean(document.querySelector('.g-skills-picker'))")
    assert.equal(await evaluate("Boolean(document.activeElement.closest('.g-skills-picker'))"), true)
  }
  const chooseFocus = async id => {
    await openFocus()
    await evaluate(`document.querySelector('[data-focus-id="${id}"]').click()`)
    await waitFor(`document.querySelector('.g-skills-list').firstElementChild.matches('.g-skill-focus[data-skill-id="${id}"]')`)
    assert.equal(await evaluate(`document.activeElement.matches('${focusTrigger}')`), true)
  }
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.g-skills-list > li')].map(item => item.dataset.skillId)"), ['sport', 'reading', 'english', 'programming'])
  await chooseFocus('reading')
  await chooseFocus('programming')
  await waitFor("window.lifeGame.loadState().then(state => state.profile.focusSkillId === 'programming')")
  const focusReload = new Promise(resolve => window.webContents.once('did-finish-load', resolve))
  window.reload(); await focusReload
  await waitFor("document.querySelector('.g-skill-focus')?.dataset.skillId === 'programming'")
  window.setMinimumSize(360, 600)
  for (const width of [1440, 1024, 390]) {
    window.setContentSize(width, 1400)
    await waitFor(`innerWidth === ${width}`)
    const layout = await evaluate(`{
      const list = document.querySelector('.g-skills-list');
      const card = list.firstElementChild;
      const header = document.querySelector('.g-skills-header');
      ({ fullWidth: card.clientWidth + 2 === list.clientWidth, headerFits: header.scrollWidth <= header.clientWidth });
    }`)
    assert.deepEqual(layout, { fullWidth: true, headerFits: true })
  }
  await openFocus()
  assert.equal(await evaluate("document.querySelector('[data-focus-id=programming]').getAttribute('aria-pressed')"), 'true')
  await evaluate("document.querySelector('.g-skills-focus-clear').click()")
  await waitFor("!document.querySelector('.g-skill-focus')")
  await waitFor("window.lifeGame.loadState().then(state => state.profile.focusSkillId === null)")
  const row = id => `.g-list [data-reorder-id="${id}"]`
  const click = async selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const main = row('today-main')
  const layoutCheck = async () => {
    const result = await evaluate(`{
      const cards=[...document.querySelectorAll('.g-list .quest-card')];
      const main=document.querySelector(${JSON.stringify(main + ' .quest-card')});
      const ordinary=document.querySelector(${JSON.stringify(row('today-long') + ' .quest-card')});
      const a=main.querySelector('h3').getBoundingClientRect(), b=ordinary.querySelector('h3').getBoundingClientRect();
      ({
        overflow:cards.some(card=>card.scrollWidth>card.clientWidth),
        titlesAligned:Math.abs(a.left-b.left)<1,
        stripe:{width:getComputedStyle(main,'::before').width,left:getComputedStyle(main,'::before').left,border:getComputedStyle(main,'::before').borderLeftWidth,radius:getComputedStyle(main,'::before').borderTopLeftRadius,color:getComputedStyle(main,'::before').borderLeftColor},
        rewards:cards.every(card=>card.querySelectorAll('.g-quest-rewards').length===1 && !card.querySelector('.quest-meta') && card.querySelectorAll('.lucide-coins').length===1),
        overlap:cards.some(card=>{const reward=card.querySelector('.g-quest-rewards').getBoundingClientRect(), time=card.querySelector('.g-time-duration').getBoundingClientRect();return reward.left<time.right-1 && reward.right>time.left+1 && reward.top<time.bottom-1 && reward.bottom>time.top+1}),
        timesAligned:cards.every(card=>Math.abs(card.querySelector('.g-time-duration button').getBoundingClientRect().left - cards[0].querySelector('.g-time-duration button').getBoundingClientRect().left)<1),
        rewardsAligned:cards.every(card=>{
          const footer=card.querySelector('.quest-card__footer').getBoundingClientRect();
          const reward=card.querySelector('.g-quest-rewards').getBoundingClientRect();
          return Math.abs(reward.right-footer.right)<1 && card.getBoundingClientRect().right-reward.right>=14;
        }),
        conflict:main.querySelector('.g-time-conflict')?.textContent,
        conflictBelow:main.querySelector('.g-time-conflict').getBoundingClientRect().top>=main.querySelector('.quest-card__footer').getBoundingClientRect().bottom-1,
        mainLabel:main.querySelector('.g-main-label').getBoundingClientRect().right<=main.querySelector('.quest-actions').getBoundingClientRect().left,
        ordinaryStripe:getComputedStyle(ordinary,'::before').content,
        states:[cards[2].classList.contains('is-complete'),cards[3].classList.contains('is-skipped')],
        order:main.querySelector('.quest-result-actions').getBoundingClientRect().right <= a.left && a.right <= main.querySelector('.quest-actions').getBoundingClientRect().left+1,
        handleBefore:document.querySelector(${JSON.stringify(main+' .g-quest-handle')}).getBoundingClientRect().left < main.querySelector('.quest-check').getBoundingClientRect().left
      });
    }`)
    assert.equal(result.overflow,false); assert.equal(result.overlap,false)
    assert.equal(result.titlesAligned,true); assert.equal(result.rewards,true)
    assert.equal(result.timesAligned,true)
    assert.equal(result.rewardsAligned,true,'Rewards share the right edge with room between the coins and the card border')
    assert.equal(result.stripe.width,'13px'); assert.ok(parseFloat(result.stripe.border)>=2.3 && parseFloat(result.stripe.border)<=3.1, 'Accent border stays about 3 CSS pixels after device-pixel rounding'); assert.equal(result.stripe.radius,'13px'); assert.equal(result.stripe.left,'-1px')
    assert.equal(result.ordinaryStripe,'none'); assert.deepEqual(result.states,[true,true])
    assert.equal(result.order,true); assert.equal(result.handleBefore,true)
    assert.equal(result.conflictBelow,true); assert.equal(result.mainLabel,true)
    assert.match(result.conflict,/Время пересекается/)
    return result
  }
  window.setMinimumSize(360,600)
  for (const theme of ['minimalism','texture','night-sky']) {
    await evaluate(`document.querySelector('.app-shell').dataset.background=${JSON.stringify(theme)}`)
    for (const width of [1440,768,390]) {
      window.setContentSize(width,1400)
      await evaluate("new Promise(resolve=>setTimeout(resolve,30))")
      await layoutCheck()
    }
  }
  window.setContentSize(1440,1400)
  await evaluate("document.querySelector('.app-shell').dataset.background='minimalism'")
  await evaluate("new Promise(resolve=>setTimeout(resolve,250))")
  // Hover preserves the left accent and the main quest's original fill.
  const beforeHover = await evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(main+' .quest-card')})).backgroundColor`)
  const point = await evaluate(`{const r=document.querySelector(${JSON.stringify(main+' .quest-card')}).getBoundingClientRect();({x:Math.round(r.left+10),y:Math.round(r.top+10)})}`)
  window.webContents.sendInputEvent({type:'mouseMove',...point})
  await evaluate("new Promise(resolve=>setTimeout(resolve,180))")
  assert.equal(await evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(main+' .quest-card')})).backgroundColor`),beforeHover)
  await layoutCheck()
  await click(main+' .g-time-summary button')
  await waitFor("Boolean(document.querySelector('.g-time-editor'))")
  for (const width of [1440,390]) {
    window.setContentSize(width,1400)
    await evaluate("new Promise(resolve=>setTimeout(resolve,30))")
    await layoutCheck()
  }
  await click('.g-time-editor-actions button:last-child')
  await waitFor("!document.querySelector('.g-time-editor')")
  await click(main+' .quest-actions__trigger')
  await waitFor("Boolean(document.querySelector('.quest-actions__menu'))")
  assert.equal(await evaluate("{const r=document.querySelector('.quest-actions__menu').getBoundingClientRect();r.left>=0 && r.right<=innerWidth}"),true,'Menu fits the narrow viewport')
  await click(main+' .quest-actions__trigger')
  window.setContentSize(1440,1400)
  await evaluate("[...document.querySelectorAll('.g-view-switch button')].find(button=>button.textContent==='Расписание').click()")
  await waitFor("Boolean(document.querySelector('.g-schedule-selected .g-quest-rewards'))")
  assert.equal(await evaluate("document.querySelectorAll('.g-schedule-selected .g-quest-rewards').length"),1)
  assert.match(await evaluate("document.querySelector('.g-schedule-selected .g-time-conflict').textContent"),/Время пересекается/)
  await evaluate("[...document.querySelectorAll('.g-view-switch button')].find(button=>button.textContent==='Список').click()")
  await waitFor("document.querySelectorAll('.g-list .quest-card').length===4")
  // Both result controls work and can be undone.
  await click(main+' .quest-check'); await waitFor(`document.querySelector(${JSON.stringify(main+' .quest-card')}).classList.contains('is-complete')`)
  await click(main+' .quest-check'); await waitFor(`!document.querySelector(${JSON.stringify(main+' .quest-card')}).classList.contains('is-complete')`)
  await click(main+' .quest-skip'); await waitFor(`document.querySelector(${JSON.stringify(main+' .quest-card')}).classList.contains('is-skipped')`)
  await click(main+' .quest-skip'); await waitFor(`!document.querySelector(${JSON.stringify(main+' .quest-card')}).classList.contains('is-skipped')`)
  await click(main+' .quest-actions__trigger'); await waitFor("Boolean(document.querySelector('.quest-actions__menu'))")
  assert.equal(await evaluate("document.querySelector('.quest-actions__menu').getBoundingClientRect().width>0"),true)
  await click('.quest-actions__menu button'); await waitFor("Boolean(document.querySelector('[role=dialog] textarea'))")
  await evaluate("{const input=document.querySelector('[role=dialog] textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'Проверенное описание');input.dispatchEvent(new Event('input',{bubbles:true}));}")
  await click('[role=dialog] button[type=submit]'); await waitFor(`document.querySelector(${JSON.stringify(main)}).textContent.includes('Проверенное описание')`)
  await click(main+' .quest-actions__trigger'); await waitFor("Boolean(document.querySelector('.quest-actions__menu'))")
  await click('.quest-actions__delete'); await waitFor(`!document.querySelector(${JSON.stringify(main)})`)
  await click('.delete-toast button'); await waitFor(`Boolean(document.querySelector(${JSON.stringify(main)}))`)
  const ids = () => evaluate("[...document.querySelectorAll('.g-list [data-reorder-id]')].map(row=>row.dataset.reorderId)")
  const originalOrder = await ids()
  // Different execution times override manual moves.
  await evaluate(`document.querySelector(${JSON.stringify(main+' .g-quest-handle')}).focus()`)
  window.webContents.sendInputEvent({type:'keyDown',keyCode:'Down',modifiers:['alt']})
  window.webContents.sendInputEvent({type:'keyUp',keyCode:'Down',modifiers:['alt']})
  await evaluate("new Promise(resolve=>setTimeout(resolve,30))")
  assert.deepEqual(await ids(),originalOrder)
  // Matching times still allow the existing keyboard and pointer reordering.
  await click(row('today-long')+' .g-time-duration button')
  await waitFor(`Boolean(document.querySelector(${JSON.stringify(row('today-long')+' input[type=time]')}))`)
  await evaluate(`{const input=document.querySelector(${JSON.stringify(row('today-long')+' input[type=time]')});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'10:00');input.dispatchEvent(new Event('input',{bubbles:true}));}`)
  await click(row('today-long')+' .g-time-editor-actions button:last-child')
  await evaluate(`document.querySelector(${JSON.stringify(main+' .g-quest-handle')}).focus()`)
  for (const key of ['Down','Up']) {
    window.webContents.sendInputEvent({type:'keyDown',keyCode:key,modifiers:['alt']})
    window.webContents.sendInputEvent({type:'keyUp',keyCode:key,modifiers:['alt']})
    await evaluate("new Promise(resolve=>setTimeout(resolve,30))")
    if(key==='Down') assert.notDeepEqual(await ids(),originalOrder)
  }
  assert.deepEqual(await ids(),originalOrder)
  // Use real pointer input at the existing handle, not drag listeners on the card.
  window.showInactive()
  await evaluate("document.querySelector('.g-day-board').scrollIntoView({block:'start'})")
  await evaluate("document.getAnimations().forEach(a=>{if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish()});new Promise(resolve=>setTimeout(resolve,100))")
  const dragPoints = await evaluate(`{
    const h=document.querySelector(${JSON.stringify(main+' .g-quest-handle')}).getBoundingClientRect();
    const t=document.querySelector(${JSON.stringify(row('today-long'))}).getBoundingClientRect();
    ({from:{x:Math.round(h.left+h.width/2),y:Math.round(h.top+h.height/2)},to:{x:Math.round(h.left+h.width/2),y:Math.round(t.bottom-10)}});
  }`)
  window.webContents.sendInputEvent({type:'mouseDown',...dragPoints.from,button:'left',clickCount:1})
  window.webContents.sendInputEvent({type:'mouseMove',...dragPoints.to,button:'left'})
  await waitFor("Boolean(document.querySelector('.g-insertion-line'))")
  window.webContents.sendInputEvent({type:'mouseUp',...dragPoints.to,button:'left',clickCount:1})
  await waitFor("!document.querySelector('.g-insertion-line')")
  assert.notDeepEqual(await ids(),originalOrder)
  await evaluate(`document.querySelector(${JSON.stringify(main+' .g-quest-handle')}).focus()`)
  window.webContents.sendInputEvent({type:'keyDown',keyCode:'Up',modifiers:['alt']})
  window.webContents.sendInputEvent({type:'keyUp',keyCode:'Up',modifiers:['alt']})
  await waitFor(`document.querySelector('.g-list [data-reorder-id]').dataset.reorderId === 'today-main'`)
  if (process.env.LIFE_GAME_SCREENSHOTS) {
    fs.mkdirSync(process.env.LIFE_GAME_SCREENSHOTS,{recursive:true})
    window.showInactive()
    await evaluate("document.querySelector('.g-day-board').scrollIntoView({block:'start'});document.getAnimations().forEach(a=>{if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish()});document.fonts.ready")
    await evaluate("new Promise(resolve=>setTimeout(resolve,250))")
    const rect=await evaluate("{const r=document.querySelector('.g-day-board').getBoundingClientRect();({x:Math.floor(r.left),y:Math.floor(r.top),width:Math.ceil(r.width),height:Math.ceil(r.height)})}")
    const image=await window.webContents.capturePage(rect)
    fs.writeFileSync(path.join(process.env.LIFE_GAME_SCREENSHOTS,'today-plan.png'),image.toPNG())
    window.hide()
  }
  await waitFor("Boolean(document.querySelector('.save-state--saved'))")
}
