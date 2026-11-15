const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

module.exports = async ({ scenario, window, evaluate, waitFor, navigate }) => {
  await navigate(3, '.progress-hero')
  const art = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).querySelector('.character-portrait image').getAttribute('href')`)
  if (scenario === 'equipment-persist') {
    const state = await evaluate('window.lifeGame.loadState()')
    assert.equal(state.profile.gold, 123)
    assert.equal(state.profile.character.pet, 'dragon')
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
  const click = (selector, label) => evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].find(button => button.textContent.trim() === ${JSON.stringify(label)}).click()`)
  const open = async (kind = 'hero') => {
    await click('.progress-hero__actions button', kind === 'hero' ? 'Настроить героя' : 'Настроить питомца')
    await waitFor("Boolean(document.querySelector('.appearance-editor'))")
    assert.equal(await evaluate("Boolean(document.querySelector('.appearance-editor details'))"), false)
  }
  const close = async save => {
    await click('.appearance-editor__footer button', save ? 'Сохранить' : 'Отмена')
    await waitFor("!document.querySelector('.appearance-editor')")
    await waitFor("Boolean(document.querySelector('.save-state--saved'))")
  }
  const choose = async (label, artSuffix) => {
    await click('.appearance-editor__equipment-choice', label)
    await waitFor(`document.querySelector('.appearance-editor__preview .character-portrait image').getAttribute('href').endsWith(${JSON.stringify(artSuffix)})`)
  }
  const screenshot = async name => {
    if (!process.env.LIFE_GAME_SCREENSHOTS) return
    fs.mkdirSync(process.env.LIFE_GAME_SCREENSHOTS, { recursive: true })
    const image = await window.webContents.capturePage()
    fs.writeFileSync(path.join(process.env.LIFE_GAME_SCREENSHOTS, `${name}.png`), image.toPNG())
  }

  await seed('boy', 4, { outfit: 'celestial', weapon: 'crystal', hair: 'hood', accent: 'gold', pet: 'dragon' })
  await open(); await close(true)
  let state = await evaluate('window.lifeGame.loadState()')
  assert.deepEqual(state.profile.character, { gender: 'boy', skin: 'medium', hair: 'hood', outfit: 'celestial', weapon: 'crystal', accent: 'gold', pet: 'dragon' })

  for (const gender of ['boy', 'girl']) {
    await seed(gender, 8, { outfit: 'mage', weapon: 'staff' })
    await open()
    assert.deepEqual(await evaluate("[...document.querySelectorAll('.appearance-editor__tabs button')].map(b => b.textContent)"), ['Образ', 'Оружие'])
    await click('.appearance-editor__tabs button', 'Оружие')
    await choose(gender === 'boy' ? 'Щит защитника' : 'Щит защитницы', `${gender}-child-mage-shield.png`)
    await screenshot(`mage-shield-${gender}`)
    await choose('Без оружия', `${gender}-child-mage-none.png`)
    await click('.appearance-editor__tabs button', 'Образ')
    await choose(gender === 'boy' ? 'Доспех стража' : 'Доспех стражницы', `${gender}-child-guardian-none.png`)
    await click('.appearance-editor__tabs button', 'Оружие')
    await choose(gender === 'boy' ? 'Посох мага' : 'Посох волшебницы', `${gender}-child-guardian-staff.png`)
    await close(false)
    assert.match(await art('.progress-hero'), new RegExp(`${gender}-child-mage-staff.png$`))

    await open()
    await choose(gender === 'boy' ? 'Куртка новичка' : 'Наряд новичка', '-casual-staff.png')
    await choose(gender === 'boy' ? 'Куртка путника' : 'Куртка путешественницы', '-traveler-staff.png')
    await click('.appearance-editor__tabs button', 'Оружие')
    await choose(gender === 'boy' ? 'Меч героя' : 'Меч героини', '-traveler-sword.png')
    await close(true)
    await reload()
    assert.match(await art('.progress-hero'), new RegExp(`${gender}-.*-traveler-sword.png$`))
  }

  await seed('girl', 100, { outfit: 'mage', weapon: 'staff' })
  const buttonLayout = await evaluate(`[...document.querySelectorAll('.progress-hero__actions button')].map(button => {
    const box = button.getBoundingClientRect()
    return [Math.round(box.width), Math.round(box.height), Math.round(box.top + box.height / 2)]
  })`)
  assert.deepEqual(buttonLayout.map(([width, height]) => [width, height]), [[224, 52], [179, 42]])
  assert.equal(buttonLayout[0][2], buttonLayout[1][2])
  assert.equal(await evaluate("document.querySelectorAll('.progress-hero__stage .companion-portrait :is(path, circle)').length"), 0)
  await navigate(0, '.g-stage .companion-portrait image')
  assert.equal(await evaluate("document.querySelectorAll('.g-stage .companion-portrait :is(path, circle)').length"), 0)
  await navigate(3, '.progress-hero__actions')
  window.webContents.debugger.attach('1.3')
  await window.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: false })
  for (const kind of ['hero', 'pet']) {
    await open(kind)
    assert.equal(await evaluate('innerWidth'), 390)
    assert.equal(await evaluate("document.querySelector('.modal-card').scrollWidth <= document.querySelector('.modal-card').clientWidth"), true)
    if (kind === 'hero') {
      const spacing = await evaluate(`[...document.querySelectorAll('.appearance-editor fieldset > legend')].map(legend => {
        const options = legend.nextElementSibling
        return [Math.round(options.getBoundingClientRect().top - legend.getBoundingClientRect().bottom), getComputedStyle(options).rowGap]
      })`)
      assert.deepEqual(spacing, [[8, '8px'], [8, '8px'], [8, '8px']])
    }
    await screenshot(`settings-${kind}-390`)
    if (kind === 'pet') {
      for (const [label, file] of [['Лисёнок', 'fox'], ['Совёнок', 'owl'], ['Дракончик', 'dragon']]) {
        await click('.appearance-editor__choices button', label)
        await waitFor(`document.querySelector('.appearance-editor__preview image').getAttribute('href').includes('${file}')`)
        assert.equal(await evaluate("document.querySelectorAll('.appearance-editor .companion-portrait :is(path, circle)').length"), 0)
      }
      await click('.appearance-editor__choices button', 'Дракончик')
      await waitFor("document.querySelector('.appearance-editor__preview image').getAttribute('href').includes('dragon')")
    }
    await close(kind === 'pet')
  }
  state = await evaluate('window.lifeGame.loadState()')
  assert.equal(state.profile.character.pet, 'dragon')
  assert.equal(state.profile.character.weapon, 'staff')
}
