const assert = require('node:assert/strict')

module.exports = async ({ scenario, window, evaluate, waitFor, navigate, screenshot }) => {
  const fill = async (selector, value) => evaluate(`{
    const input = document.querySelector(${JSON.stringify(selector)});
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }`)
  const reload = async () => {
    const loaded = new Promise((resolve) => window.webContents.once('did-finish-load', resolve))
    window.reload()
    await loaded
    await waitFor("Boolean(document.querySelector('.g-quest.is-main .quest-check'))")
  }
  await waitFor("Boolean(document.querySelector('.save-state--saved'))")
  await evaluate(`(async () => {
    const state = await window.lifeGame.loadState();
    if (${JSON.stringify(scenario)} === 'levels') {
      state.profile.totalXp = 600;
      state.levelRewards.highestLevel = 4;
      state.levelRewards.acknowledgedLevel = 4;
    } else {
      const today = state.quests[0].dueDate;
      const later = (days) => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() + days); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
      const base = state.quests[0];
      state.quests.push(
        { ...base, id: 'daily', title: 'Daily task', isMain: false, dueDate: null, repeatDays: [0,1,2,3,4,5,6], order: 3 },
        { ...base, id: 'idea', title: 'Undated idea', isMain: false, dueDate: null, order: 4 },
        { ...base, id: 'later', title: 'Later task', isMain: false, dueDate: later(3), order: 5 },
        { ...base, id: 'day-after', title: 'Day after task', isMain: false, dueDate: later(2), order: 6 }
      );
    }
    await window.lifeGame.saveState(state);
  })()`)
  await reload()
  if (scenario === 'planning') {
    const originalMain = await evaluate("document.querySelector('#focus-title').textContent")
    await evaluate("[...document.querySelectorAll('.g-header-actions button')].find(button => button.textContent.trim() === 'Завтра').click()")
    await waitFor("Boolean(document.querySelector('#tomorrow-plan'))")
    assert.deepEqual(await evaluate("[...document.querySelectorAll('.quest-section')][1] && [...document.querySelectorAll('.quest-section')][1].querySelectorAll('h3').length"), 3)
    assert.deepEqual(await evaluate("[...document.querySelectorAll('.quest-section')][1] && [...[...document.querySelectorAll('.quest-section')][1].querySelectorAll('h3')].map(el => el.textContent)"), ['Day after task', 'Later task', 'Undated idea'])
    await evaluate("document.querySelector('#tomorrow-plan header button').click()")
    await waitFor("Boolean(document.querySelector('[role=dialog] input[type=date]'))")
    const tomorrow = await evaluate("document.querySelector('[role=dialog] input[type=date]').value")
    await fill('[role=dialog] input', 'Tomorrow priority')
    await evaluate("document.querySelector('[role=dialog] input[type=checkbox]').click()")
    await evaluate("document.querySelector('[role=dialog] button[type=submit]').click()")
    await waitFor("document.querySelectorAll('#tomorrow-plan .quest-card').length === 2")
    assert.equal(await evaluate("[...document.querySelectorAll('#tomorrow-plan .quest-card')].find(el=>el.textContent.includes('Tomorrow priority')).querySelector('.main-badge') !== null"), true)
    assert.equal(await evaluate("Boolean(document.querySelector('#tomorrow-plan .quest-check'))"), false)
    assert.equal(await evaluate("document.querySelector('#tomorrow-plan').textContent.includes('Выше') || document.querySelector('#tomorrow-plan').textContent.includes('Ниже') || document.querySelector('#tomorrow-plan').textContent.includes('Главный на завтра')"), false)
    assert.equal(await evaluate("[...document.querySelectorAll('.quest-section')][1].textContent.includes('На завтра')"), false)
    assert.equal(await evaluate("[...document.querySelectorAll('.quest-section')][1].textContent.includes('Без даты')"), true)
    await evaluate("[...document.querySelectorAll('#tomorrow-plan .quest-card')].find(el=>el.textContent.includes('Tomorrow priority')).querySelector('.quest-actions__trigger').click()")
    await waitFor("Boolean(document.querySelector('.quest-actions__menu'))")
    await evaluate("document.querySelector('.quest-actions__menu button').click()")
    await waitFor("Boolean(document.querySelector('[role=dialog] input[type=time]'))")
    await fill('[role=dialog] input[type=time]', '09:30')
    await evaluate("document.querySelector('[role=dialog] button[type=submit]').click()")
    await waitFor("!document.querySelector('[role=dialog]')")
    await screenshot('tomorrow-plan')
    await navigate(0, '.g-quest.is-main .quest-check')
    assert.equal(await evaluate("document.querySelector('#focus-title').textContent"), originalMain)
    await waitFor("Boolean(document.querySelector('.save-state--saved'))")
    await reload()
    // Simulate waking the app tomorrow; the persisted selection must become today's main quest.
    await evaluate(`{
      const OriginalDate = Date;
      const tomorrowTime = new OriginalDate(${JSON.stringify(tomorrow)} + 'T12:00:00').getTime();
      window.Date = class extends OriginalDate {
        constructor(...args) { super(...(args.length ? args : [tomorrowTime])); }
        static now() { return tomorrowTime; }
      };
      window.dispatchEvent(new Event('focus'));
    }`)
    await waitFor("document.querySelector('#focus-title')?.textContent === 'Tomorrow priority'")
    assert.equal(await evaluate("document.querySelector('.g-quest.is-main .g-time-summary').textContent.includes('09:30')"), true)
    await screenshot('prepared-day')
  } else {
    await navigate(3, '.progress-summary')
    await screenshot('character-editor')
    await evaluate("document.querySelector('.progress-hero__actions button').click()")
    await waitFor("Boolean(document.querySelector('.appearance-editor'))")
    await evaluate("[...document.querySelectorAll('.appearance-editor__tabs button')].find(button => button.textContent === 'Одежда').click()")
    assert.equal(await evaluate("[...document.querySelectorAll('.appearance-editor__choice')].some(button => button.textContent.includes('Мантия мага') && button.disabled)"), true)
    await evaluate("[...document.querySelectorAll('.appearance-editor__tabs button')].find(button => button.textContent === 'Оружие').click()")
    await evaluate("[...document.querySelectorAll('.appearance-editor__choice')].find(button => button.textContent.includes('Щит')).click()")
    await waitFor("[...document.querySelectorAll('.appearance-editor__choice')].find(button => button.textContent.includes('Щит')).classList.contains('is-selected')")
    await evaluate("document.querySelector('.appearance-editor__footer .button--primary').click()")
    await waitFor("window.lifeGame.loadState().then(state => state.profile.character?.weapon === 'shield')")
    await evaluate("document.querySelectorAll('.progress-hero__actions button')[1].click()")
    await waitFor("Boolean(document.querySelector('.level-rewards-section'))")
    await evaluate("document.querySelector('.level-rewards-section .rewards-heading button').click()")
    await waitFor("Boolean(document.querySelector('[role=dialog] input[type=number]'))")
    await fill('[role=dialog] input', 'A book for level five')
    await evaluate("document.querySelector('[role=dialog] button[type=submit]').click()")
    await waitFor("Boolean(document.querySelector('.level-reward-card'))")
    assert.equal(await evaluate("document.querySelector('.level-reward-card > button').disabled"), true)
    await navigate(0, '.g-quest.is-main .quest-check')
    await evaluate("document.querySelector('.g-quest.is-main .quest-check').click()")
    await waitFor("Boolean(document.querySelector('[data-testid=level-up]'))")
    assert.equal(await evaluate("Boolean(document.querySelector('.level-up__gold'))"), false)
    assert.equal(await evaluate("document.querySelector('[data-testid=level-up]').textContent.includes('монет')"), false, 'Level-up must not promise coins')
    assert.match(await evaluate("document.querySelector('[data-testid=level-up]').textContent"), /Питомец подрастает/)
    await screenshot('level-up')
    await evaluate("document.querySelector('.level-up button').click()")
    await evaluate("document.querySelector('.g-quest.is-main .quest-check').click()")
    await waitFor("!document.querySelector('.g-quest.is-main .quest-check[aria-pressed=true]')")
    await evaluate("document.querySelector('.g-quest.is-main .quest-check').click()")
    await waitFor("Boolean(document.querySelector('.g-quest.is-main .quest-check[aria-pressed=true]'))")
    assert.equal(await evaluate("Boolean(document.querySelector('[data-testid=level-up]'))"), false)
    await navigate(3, '.progress-summary')
    await evaluate("document.querySelectorAll('.progress-hero__actions button')[1].click()")
    await waitFor("Boolean(document.querySelector('.level-reward-card'))")
    await screenshot('level-rewards')
    await evaluate("document.querySelector('.level-reward-card > button').click()")
    await waitFor("document.querySelector('.level-reward-card > button').disabled")
    await waitFor("Boolean(document.querySelector('.save-state--saved'))")
    await reload()
    assert.equal(await evaluate("Boolean(document.querySelector('[data-testid=level-up]'))"), false)
    await navigate(3, '.progress-summary')
    await evaluate("document.querySelectorAll('.progress-hero__actions button')[1].click()")
    await waitFor("Boolean(document.querySelector('.level-reward-card'))")
    assert.equal(await evaluate("document.querySelector('.level-reward-card > button').disabled"), true)
    assert.equal(await evaluate("document.querySelector('.progress-summary__wallet strong').textContent"), '10', 'Only the hard quest grants coins; level-up and personal gift do not')
  }
}
