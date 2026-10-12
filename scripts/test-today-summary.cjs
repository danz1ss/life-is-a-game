const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

module.exports=async({window,evaluate,waitFor,navigate})=>{
  window.showInactive();window.setContentSize(1440,1000)
  await navigate(0,'.g-hero-summary')
  const click=async selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const saved=async()=>{await waitFor("Boolean(document.querySelector('.save-state--saved'))");return evaluate('window.lifeGame.loadState()')}
  const fill=async(selector,value)=>evaluate(`{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));}`)
  const close=async()=>{await click('[role=dialog] .modal-header button');await waitFor("!document.querySelector('[role=dialog]')")}
  const baseline=await saved()
  const shot=async(name,selector)=>{
    if(!process.env.LIFE_GAME_SCREENSHOTS)return
    window.hide();window.show()
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'});document.getAnimations().forEach(a=>{if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish()});document.fonts.ready`)
    await evaluate("new Promise(resolve=>setTimeout(resolve,500))")
    const rect=await evaluate(`{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(),x=Math.max(0,Math.floor(r.left-4)),y=Math.max(0,Math.floor(r.top-4));({x,y,width:Math.min(innerWidth-x,Math.ceil(r.right+4)-x),height:Math.min(innerHeight-y,Math.ceil(r.bottom+4)-y)})}`)
    fs.mkdirSync(process.env.LIFE_GAME_SCREENSHOTS,{recursive:true})
    const full=await window.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})
    const viewportWidth=await evaluate('innerWidth')
    const scale=full.getSize().width/viewportWidth
    const capture=full.crop({x:Math.round(rect.x*scale),y:Math.round(rect.y*scale),width:Math.min(full.getSize().width-Math.round(rect.x*scale),Math.round(rect.width*scale)),height:Math.min(full.getSize().height-Math.round(rect.y*scale),Math.round(rect.height*scale))})
    fs.writeFileSync(path.join(process.env.LIFE_GAME_SCREENSHOTS,name+'.png'),capture.toPNG())
  }
  assert.match(await evaluate("document.querySelector('.g-summary-level').textContent"),/Уровень 1.*Малыш/)
  assert.match(await evaluate("document.querySelector('.g-summary-xp').textContent"),/0 \/ 100 XP.*До уровня 2 — 100 XP/)
  assert.equal(await evaluate("document.querySelector('.g-header-actions .button--primary').textContent"),'Квест на сегодня')
  assert.equal(await evaluate("document.querySelector('.g-header-actions .button--primary .lucide-plus')!==null"),true)
  await shot('today-summary','.g-hero-summary')
  await shot('today-create-buttons','.g-header-actions')
  await click('.g-wallet');await waitFor("Boolean(document.querySelector('.progress-shop__grid'))")
  await navigate(0,'.g-header-actions')
  await click('.g-header-actions .button--primary');await waitFor("Boolean(document.querySelector('[role=dialog] input[type=date]'))")
  const today=baseline.quests[0].dueDate
  await waitFor(`document.querySelector('[role=dialog] input[type=date]').value===${JSON.stringify(today)}`)
  assert.match(await evaluate("document.querySelector('[role=dialog] input[type=date]').closest('label').textContent"),/Сегодня/)
  assert.equal((await saved()).quests.length,baseline.quests.length)
  await close();assert.deepEqual((await saved()).quests,baseline.quests)
  // A focus refresh at the next local midnight must supply the newly selected day.
  const next=await evaluate(`{const day=new Date(${JSON.stringify(today)}+'T12:00:00');day.setDate(day.getDate()+1);day.getFullYear()+'-'+String(day.getMonth()+1).padStart(2,'0')+'-'+String(day.getDate()).padStart(2,'0')}`)
  await click('.g-header-actions .button--primary');await waitFor("Boolean(document.querySelector('[role=dialog] input[type=date]'))")
  await fill('[role=dialog] input[maxlength="120"]','Черновик до полуночи')
  await fill('[role=dialog] input[type=date]',next)
  await evaluate(`{window.__summaryDate=Date;const OriginalDate=Date,time=new OriginalDate(${JSON.stringify(next)}+'T00:01:00').getTime();window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[time]))}static now(){return time}};window.dispatchEvent(new Event('focus'));}`)
  await waitFor("document.querySelector('[role=dialog] input[type=date]').closest('label').textContent.includes('Сегодня')")
  assert.equal(await evaluate("document.querySelector('[role=dialog] input[maxlength=\"120\"]').value"),'Черновик до полуночи')
  assert.equal(await evaluate("document.querySelector('[role=dialog] input[type=date]').value"),next)
  await close()
  await click('.g-header-actions .button--primary')
  await waitFor(`document.querySelector('[role=dialog] input[type=date]')?.value===${JSON.stringify(next)}`)
  assert.match(await evaluate("document.querySelector('[role=dialog] input[type=date]').closest('label').textContent"),/Сегодня/)
  await fill('[role=dialog] input[maxlength="120"]','Квест после полуночи')
  await click('[role=dialog] button[type=submit]');await waitFor("!document.querySelector('[role=dialog]')")
  await waitFor(`window.lifeGame.loadState().then(state=>state.quests.some(quest=>quest.title==='Квест после полуночи'&&quest.dueDate===${JSON.stringify(next)}))`)
  await evaluate("window.Date=window.__summaryDate;window.dispatchEvent(new Event('focus'))")
  await click('.g-header-actions .button--primary');await waitFor(`document.querySelector('[role=dialog] input[type=date]')?.value===${JSON.stringify(today)}`)
  await fill('[role=dialog] input[maxlength="120"]','Повторяющийся главный до полуночи')
  const weekday=await evaluate(`new Date(${JSON.stringify(today)}+'T12:00:00').getDay()`)
  await click(`.weekday-picker button:nth-child(${[1,2,3,4,5,6,0].indexOf(weekday)+1})`)
  await click('[role=dialog] .check-field input')
  await evaluate(`{const OriginalDate=window.__summaryDate,time=new OriginalDate(${JSON.stringify(next)}+'T00:01:00').getTime();window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[time]))}static now(){return time}};window.dispatchEvent(new Event('focus'));}`)
  await evaluate("new Promise(resolve=>setTimeout(resolve,30))")
  await click('[role=dialog] button[type=submit]');await waitFor("!document.querySelector('[role=dialog]')")
  const repeated=(await saved()).quests.find(quest=>quest.title==='Повторяющийся главный до полуночи')
  assert.equal((await saved()).dayPlans[today].mainQuestId,repeated.id,'Recurring main quest uses the date stated by the opened form')
  await evaluate("window.Date=window.__summaryDate;window.dispatchEvent(new Event('focus'))")
  // Check actual calculations and overflow at zero, partial XP and large values.
  for(const xp of [145,100000000]){
    await saved()
    await evaluate(`(async()=>{const state=await window.lifeGame.loadState();state.profile.totalXp=${xp};state.profile.gold=987654321;state.levelRewards.highestLevel=${xp===145?2:100};await window.lifeGame.saveState(state)})()`)
    const loaded=new Promise(resolve=>window.webContents.once('did-finish-load',resolve));window.reload();await loaded
    await waitFor("Boolean(document.querySelector('.main-nav button'))");await navigate(0,'.g-hero-summary')
    for(const theme of ['minimalism','texture','night-sky']){
      await evaluate(`document.querySelector('.app-shell').dataset.background=${JSON.stringify(theme)}`)
      for(const width of [1440,390]){
        window.setMinimumSize(360,600);window.setContentSize(width,1000)
        await evaluate("new Promise(resolve=>setTimeout(resolve,60))")
        await evaluate("document.querySelector('.g-summary-level > span').textContent='Очень длинное название этапа развития героя'")
        assert.equal(await evaluate("[...document.querySelectorAll('.g-hero-summary,.g-summary-level,.g-summary-xp,.g-wallet,.g-header-actions')].every(element=>element.scrollWidth<=element.clientWidth)"),true)
      }
    }
  }
  // Use the existing skill form to verify requested field spacing.
  window.setContentSize(1440,1000)
  await navigate(2,'.react-flow__node')
  await click('.tree-page .page-header button');await waitFor("Boolean(document.querySelector('.skill-form'))")
  assert.ok(await evaluate("[...document.querySelectorAll('.skill-form fieldset')].every(field=>{const legend=field.querySelector('legend').getBoundingClientRect(),control=field.children[1].getBoundingClientRect();return control.top-legend.bottom>=8})"))
  await shot('skill-form-spacing','[role=dialog]:has(.skill-form)')
  await click('.skill-form .form-actions button[type=button]');await waitFor("!document.querySelector('.skill-form')")
  // Restore the test profile so the generic smoke runner can verify unchanged rewards.
  await evaluate(`window.lifeGame.saveState(${JSON.stringify(baseline)})`)
}
