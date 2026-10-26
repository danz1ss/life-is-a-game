const assert = require('node:assert/strict')

module.exports = async ({ window, evaluate, waitFor, navigate }) => {
  await navigate(0, '.g-list')
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const fill = (selector, value) => evaluate(`{
    const input = document.querySelector(${JSON.stringify(selector)});
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }`)
  const ids = () => evaluate("[...document.querySelectorAll('.g-list > [data-reorder-id]')].map(row => row.dataset.reorderId)")
  assert.deepEqual(await ids(), ['quest-project', 'quest-walk', 'quest-reading'])

  await click('.g-header-actions .button--primary')
  await waitFor("Boolean(document.querySelector('[role=dialog] input[type=time]'))")
  await fill('[role=dialog] input[maxlength="120"]', 'Проверка сортировки')
  await fill('[role=dialog] input[type=time]', '09:00')
  await click('[role=dialog] button[type=submit]')
  await waitFor("document.querySelectorAll('.g-list > [data-reorder-id]').length === 4")
  const created = (await ids())[0]
  assert.notEqual(created, 'quest-project')
  const row = `.g-list [data-reorder-id="${created}"]`
  await click(`${row} .g-time-duration button`)
  await waitFor(`Boolean(document.querySelector(${JSON.stringify(row + ' input[type=time]')}))`)
  await fill(`${row} input[type=time]`, '19:00')
  assert.deepEqual(await ids(), ['quest-project', 'quest-walk', created, 'quest-reading'])
  await evaluate(`[...document.querySelectorAll(${JSON.stringify(row + ' .g-time-editor-actions button')})].find(b => b.textContent === 'Убрать время').click()`)
  assert.deepEqual(await ids(), ['quest-project', 'quest-walk', 'quest-reading', created])

  await waitFor("Boolean(document.querySelector('.save-state--saved'))")
  const loaded = new Promise(resolve => window.webContents.once('did-finish-load', resolve))
  window.reload(); await loaded
  await waitFor("document.querySelectorAll('.g-list > [data-reorder-id]').length === 4")
  assert.deepEqual(await ids(), ['quest-project', 'quest-walk', 'quest-reading', created])
  await click(`${row} .quest-actions__trigger`)
  await waitFor("Boolean(document.querySelector('.quest-actions__menu'))")
  await click('.quest-actions__menu button')
  await waitFor("Boolean(document.querySelector('[role=dialog] input[type=time]'))")
  await fill('[role=dialog] input[type=time]', '00:00')
  await click('[role=dialog] button[type=submit]')
  await waitFor("!document.querySelector('[role=dialog]')")
  assert.equal((await ids())[0], created)
}
