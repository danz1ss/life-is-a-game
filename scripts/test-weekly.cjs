const assert = require('node:assert/strict')

// Called only by the Electron smoke runner with its own temporary SQLite profile.
module.exports = async ({ window, evaluate, waitFor, navigate, screenshot }) => {
  const fill = async (selector, value, tag = 'input') => evaluate(`{
    const input = document.querySelector(${JSON.stringify(selector)});
    const prototype = ${tag === 'textarea' ? 'HTMLTextAreaElement' : 'HTMLInputElement'}.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }`)
  const clickText = async (selector, text) => evaluate(`{
    const button = [...document.querySelectorAll(${JSON.stringify(selector)})]
      .find(button => button.textContent.trim() === ${JSON.stringify(text)});
    if (!button) throw new Error('Missing button: ' + ${JSON.stringify(text)});
    button.click();
  }`)
  const savedState = async () => {
    await waitFor("Boolean(document.querySelector('.save-state--saved'))")
    return evaluate('window.lifeGame.loadState()')
  }
  const reload = async () => {
    const loaded = new Promise(resolve => window.webContents.once('did-finish-load', resolve))
    window.reload()
    await loaded
    await waitFor("Boolean(document.querySelector('.g-weekly'))")
  }
  const weekKeys = await evaluate(`{
    const day = new Date();
    day.setHours(12, 0, 0, 0);
    day.setDate(day.getDate() - (day.getDay() + 6) % 7);
    const key = date => date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    const current = key(day);
    day.setDate(day.getDate() + 7);
    ({ current, next: key(day) });
  }`)
  await navigate(0, '.g-weekly')
  const baseline = await savedState()
  assert.equal(await evaluate("document.querySelectorAll('.g-weekly-list > li').length"), 0)

  const currentTitles = ['Finish the first release', 'Read one book', 'Train three times']
  await clickText('.g-weekly button', 'Составить план недели')
  await waitFor("Boolean(document.querySelector('.g-week-plan-form textarea'))")
  await fill('.g-week-plan-form textarea', currentTitles.slice(0, 2).join('\n'), 'textarea')
  await evaluate("document.querySelector('.g-week-plan-form button[type=submit]').click()")
  await waitFor("Boolean(document.querySelector('#weekly-plan-error'))")
  assert.match(await evaluate("document.querySelector('#weekly-plan-error').textContent"), /от 3 до 5/)
  assert.equal(Object.keys((await evaluate('window.lifeGame.loadState()')).weeklyPlans).length, 0)
  await fill('.g-week-plan-form textarea', currentTitles.join('\n'), 'textarea')
  await evaluate("document.querySelector('.g-week-plan-form button[type=submit]').click()")
  await waitFor("!document.querySelector('[role=dialog]')")
  await waitFor("window.lifeGame.loadState().then(state => Object.values(state.weeklyPlans)[0]?.tasks.length === 3)")
  let state = await savedState()
  assert.deepEqual(state.weeklyPlans[weekKeys.current].tasks.map(task => task.title), currentTitles)
  const firstId = state.weeklyPlans[weekKeys.current].tasks[0].id
  await evaluate("document.querySelector('.g-weekly-list input[type=checkbox]').click()")
  await waitFor(`window.lifeGame.loadState().then(state => state.weeklyPlans[${JSON.stringify(weekKeys.current)}].tasks[0].done)`)
  await evaluate("document.querySelector('.g-weekly-edit').click()")
  await waitFor("Boolean(document.querySelector('.g-weekly-editor input'))")
  await fill('.g-weekly-editor input', 'Finish and review the first release')
  await evaluate("document.querySelector('.g-weekly-editor button[type=submit]').click()")
  await waitFor("!document.querySelector('.g-weekly-editor')")
  await waitFor(`window.lifeGame.loadState().then(state => state.weeklyPlans[${JSON.stringify(weekKeys.current)}].tasks[0].title === 'Finish and review the first release')`)
  state = await savedState()
  assert.equal(state.weeklyPlans[weekKeys.current].tasks[0].id, firstId)
  assert.equal(state.weeklyPlans[weekKeys.current].tasks[0].done, true)
  assert.equal(state.weeklyPlans[weekKeys.current].tasks[0].title, 'Finish and review the first release')
  assert.equal(state.profile.totalXp, baseline.profile.totalXp)
  assert.equal(state.profile.gold, baseline.profile.gold)
  assert.deepEqual(state.history, baseline.history)
  assert.deepEqual(state.skills, baseline.skills)
  await reload()
  assert.equal(await evaluate("document.querySelector('.g-weekly-list input[type=checkbox]').checked"), true)
  assert.match(await evaluate("document.querySelector('.g-weekly-list').textContent"), /Finish and review the first release/)
  await screenshot('weekly-current')

  await clickText('.g-weekly-footer button', 'Ревью недели')
  await waitFor("Boolean(document.querySelector('.g-weekly-results'))")
  assert.match(await evaluate("document.querySelector('[role=dialog]').textContent"), /1 из 3/)
  const previousTasks = state.weeklyPlans[weekKeys.current].tasks
  await clickText('[role=dialog] button', 'План следующей недели')
  await waitFor("Boolean(document.querySelector('.g-week-plan-form textarea'))")
  const nextTitles = ['Publish the release', 'Read a new book', 'Prepare three workouts']
  await fill('.g-week-plan-form textarea', nextTitles.join('\n'), 'textarea')
  await evaluate("document.querySelector('.g-week-plan-form button[type=submit]').click()")
  await waitFor("!document.querySelector('[role=dialog]')")
  await waitFor(`window.lifeGame.loadState().then(state => state.weeklyPlans[${JSON.stringify(weekKeys.next)}]?.tasks.length === 3)`)
  state = await savedState()
  assert.deepEqual(state.weeklyPlans[weekKeys.current].tasks, previousTasks, 'Next week must retain the previous results')
  assert.ok(state.weeklyPlans[weekKeys.current].reviewedAt)
  assert.deepEqual(state.weeklyPlans[weekKeys.next].tasks.map(task => task.title), nextTitles)
  assert.equal(state.weeklyPlans[weekKeys.next].tasks.some(task => task.done), false)
  assert.equal(state.profile.totalXp, baseline.profile.totalXp)
  assert.equal(state.profile.gold, baseline.profile.gold)
  assert.deepEqual(state.history, baseline.history, 'Weekly review must not create XP history')
  await screenshot('weekly-next')
  await evaluate("document.querySelector('.g-weekly-list input[type=checkbox]').click()")
  await waitFor(`window.lifeGame.loadState().then(state => state.weeklyPlans[${JSON.stringify(weekKeys.next)}].tasks[0].done)`)
  await savedState()
  await reload()
  await clickText('.g-week-switch button', 'Следующая')
  await waitFor("document.querySelector('.g-week-switch [aria-pressed=true]')?.textContent === 'Следующая'")
  assert.equal(await evaluate("document.querySelector('.g-weekly-list input[type=checkbox]').checked"), true)
  await clickText('.g-week-switch button', 'Текущая')
  await waitFor("document.querySelector('.g-week-switch [aria-pressed=true]')?.textContent === 'Текущая'")
  assert.equal(await evaluate("document.querySelector('.g-weekly-list input[type=checkbox]').checked"), true)
  assert.match(await evaluate("document.querySelector('.g-weekly-context').textContent"), /ревью пройдено/)

  // Waking on Monday activates the stored future plan; last week's results remain as history.
  await evaluate(`{
    const OriginalDate = Date;
    const mondayTime = new OriginalDate(${JSON.stringify(weekKeys.next)} + 'T12:00:00').getTime();
    window.Date = class extends OriginalDate {
      constructor(...args) { super(...(args.length ? args : [mondayTime])); }
      static now() { return mondayTime; }
    };
    window.dispatchEvent(new Event('focus'));
  }`)
  await waitFor("document.querySelector('.g-weekly-list')?.textContent.includes('Publish the release')")
  assert.equal(await evaluate("document.querySelector('.g-weekly-list input[type=checkbox]').checked"), true)
  state = await savedState()
  assert.deepEqual(state.weeklyPlans[weekKeys.current].tasks, previousTasks)
  assert.ok(state.weeklyPlans[weekKeys.current].reviewedAt)
  assert.equal(state.profile.totalXp, baseline.profile.totalXp)
  assert.equal(state.profile.gold, baseline.profile.gold)
  assert.deepEqual(state.history, baseline.history)
  await screenshot('weekly-monday')
  await clickText('.g-weekly-footer button', 'Ревью недели')
  await waitFor("Boolean(document.querySelector('.g-week-history select'))")
  await evaluate(`{
    const select = document.querySelector('.g-week-history select');
    select.value = ${JSON.stringify(weekKeys.current)};
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }`)
  await waitFor("document.querySelector('.g-weekly-results')?.textContent.includes('Finish and review the first release')")
  assert.match(await evaluate("document.querySelector('[role=dialog] h3').textContent"), /1 из 3/)
  assert.equal(await evaluate("[...document.querySelectorAll('[role=dialog] button')].some(button => button.textContent.trim() === 'План следующей недели')"), false)
  await screenshot('weekly-history')
  await evaluate("document.querySelector('[role=dialog] .modal-header button').click()")
  await waitFor("!document.querySelector('[role=dialog]')")
}
