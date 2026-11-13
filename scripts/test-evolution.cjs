const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

module.exports = async ({ scenario, window, evaluate, waitFor, navigate }) => {
  await navigate(0, '.g-quest.is-main .quest-check')
  if (scenario === 'evolution-persist') {
    assert.equal(await evaluate('Boolean(document.querySelector("[data-testid=level-up]"))'), false)
    const saved = await evaluate('window.lifeGame.loadState()')
    assert.equal(saved.levelRewards.highestLevel, 100)
    assert.equal(saved.levelRewards.acknowledgedLevel, 100)
    assert.equal(saved.profile.totalXp, 179685)
    assert.equal(saved.profile.character.outfit, 'celestial')
    return
  }
  window.setContentSize(1366, 900)
  window.showInactive()
  await waitFor("Boolean(document.querySelector('.save-state--saved'))")
  const baseline = await evaluate('window.lifeGame.loadState()')
  const reload = async () => {
    const loaded = new Promise(resolve => window.webContents.once('did-finish-load', resolve))
    window.reload(); await loaded
    await waitFor("Boolean(document.querySelector('.g-quest.is-main .quest-check'))")
  }
  const seed = async (from, to, gender = 'boy', pending = false) => {
    // Do not race the renderer's debounce with a fixture written through IPC.
    await waitFor("Boolean(document.querySelector('.save-state--saved'))")
    const state = structuredClone(baseline)
    const n = to - 1
    state.profile.totalXp = n * 100 + 35 * n * (n - 1) / 2 - (pending ? 0 : 50)
    state.profile.character = { gender, skin: 'medium', hair: 'short', outfit: 'mage', weapon: 'none', accent: 'azure', pet: 'fox' }
    state.levelRewards.highestLevel = pending ? to : from
    state.levelRewards.acknowledgedLevel = from
    await evaluate(`window.lifeGame.saveState(${JSON.stringify(state)})`)
    await reload()
    return state
  }
  const clickQuest = () => evaluate("document.querySelector('.g-quest.is-main .quest-check').click()")
  const close = async (escape = false) => {
    if (escape) window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' })
    else await evaluate("document.querySelector('.level-up button').click()")
    await waitFor("!document.querySelector('[data-testid=level-up]')")
    await waitFor("Boolean(document.querySelector('.save-state--saved'))")
  }
  const shot = async name => {
    if (!process.env.LIFE_GAME_SCREENSHOTS) return
    window.show(); await evaluate('document.fonts.ready')
    await new Promise(resolve => setTimeout(resolve, 150))
    fs.mkdirSync(process.env.LIFE_GAME_SCREENSHOTS, { recursive: true })
    const image = await window.webContents.capturePage(undefined, { stayAwake: true })
    fs.writeFileSync(path.join(process.env.LIFE_GAME_SCREENSHOTS, `${name}.png`), image.toPNG())
  }
  const changed = '.hero-evolution__scene'
  const complete = async () => {
    try { await waitFor("document.querySelector('.hero-evolution__scene')?.dataset.phase==='complete'") }
    catch (error) {
      console.error('Scene state:', await evaluate("({phase:document.querySelector('.hero-evolution__scene')?.dataset.phase,visibility:document.visibilityState,animations:document.getAnimations().map(a=>({name:a.animationName,time:a.currentTime,state:a.playState})),text:document.querySelector('.hero-evolution')?.textContent})"))
      throw error
    }
  }
  for (const [from, to, gender] of [[9,10,'boy'],[24,25,'boy'],[49,50,'girl'],[74,75,'boy'],[99,100,'boy'],[4,5,'boy'],[6,7,'boy'],[100,101,'girl']]) {
    const before = await seed(from, to, gender)
    console.log(`Checking evolution ${gender}: ${from} -> ${to}`)
    await clickQuest()
    await waitFor("Boolean(document.querySelector('[data-testid=level-up]'))")
    assert.equal(await evaluate("Boolean(document.querySelector('.game-toast'))"), false)
    assert.equal(await evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)"), true)
    const hasChange = to !== 7 && to !== 101
    assert.equal(await evaluate(`Boolean(document.querySelector('${changed}'))`), hasChange)
    if (hasChange) {
      await waitFor("document.querySelector('.hero-evolution__scene')?.dataset.phase==='playing'")
      const timings = await evaluate("document.querySelector('.hero-evolution__scene').getAnimations({subtree:true}).map(a=>a.effect.getTiming().duration)")
      assert.deepEqual(timings, [440, 440])
      await complete()
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.hero-evolution__after')).opacity"), '1')
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.hero-evolution__before')).opacity"), '0')
      if (to === 10 || to === 50 || to === 100 || to === 5) await shot(`evolution-${gender}-${to}`)
    }
    await close(to === 50)
    const saved = await evaluate('window.lifeGame.loadState()')
    assert.equal(saved.profile.totalXp, before.profile.totalXp + 50)
    assert.equal(saved.profile.gold, before.profile.gold + 10)
    assert.equal(saved.profile.character.pet, 'fox')
    assert.equal(saved.profile.character.outfit, 'mage')
    assert.equal(saved.levelRewards.acknowledgedLevel, to)
    await clickQuest(); await waitFor("!document.querySelector('.g-quest.is-main .quest-check[aria-pressed=true]')")
    await waitFor("Boolean(document.querySelector('.save-state--saved'))")
    assert.equal(await evaluate('window.lifeGame.loadState().then(s=>s.levelRewards.highestLevel)'), to)
    await clickQuest(); await waitFor("Boolean(document.querySelector('.g-quest.is-main .quest-check[aria-pressed=true]'))")
    assert.equal(await evaluate("Boolean(document.querySelector('[data-testid=level-up]'))"), false)
    await waitFor("Boolean(document.querySelector('.save-state--saved'))"); await reload()
    assert.equal(await evaluate("Boolean(document.querySelector('[data-testid=level-up]'))"), false)
  }
  // An imported pending jump is consolidated into one old/final pair.
  await seed(9, 76, 'boy', true)
  await complete()
  assert.equal(await evaluate("document.querySelectorAll('.hero-evolution__layer').length"), 2)
  assert.equal(await evaluate("document.querySelector('.hero-evolution__after').innerHTML.includes('boy-veteran.png')"), true)
  assert.equal(await evaluate("document.querySelector('.hero-evolution').innerHTML.includes('boy-teen.png')"), false)
  await close()
  for (const mode of ['reduce', 'missing', 'slow', 'timeout']) {
    await seed(9, 10)
    if (mode === 'reduce') {
      window.setMinimumSize(1, 1)
      window.setContentSize(390, 900)
      window.webContents.debugger.attach('1.3')
      await window.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: false })
      assert.equal(await evaluate('innerWidth'), 390)
      await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    } else {
      await evaluate(`{const NativeImage=window.Image,src=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');window.Image=function(){const image=new NativeImage();Object.defineProperty(image,'src',{set(value){if(value.includes('boy-teen.png')){${mode === 'missing' ? "queueMicrotask(()=>image.onerror?.(new Event('error')))" : mode === 'slow' ? "setTimeout(()=>src.set.call(image,value),600)" : '/* Never resolves: exercise the 8 second timeout. */'}}else src.set.call(image,value)}});return image};void 0}`)
    }
    await clickQuest(); await waitFor("Boolean(document.querySelector('.hero-evolution__scene'))")
    if (mode === 'slow' || mode === 'timeout') {
      assert.equal(await evaluate("document.querySelector('.hero-evolution__scene').dataset.phase"), 'loading')
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.hero-evolution__before')).opacity"), '1')
    }
    const expected = mode === 'missing' || mode === 'timeout' ? 'error' : 'complete'
    for (let attempt = 0; attempt < 500; attempt++) {
      if (await evaluate(`document.querySelector('.hero-evolution__scene').dataset.phase==='${expected}'`)) break
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    assert.equal(await evaluate("document.querySelector('.hero-evolution__scene').dataset.phase"), expected)
    if (expected === 'error') {
      assert.equal(await evaluate("Boolean(document.querySelector('.hero-evolution__after'))"), false)
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.hero-evolution__before')).opacity"), '1')
      assert.match(await evaluate("document.querySelector('.hero-evolution [role=status]').textContent"), /Уровень сохранён/)
    }
    if (mode === 'reduce') {
      await window.webContents.debugger.sendCommand('Emulation.clearDeviceMetricsOverride')
      assert.equal(await evaluate("document.querySelector('.hero-evolution__scene').getAnimations({subtree:true}).length"), 0)
      assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"), true)
      await shot('evolution-narrow-reduced')
    }
    if (mode === 'missing') await shot('evolution-load-error')
    await close(mode === 'reduce')
    const modeSaved = await evaluate('window.lifeGame.loadState()')
    assert.equal(modeSaved.profile.totalXp, 2160)
    assert.equal(modeSaved.profile.gold, 10)
    assert.equal(modeSaved.levelRewards.acknowledgedLevel, 10)
    if (mode === 'reduce') {
      await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features: [] })
      window.webContents.debugger.detach()
    }
    window.setContentSize(1366, 900)
  }
  await seed(99, 100)
  await clickQuest(); await waitFor("Boolean(document.querySelector('.level-up'))"); await close()
  await navigate(3, '.progress-summary')
  await evaluate("document.querySelector('.progress-hero__actions button').click()")
  await waitFor("Boolean(document.querySelector('.appearance-editor'))")
  await evaluate("[...document.querySelectorAll('.appearance-editor__presets button')].find(b=>b.textContent==='Кристальная легенда').click()")
  await evaluate("document.querySelector('.appearance-editor__footer .button--primary').click()")
  await waitFor("!document.querySelector('.appearance-editor')")
  await evaluate("document.querySelectorAll('.progress-hero__actions button')[1].click()")
  await waitFor("Boolean(document.querySelector('.appearance-editor__preview--pet'))")
  await evaluate("[...document.querySelectorAll('.appearance-editor__choices button')].find(b=>b.textContent==='Дракончик').click()")
  await evaluate("document.querySelector('.appearance-editor__footer .button--primary').click()")
  await waitFor("window.lifeGame.loadState().then(s=>s.profile.character.weapon==='crystal'&&s.profile.character.pet==='dragon')")
  assert.equal(await evaluate("window.lifeGame.loadState().then(s=>s.profile.character.outfit)"), 'celestial')
  assert.equal(await evaluate("document.querySelector('.progress-hero').innerHTML.includes('boy-legend-crystal.png')"), true)
  assert.equal(await evaluate("document.querySelector('.progress-hero').innerHTML.includes('dragon-legend.png')"), true)
  await shot('evolution-selected-crystal-dragon')
  // Persist a confirmed milestone for a genuine second Electron process.
  await waitFor("Boolean(document.querySelector('.save-state--saved'))")
}
