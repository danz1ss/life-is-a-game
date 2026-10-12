const assert = require('node:assert/strict')

module.exports = async ({ window, evaluate, waitFor, navigate, screenshot }) => {
  const yesterday = await evaluate(`(async () => {
    const state = await window.lifeGame.loadState();
    const day = new Date(state.quests[0].dueDate + 'T12:00:00');
    day.setDate(day.getDate() - 1);
    const key = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
    state.quests[0].dueDate = key;
    state.quests[1].dueDate = key;
    await window.lifeGame.saveState(state);
    return key;
  })()`)
  const loaded = new Promise((resolve) => window.webContents.once('did-finish-load', resolve))
  window.reload()
  await loaded
  await waitFor("Boolean(document.querySelector('.main-nav button'))")
  await waitFor("document.querySelector('.g-unresolved h2')?.textContent === '2 квеста требуют решения'")
  await screenshot('overdue-notice')
  await evaluate("document.querySelector('.g-unresolved-action').click()")
  await waitFor("Boolean(document.querySelector('.quest-section--danger'))")
  assert.equal(await evaluate("document.querySelector('.quest-sections > .quest-section--danger') !== null"), true)
  assert.equal(await evaluate("document.querySelectorAll('.quest-section--danger .quest-card').length"), 2)
  await screenshot('overdue-review')

  await evaluate("[...document.querySelectorAll('.quest-section--danger .quest-card')][1].querySelectorAll('.overdue-actions button')[2].click()")
  await waitFor("document.querySelectorAll('.quest-section--danger .quest-card').length === 1")
  await waitFor(`window.lifeGame.loadState().then(state => state.quests.find(quest => quest.id === 'quest-reading').dueDate !== ${JSON.stringify(yesterday)})`)
  const moved = await evaluate("window.lifeGame.loadState().then(state => state.quests.find(quest => quest.id === 'quest-reading').dueDate)")
  assert.notEqual(moved, yesterday)
  assert.equal(moved, await evaluate("new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0') + '-' + String(new Date().getDate()).padStart(2,'0')"))

  await evaluate("document.querySelector('.quest-section--danger .overdue-actions button').click()")
  await waitFor("!document.querySelector('.quest-section--danger')")
  await waitFor("window.lifeGame.loadState().then(state => state.history.some(event => event.questId === 'quest-project'))")
  const result = await evaluate("window.lifeGame.loadState().then(state => ({ quest: state.quests.find(quest => quest.id === 'quest-project'), event: state.history.find(event => event.questId === 'quest-project') }))")
  assert.equal(result.quest.dueDate, yesterday)
  assert.deepEqual(result.quest.completedDates, [yesterday])
  assert.equal(result.event.date, yesterday)
  await evaluate("document.querySelectorAll('.quest-planner-toolbar .segmented button')[2].click()")
  await waitFor("Boolean(document.querySelector('.archive-group'))")
  const expectedHeader = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${yesterday}T12:00:00`))
  assert.equal(await evaluate("document.querySelector('.archive-group h2').textContent"), expectedHeader)
  await screenshot('archive-days')

  await navigate(0, '.g-review button')
  assert.equal(await evaluate("Boolean(document.querySelector('.g-unresolved'))"), false)
  await evaluate("document.querySelectorAll('.g-day-board .quest-skip')[0].click()")
  await waitFor("document.querySelectorAll('.g-day-board .quest-card.is-skipped').length === 1")
  await evaluate("document.querySelectorAll('.g-day-board .quest-skip')[1].click()")
  await waitFor("document.querySelectorAll('.g-day-board .quest-card.is-skipped').length === 2")
  await evaluate("document.querySelector('.g-review button').click()")
  await waitFor("document.querySelector('[role=dialog] .modal-header h2')?.textContent === 'Ревью дня'")
  assert.match(await evaluate("document.querySelector('[role=dialog]').textContent"), /0 выполнено/)
  assert.match(await evaluate("document.querySelector('[role=dialog]').textContent"), /2 не выполнено/)
  assert.match(await evaluate("document.querySelector('[role=dialog]').textContent"), /0 без отметки/)
  await evaluate("[...document.querySelectorAll('[role=dialog] button')].find(button => button.textContent.includes('Закрыть и открыть план')).click()")
  await waitFor("Boolean(document.querySelector('#tomorrow-plan'))")
  await waitFor("Boolean(document.querySelector('.quest-section--danger'))")
  assert.equal(await evaluate("document.querySelectorAll('.quest-section--danger .quest-card').length"), 2)
  await waitFor("window.lifeGame.loadState().then(state => state.dayPlans[new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0') + '-' + String(new Date().getDate()).padStart(2,'0')].closed === true)")
  const afterClose = await evaluate("window.lifeGame.loadState().then(state => state.quests.find(quest => quest.id === 'quest-reading').dueDate)")
  assert.equal(afterClose, moved)
}
