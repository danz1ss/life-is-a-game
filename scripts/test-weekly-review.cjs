const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { dialog } = require('electron')

// Test fixtures live only in the smoke runner's isolated profile.
module.exports = async ({ window, evaluate, waitFor, navigate }) => {
  await navigate(0, '.g-weekly')
  await waitFor("Boolean(document.querySelector('.save-state--saved'))")
  const keys = await evaluate(`{
    const date = new Date(); date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (date.getDay() + 6) % 7);
    Array.from({ length: 6 }, (_, index) => {
      const day = new Date(date); day.setDate(day.getDate() + (1-index)*7);
      return day.getFullYear() + '-' + String(day.getMonth()+1).padStart(2,'0') + '-' + String(day.getDate()).padStart(2,'0');
    });
  }`)
  const [next, current, previous, emptyPast, oldestAvailable, hiddenOld] = keys
  const clickText = async text => evaluate(`{
    const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === ${JSON.stringify(text)});
    if (!button) throw new Error('Missing button: ' + ${JSON.stringify(text)});
    button.click();
  }`)
  const openReview = async () => {
    await clickText('Ревью недели')
    await waitFor("Boolean(document.querySelector('.g-weekly-results'))")
  }
  const closeReview = async () => {
    await evaluate("document.querySelector('[role=dialog] .modal-header button').click()")
    await waitFor("!document.querySelector('[role=dialog]')")
  }
  const selectWeek = async week => {
    await evaluate(`{
      const select = document.querySelector('.g-week-history select');
      select.value = ${JSON.stringify(week)};
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }`)
    await waitFor(`document.querySelector('.g-week-history select')?.value === ${JSON.stringify(week)}`)
  }
  const saved = async () => {
    await waitFor("Boolean(document.querySelector('.save-state--saved'))")
    return evaluate('window.lifeGame.loadState()')
  }
  if (process.env.LIFE_GAME_SMOKE === 'weekly-review-persist') {
    await openReview()
    await selectWeek(previous)
    assert.deepEqual(await evaluate("[...document.querySelectorAll('.g-weekly-results input')].map(input => input.checked)"), [true, false, false])
    assert.match(await evaluate("document.querySelector('[role=dialog] h3').textContent"), /1 из 3/)
    assert.equal((await saved()).weeklyPlans[previous].reviewedAt, '2026-10-04T15:00:00.000Z')
    await closeReview()
    return
  }
  const baseline = await saved()
  // First prove the empty current week is available without a selector.
  await openReview()
  assert.equal(await evaluate("Boolean(document.querySelector('.g-week-history select'))"), false)
  assert.match(await evaluate("document.querySelector('[role=dialog] h3').textContent"), /0 из 0/)
  await closeReview()
  await evaluate(`(async () => {
    const state = await window.lifeGame.loadState();
    const plan = (title, reviewedAt = null) => ({ tasks: [
      { id:'a', title, done:false }, { id:'b', title:'Другая задача', done:true },
      { id:'c', title:'ДлинноеНазвание'.repeat(20), done:false }
    ], reviewedAt });
    state.weeklyPlans = {
      [${JSON.stringify(current)}]: plan('Текущая задача'),
      [${JSON.stringify(previous)}]: plan('Прошлая задача', '2026-10-04T15:00:00.000Z'),
      [${JSON.stringify(emptyPast)}]: { tasks:[], reviewedAt:null },
      [${JSON.stringify(oldestAvailable)}]: plan('Три недели назад'),
      [${JSON.stringify(hiddenOld)}]: plan('Скрытая старая задача'),
      [${JSON.stringify(next)}]: plan('Следующая задача')
    };
    await window.lifeGame.saveState(state);
  })()`)
  const loaded = new Promise(resolve => window.webContents.once('did-finish-load', resolve))
  window.reload(); await loaded
  await waitFor("Boolean(document.querySelector('.g-weekly'))")
  const before = await saved()
  await openReview()
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.g-week-history option')].map(option => option.value)"), [current, previous, oldestAvailable])
  await selectWeek(previous)
  assert.match(await evaluate("document.querySelector('.g-weekly-results').textContent"), /Прошлая задача/)
  assert.equal(await evaluate("document.querySelectorAll('.g-weekly-results input[type=checkbox]').length"), 3)
  assert.equal(await evaluate("document.querySelector('.g-weekly-results input').disabled"), false)
  assert.equal(await evaluate("document.querySelector('.g-weekly-results').textContent.includes('Не выполнено')"), false)
  await evaluate("document.querySelector('.g-weekly-results label span').click()")
  await waitFor("document.querySelector('[role=dialog] h3')?.textContent === '2 из 3 задач выполнено'")
  await evaluate("document.querySelectorAll('.g-weekly-results input')[1].focus()")
  window.webContents.sendInputEvent({ type:'keyDown', keyCode:'Space' })
  window.webContents.sendInputEvent({ type:'keyUp', keyCode:'Space' })
  await waitFor("document.querySelector('[role=dialog] h3')?.textContent === '1 из 3 задач выполнено'")
  assert.equal(await evaluate("document.activeElement.matches('.g-weekly-results input:focus-visible')"), true)
  const focus = await evaluate("getComputedStyle(document.activeElement).outlineStyle")
  assert.notEqual(focus, 'none', 'Keyboard focus must be visible')
  const changed = await saved()
  assert.deepEqual(changed.weeklyPlans[previous].tasks.map(task => task.done), [true, false, false])
  assert.equal(changed.weeklyPlans[previous].reviewedAt, before.weeklyPlans[previous].reviewedAt)
  for (const week of keys.filter(week => week !== previous)) assert.deepEqual(changed.weeklyPlans[week], before.weeklyPlans[week])
  const { weeklyPlans: _beforePlans, ...beforeOther } = before
  const { weeklyPlans: _changedPlans, ...changedOther } = changed
  assert.deepEqual(changedOther, beforeOther, 'Review checkboxes only change weekly tasks')
  assert.deepEqual(changed.quests, baseline.quests)
  assert.deepEqual(changed.profile, baseline.profile)
  await selectWeek(current)
  assert.match(await evaluate("document.querySelector('.g-weekly-results').textContent"), /Текущая задача/)
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.g-weekly-results input')].map(input => input.checked)"), [false, true, false])
  await selectWeek(previous)
  await closeReview(); await openReview()
  assert.equal(await evaluate("document.querySelector('.g-week-history select').value"), current, 'Each opening defaults to current')
  await selectWeek(previous)
  // Move to the next Monday while the dialog is open: preserve an available selection.
  const changeDay = async day => evaluate(`{
    window.__weeklyOriginalDate ??= Date;
    const OriginalDate = window.__weeklyOriginalDate;
    const time = new OriginalDate(${JSON.stringify(day)} + 'T00:01:00').getTime();
    window.Date = class extends OriginalDate {
      constructor(...args) { super(...(args.length ? args : [time])); }
      static now() { return time; }
    };
    window.dispatchEvent(new Event('focus'));
  }`)
  await changeDay(next)
  await waitFor(`document.querySelector('.g-week-history option')?.value === ${JSON.stringify(next)}`)
  assert.equal(await evaluate("document.querySelector('.g-week-history select').value"), previous)
  await changeDay(current)
  await waitFor(`document.querySelector('.g-week-history option')?.value === ${JSON.stringify(current)}`)
  await selectWeek(oldestAvailable)
  await changeDay(next)
  await waitFor(`document.querySelector('.g-week-history select')?.value === ${JSON.stringify(next)}`)
  assert.deepEqual((await saved()).weeklyPlans, changed.weeklyPlans, 'Calendar changes never rewrite plans')
  await evaluate("window.Date = window.__weeklyOriginalDate; window.dispatchEvent(new Event('focus'))")
  await waitFor(`document.querySelector('.g-week-history option')?.value === ${JSON.stringify(current)}`)
  await closeReview()
  // Exercise the actual backup export path; hidden plans must still be present.
  const backupPath = path.join(process.env.LIFE_GAME_USER_DATA, 'weekly-review-backup.json')
  dialog.showSaveDialog = async () => ({ canceled:false, filePath:backupPath })
  await clickText('Данные приложения')
  await waitFor("Boolean(document.querySelector('.data-modal'))")
  await evaluate("document.querySelector('.data-modal__actions button').click()")
  await waitFor("document.querySelector('.data-modal__message')?.textContent === 'Резервная копия сохранена'")
  assert.deepEqual(JSON.parse(fs.readFileSync(backupPath, 'utf8')).weeklyPlans, changed.weeklyPlans)
  await closeReview()
  await openReview(); await selectWeek(previous)
  for (const width of [1366, 768, 390]) {
    await window.webContents.setVisualZoomLevelLimits(1, 1)
    await evaluate(`document.querySelector('[role=dialog]').style.width = '${Math.min(width - 40, 560)}px'`)
    assert.equal(await evaluate("[...document.querySelectorAll('.g-weekly-results li')].every(row => row.scrollWidth <= row.clientWidth)"), true, 'Long titles must wrap')
  }
  await closeReview()
}
