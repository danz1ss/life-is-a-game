const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

module.exports = async ({ scenario, window, evaluate, waitFor, navigate }) => {
  await navigate(3, '.progress-hero')
  const art = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).querySelector('.character-portrait image').getAttribute('href')`)
  if (scenario === 'equipment-persist') {
    const state = await evaluate('window.lifeGame.loadState()')
    assert.equal(state.profile.gold, 123)
    assert.equal(state.profile.totalXp, 179685)
    assert.deepEqual([state.profile.character.gender, state.profile.character.outfit, state.profile.character.weapon], ['girl', 'mage', 'staff'])
    assert.match(await art('.progress-hero'), /girl-legend-mage-staff.png$/)
    return
  }
  window.setContentSize(1366, 900)
  window.showInactive()
  await waitFor("Boolean(document.querySelector('.save-state--saved'))")
  const initial = await evaluate('window.lifeGame.loadState()')
  const reload = async () => {
    const loaded = new Promise(resolve => window.webContents.once('did-finish-load', resolve))
    window.reload(); await loaded
    await waitFor("Boolean(document.querySelector('.g-quest.is-main .quest-check'))")
    await navigate(3, '.progress-hero')
    await waitFor("Boolean(document.querySelector('.save-state--saved'))")
  }
  const seed = async (gender, level = 100, character = {}) => {
    await waitFor("Boolean(document.querySelector('.save-state--saved'))")
    const state = structuredClone(initial), n = level - 1
    state.profile.totalXp = n * 100 + 35 * n * (n - 1) / 2
    state.profile.gold = 123
    state.profile.character = { gender, skin: 'medium', hair: 'short', outfit: 'mage', weapon: 'sword', accent: 'azure', pet: 'fox', ...character }
    state.levelRewards.highestLevel = level; state.levelRewards.acknowledgedLevel = level
    await evaluate(`window.lifeGame.saveState(${JSON.stringify(state)})`)
    await reload()
  }
  const open = async () => {
    await evaluate("document.querySelector('.progress-hero__actions button').click()")
    await waitFor("Boolean(document.querySelector('.appearance-editor'))")
    assert.deepEqual(await evaluate("[...document.querySelectorAll('.appearance-editor__tabs button')].map(b => b.textContent)"), ['Комплект', 'Оружие', 'Цвет'])
    assert.equal(await evaluate("document.querySelector('.appearance-editor__tabs [aria-selected=true]').textContent"), 'Комплект')
    await waitFor("Boolean(document.querySelector('[data-equipment-id=guardian]'))")
  }
  const close = async save => {
    await evaluate(`document.querySelector('.appearance-editor__footer .button--${save ? 'primary' : 'secondary'}').click()`)
    await waitFor("!document.querySelector('.appearance-editor')")
    await waitFor("Boolean(document.querySelector('.save-state--saved'))")
  }
  const expectedFile = (gender, id, stage = 'legend') => {
    if (id === 'casual') return `${gender}-${stage}.png`
    if (id === 'crystal') return `${gender}-legend-crystal.png`
    const weapon = { traveler: 'none', guardian: 'shield', mage: 'staff', ranger: 'bow', champion: 'twin', celestial: 'sword' }[id]
    return `${gender}-${stage}-${id}-${weapon}.png`
  }
  const choose = async id => {
    await evaluate(`document.querySelector('[data-equipment-id=${id}]').click()`)
    await waitFor(`document.querySelector('[data-equipment-id=${id}]').getAttribute('aria-pressed')==='true'`)
  }
  const assertSceneFits = async selector => {
    const bounds = await evaluate(`(() => {
      const stage = document.querySelector(${JSON.stringify(selector)}).querySelector('.character-stage')
      const rect = element => { const r = element.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width } }
      return { stage:rect(stage), hero:rect(stage.children[0]), pet:rect(stage.querySelector('.companion-portrait')) }
    })()`)
    for (const portrait of [bounds.hero, bounds.pet]) {
      assert.ok(portrait.left >= bounds.stage.left + 8, `${selector}: artwork touches the left edge`)
      assert.ok(portrait.right <= bounds.stage.right - 8, `${selector}: artwork touches the right edge`)
      assert.ok(portrait.top >= bounds.stage.top + 8, `${selector}: artwork touches the top edge`)
      assert.ok(portrait.bottom <= bounds.stage.bottom - 8, `${selector}: artwork touches the bottom edge`)
    }
  }
  const screenshot = async (name, atTop = false) => {
    if (!process.env.LIFE_GAME_SCREENSHOTS) return
    window.show(); window.focus(); await evaluate('document.fonts.ready')
    if (atTop) await evaluate("document.querySelector('.modal-card').scrollTop=0")
    else await evaluate("document.querySelector('[data-equipment-id][aria-pressed=true]')?.scrollIntoView({block:'center'})")
    await new Promise(resolve => setTimeout(resolve, 250))
    fs.mkdirSync(process.env.LIFE_GAME_SCREENSHOTS, { recursive: true })
    const image = await window.webContents.capturePage(undefined, { stayAwake: true })
    fs.writeFileSync(path.join(process.env.LIFE_GAME_SCREENSHOTS, `${name}.png`), image.toPNG())
  }
  // Unrelated edits must keep even legacy choices whose old unlock is higher.
  await seed('boy', 4, { outfit: 'celestial', weapon: 'crystal', hair: 'hood', accent: 'gold', pet: 'dragon' })
  await open(); await close(true)
  let state = await evaluate('window.lifeGame.loadState()')
  assert.deepEqual([state.profile.character.outfit, state.profile.character.weapon], ['celestial', 'crystal'])
  assert.deepEqual([state.profile.character.hair, state.profile.character.accent, state.profile.character.pet], ['hood', 'gold', 'dragon'], 'Saving an imported profile must keep legacy choices compatible')
  assert.match(await art('.progress-hero'), /boy-child.png$/)
  await open()
  await screenshot('equipment-legacy-hood', true)
  assert.equal(await evaluate("document.querySelector('[data-equipment-id=crystal]').disabled"), true)
  assert.equal(await evaluate("document.querySelector('[data-equipment-id=mage]').disabled"), true)
  await choose('guardian')
  assert.match(await art('.appearance-editor__preview'), /boy-child-guardian-shield.png$/)
  await close(false)
  state = await evaluate('window.lifeGame.loadState()')
  assert.deepEqual([state.profile.character.outfit, state.profile.character.weapon], ['celestial', 'crystal'], 'Cancel must not overwrite the legacy pair')

  for (const gender of ['boy', 'girl']) {
    await seed(gender)
    for (const id of ['casual', 'traveler', 'guardian', 'mage', 'ranger', 'champion', 'celestial', 'crystal']) {
      await open(); const previous = await art('.appearance-editor__preview')
      await choose(id)
      const next = await art('.appearance-editor__preview')
      assert.ok(next.endsWith(expectedFile(gender, id)), `${gender} ${id}: ${next}`)
      if (id !== 'casual') assert.notEqual(next, previous, 'Selecting a different full set must replace the actual image')
      assert.equal(await evaluate("document.querySelectorAll('.appearance-editor__preview .character-portrait image').length"), 1)
      assert.equal(await evaluate("document.querySelector('.appearance-editor__preview').innerHTML.includes('M803 331 L762 1299')"), false)
      assert.ok(await evaluate("document.querySelector('.modal-card').getBoundingClientRect().width") >= 850, 'The appearance editor must have room for both the preview and controls')
      assert.ok(await evaluate("document.querySelector('.appearance-editor__preview').getBoundingClientRect().width") >= 350, 'The desktop preview must be wider than the old cramped column')
      await evaluate("document.querySelector('.appearance-editor__identity').open=true")
      for (const pet of ['fox', 'owl', 'dragon']) {
        const label = { fox: 'Лисёнок', owl: 'Совёнок', dragon: 'Дракончик' }[pet]
        await evaluate(`[...document.querySelectorAll('.appearance-editor__small-options button')].find(b=>b.textContent.includes(${JSON.stringify(label)})).click()`)
        await waitFor(`document.querySelector('.appearance-editor__preview .companion-portrait image').getAttribute('href').includes(${JSON.stringify(pet)})`)
        await assertSceneFits('.appearance-editor__preview')
      }
      await evaluate("[...document.querySelectorAll('.appearance-editor__small-options button')].find(b=>b.textContent.includes('Лисёнок')).click();document.querySelector('.appearance-editor__identity').open=false")
      if (id === 'guardian' || id === 'mage') await screenshot(`equipment-${gender}-${id}`)
      await close(true)
      assert.ok((await art('.progress-hero')).endsWith(expectedFile(gender, id)))
      await assertSceneFits('.progress-hero')
      if (gender === 'boy' && id === 'guardian') await screenshot('equipment-main-hero')
      state = await evaluate('window.lifeGame.loadState()')
      assert.equal(state.profile.totalXp, 179685)
      assert.equal(state.profile.gold, 123)
      assert.equal(state.history.length, 0)
      assert.equal(state.profile.character.pet, 'fox')
    }
  }
  // Higher earned stages survive undo-like XP reductions while retaining the set.
  await seed('boy', 50)
  await open(); await choose('mage')
  await evaluate("document.querySelector('.appearance-editor__identity').open=true;[...document.querySelectorAll('.appearance-editor__small-options button')].find(b=>b.textContent==='Девочка').click()")
  await waitFor("document.querySelector('.appearance-editor__preview').innerHTML.includes('girl-adult-mage-staff.png')")
  await close(true)
  state = await evaluate('window.lifeGame.loadState()')
  assert.deepEqual([state.profile.character.gender, state.profile.character.outfit, state.profile.character.weapon], ['girl', 'mage', 'staff'])
  assert.equal(state.profile.gold, 123)
  await seed('boy', 100, { outfit: 'guardian', weapon: 'shield' })
  state = await evaluate('window.lifeGame.loadState()'); state.profile.totalXp = 0
  await evaluate(`window.lifeGame.saveState(${JSON.stringify(state)})`); await reload()
  assert.match(await art('.progress-hero'), /boy-legend-guardian-shield.png$/)
  // A selected outfit must change artwork as the same hero ages.
  for (const gender of ['boy', 'girl']) {
    for (const [level, stage] of [[8,'child'],[10,'teen'],[25,'young'],[50,'adult'],[75,'veteran'],[100,'legend']]) {
      await seed(gender, level, { outfit: 'mage', weapon: 'staff' })
      assert.ok((await art('.progress-hero')).endsWith(expectedFile(gender, 'mage', stage)))
    }
  }
  await open()
  window.setMinimumSize(1, 1)
  window.setContentSize(390, 900)
  window.webContents.debugger.attach('1.3')
  await window.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: false })
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
  assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"), true)
  assert.equal(await evaluate('innerWidth'), 390, 'The narrow layout test must use the actual requested renderer width')
  await assertSceneFits('.appearance-editor__preview')
  assert.equal(await evaluate("[...document.querySelectorAll('[data-equipment-id]')].every(b=>{const r=b.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})"), true)
  await screenshot('equipment-narrow', true)
  await close(false)
  await window.webContents.debugger.sendCommand('Emulation.clearDeviceMetricsOverride')
  window.webContents.debugger.detach()
  window.setContentSize(1366, 900)
  // The last real saved selection is checked by a fresh Electron process.
  await waitFor("Boolean(document.querySelector('.save-state--saved'))")
}
