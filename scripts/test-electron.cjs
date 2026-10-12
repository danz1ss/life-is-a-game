// Run after npm run build. Every scenario uses a separate temporary SQLite profile.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { DatabaseSync } = require('node:sqlite')

const project = path.resolve(__dirname, '..')
const databaseName = 'life-is-a-game.sqlite'
const invalidPayload = JSON.stringify({ version: 4, skills: [], quests: [], profile: { name: 'Broken' } })

if (!process.versions.electron) {
  const { spawnSync } = require('node:child_process')
  const electron = require('electron')
  for (const scenario of (process.env.LIFE_GAME_SMOKE_CASES?.split(',') ?? ['close', 'corrupt', 'null', 'import', 'retry', 'planning', 'review', 'levels', 'weekly', 'weekly-review', 'today-cards', 'skill-picker', 'tree-ux', 'today-summary'])) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'life-game-smoke-'))
    try {
      if (scenario === 'corrupt' || scenario === 'null') {
        const database = new DatabaseSync(path.join(directory, databaseName))
        database.exec('CREATE TABLE app_state (id INTEGER PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL)')
        database.prepare('INSERT INTO app_state VALUES (1, ?, ?)').run(scenario === 'null' ? 'null' : invalidPayload, new Date().toISOString())
        database.close()
      }
      fs.writeFileSync(path.join(directory, 'invalid-backup.json'), invalidPayload)
      const env = { ...process.env, LIFE_GAME_USER_DATA: directory, LIFE_GAME_LOAD_DIST: '1', LIFE_GAME_SMOKE: scenario }
      delete env.ELECTRON_RUN_AS_NODE
      const result = spawnSync(electron, [__filename], { cwd: project, env, windowsHide: true, timeout: 30_000, encoding: 'utf8' })
      assert.equal(result.status, 0, `${scenario}: ${result.error ?? ''}\n${result.stdout}\n${result.stderr}`)
      if (scenario === 'weekly-review' || scenario === 'tree-ux') {
        const restarted = spawnSync(electron, [__filename], { cwd: project, env: { ...env, LIFE_GAME_SMOKE: `${scenario}-persist` }, windowsHide: true, timeout: 30_000, encoding: 'utf8' })
        assert.equal(restarted.status, 0, `${scenario} restart: ${restarted.error ?? ''}\n${restarted.stdout}\n${restarted.stderr}`)
      }
      const database = new DatabaseSync(path.join(directory, databaseName), { readOnly: true })
      const row = database.prepare('SELECT payload FROM app_state WHERE id = 1').get()
      database.close()
      if (scenario === 'corrupt' || scenario === 'null') assert.equal(row.payload, scenario === 'null' ? 'null' : invalidPayload, 'Failed loading must not overwrite the original save')
      else {
        const state = JSON.parse(row.payload)
        const completed = scenario === 'close' || scenario === 'retry' || scenario === 'review'
        assert.equal(state.profile.totalXp, scenario === 'levels' ? 650 : completed ? 50 : 0)
        assert.equal(state.history.length, scenario === 'levels' ? 3 : completed ? 1 : 0)
        if (scenario === 'levels') {
          assert.equal(state.profile.gold, 10, 'Only the quest grants coins; reaching level five has no coin bonus')
          assert.equal(state.history.find((event) => event.type === 'level').gold, 0)
          assert.equal(state.levelRewards.highestLevel, 5)
          assert.ok(state.levelRewards.personal[0].claimedAt)
        }
        if (scenario === 'weekly') {
          const plans = Object.values(state.weeklyPlans)
          assert.equal(state.profile.gold, 0, 'Weekly actions must not grant gold')
          assert.equal(plans.length, 2, 'Current and following weekly plans must both persist')
          assert.equal(plans.filter((plan) => Boolean(plan.reviewedAt)).length, 1)
          assert.equal(plans[0].tasks.length, 3)
          assert.equal(plans[0].tasks.filter((task) => task.done).length, 1)
          assert.equal(plans[1].tasks.length, 3)
          assert.equal(plans[1].tasks.filter((task) => task.done).length, 1)
        }
        assert.equal(state.skills.length, scenario === 'skill-picker' ? 10 : scenario === 'tree-ux' ? 41 : 8)
      }
      console.log(`PASS Electron: ${scenario}`)
    } finally {
      // Only remove the new directory allocated for this test under the OS temp root.
      assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()))
      assert.ok(path.basename(directory).startsWith('life-game-smoke-'))
      fs.rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    }
  }
} else {
  const { app, dialog } = require('electron')
  // The isolated smoke harness also runs on hosts without a usable native GPU.
  app.disableHardwareAcceleration()
  const scenario = process.env.LIFE_GAME_SMOKE
  const timeout = setTimeout(() => { console.error('Electron smoke test timed out'); app.exit(1) }, scenario === 'tree-ux' ? 28_000 : 20_000)
  app.on('will-quit', () => clearTimeout(timeout))
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path.join(process.env.LIFE_GAME_USER_DATA, 'invalid-backup.json')] })

  app.on('browser-window-created', (_event, window) => {
    window.hide()
    window.webContents.setBackgroundThrottling(false)
    window.webContents.once('did-finish-load', async () => {
      const evaluate = (code) => window.webContents.executeJavaScript(code)
      const waitFor = async (expression) => {
        for (let attempt = 0; attempt < 200; attempt++) {
          if (await evaluate(expression)) return
          await new Promise((resolve) => setTimeout(resolve, 20))
        }
        throw new Error(`Timed out: ${expression}`)
      }
      const navigate = async (index, selector) => {
        await evaluate(`document.querySelectorAll('.main-nav button')[${index}].click()`)
        await waitFor(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)
      }
      const screenshot = async (name) => {
        if (!process.env.LIFE_GAME_SCREENSHOTS) return
        await evaluate("document.getAnimations().forEach(animation => { if (Number.isFinite(animation.effect?.getComputedTiming().endTime)) animation.finish() })")
        await new Promise((resolve) => setTimeout(resolve, 150))
        const image = await window.webContents.capturePage(undefined, { stayHidden: true, stayAwake: true })
        fs.writeFileSync(path.join(process.env.LIFE_GAME_SCREENSHOTS, `${name}.png`), image.toPNG())
      }
      try {
        if (scenario === 'corrupt' || scenario === 'null') {
          await waitFor("Boolean(document.querySelector('[role=alert] button'))")
          assert.equal(await evaluate("Boolean(document.querySelector('.app-shell'))"), false)
          // Longer than the save debounce: a failed load must not schedule any write.
          await new Promise((resolve) => setTimeout(resolve, 400))
        } else {
          await waitFor("Boolean(document.querySelector('.g-quest.is-main .quest-check'))")
          await navigate(2, '.react-flow__node')
          await navigate(3, '.progress-summary')
          await waitFor("Boolean(document.querySelector('.progress-shop__grid'))")
          if (scenario === 'planning' || scenario === 'levels') {
            await require('./test-planning.cjs')({ scenario, window, evaluate, waitFor, navigate, screenshot })
          } else if (scenario === 'review') {
            await require('./test-review.cjs')({ window, evaluate, waitFor, navigate, screenshot })
          } else if (scenario === 'weekly') {
            await require('./test-weekly.cjs')({ window, evaluate, waitFor, navigate, screenshot })
          } else if (scenario === 'weekly-review' || scenario === 'weekly-review-persist') {
            await require('./test-weekly-review.cjs')({ window, evaluate, waitFor, navigate })
          } else if (scenario === 'today-cards') {
            await require('./test-today-cards.cjs')({ window, evaluate, waitFor, navigate })
          } else if (scenario === 'skill-picker') {
            await require('./test-skill-picker.cjs')({ window, evaluate, waitFor, navigate })
          } else if (scenario === 'tree-ux' || scenario === 'tree-ux-persist') {
            await require('./test-tree-ux.cjs')({ window, evaluate, waitFor, navigate })
          } else if (scenario === 'today-summary') {
            await require('./test-today-summary.cjs')({ window, evaluate, waitFor, navigate })
          } else if (scenario === 'import') {
            await evaluate("window.confirm = () => true; [...document.querySelectorAll('.sidebar-actions .nav-item')].find((button) => button.textContent.includes('Данные приложения')).click()")
            await waitFor("Boolean(document.querySelector('.data-modal'))")
            await evaluate("document.querySelectorAll('.data-modal__actions button')[1].click()")
            await waitFor("Boolean(document.querySelector('.data-modal__message'))")
            assert.match(await evaluate("document.querySelector('.data-modal__message').textContent"), /Некорректные данные/)
            assert.equal(await evaluate("document.querySelector('.progress-summary__wallet strong').textContent"), '0')
          } else {
            await navigate(0, '.g-quest.is-main .quest-check')
            let lock
            if (scenario === 'retry') {
              await waitFor("Boolean(document.querySelector('.save-state--saved'))")
              lock = new DatabaseSync(path.join(process.env.LIFE_GAME_USER_DATA, databaseName))
              lock.exec('BEGIN IMMEDIATE')
            }
            // Close as soon as the UI commits, before the 250 ms auto-save timer.
            const start = Date.now()
            await evaluate("document.querySelector('.g-quest.is-main .quest-check').click()")
            await waitFor("Boolean(document.querySelector('.g-quest.is-main .quest-check[aria-pressed=true]'))")
            assert.ok(Date.now() - start < 250, 'Close test missed the debounce window')
            if (lock) {
              window.close()
              await waitFor("Boolean(document.querySelector('.save-state--error'))")
              assert.equal(window.isDestroyed(), false, 'A failed save must keep the window open')
              lock.exec('ROLLBACK')
              lock.close()
            }
          }
        }
        window.close()
      } catch (error) {
        console.error(error)
        app.exit(1)
      }
    })
  })
  require(path.join(project, 'electron', 'main.cjs'))
}
