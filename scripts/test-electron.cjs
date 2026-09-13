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
  for (const scenario of (process.env.LIFE_GAME_SMOKE_CASES?.split(',') ?? ['close', 'corrupt', 'null', 'import', 'retry', 'planning', 'levels'])) {
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
      const database = new DatabaseSync(path.join(directory, databaseName), { readOnly: true })
      const row = database.prepare('SELECT payload FROM app_state WHERE id = 1').get()
      database.close()
      if (scenario === 'corrupt' || scenario === 'null') assert.equal(row.payload, scenario === 'null' ? 'null' : invalidPayload, 'Failed loading must not overwrite the original save')
      else {
        const state = JSON.parse(row.payload)
        const completed = scenario === 'close' || scenario === 'retry'
        assert.equal(state.profile.totalXp, scenario === 'levels' ? 650 : completed ? 50 : 0)
        assert.equal(state.history.length, scenario === 'levels' ? 3 : completed ? 1 : 0)
        if (scenario === 'levels') {
          assert.equal(state.profile.gold, 45)
          assert.equal(state.levelRewards.highestLevel, 5)
          assert.ok(state.levelRewards.personal[0].claimedAt)
        }
        assert.equal(state.skills.length, 8)
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
  const scenario = process.env.LIFE_GAME_SMOKE
  const timeout = setTimeout(() => { console.error('Electron smoke test timed out'); app.exit(1) }, 20_000)
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
          await waitFor("Boolean(document.querySelector('.main-quest button'))")
          await navigate(2, '.react-flow__node')
          await navigate(3, '.chart-panel')
          await navigate(4, '.data-actions')
          if (scenario === 'planning' || scenario === 'levels') {
            await require('./test-planning.cjs')({ scenario, window, evaluate, waitFor, navigate, screenshot })
          } else if (scenario === 'import') {
            await evaluate("window.confirm = () => true; document.querySelectorAll('.data-actions button')[1].click()")
            await waitFor("Boolean(document.querySelector('.inline-toast'))")
            assert.match(await evaluate("document.querySelector('.inline-toast').textContent"), /Некорректные данные/)
            assert.equal(await evaluate("document.querySelector('.wallet strong').textContent"), '0')
          } else {
            await navigate(0, '.main-quest button')
            let lock
            if (scenario === 'retry') {
              await waitFor("Boolean(document.querySelector('.save-state--saved'))")
              lock = new DatabaseSync(path.join(process.env.LIFE_GAME_USER_DATA, databaseName))
              lock.exec('BEGIN IMMEDIATE')
            }
            // Close as soon as the UI commits, before the 250 ms auto-save timer.
            const start = Date.now()
            await evaluate("document.querySelector('.main-quest button').click()")
            await waitFor("Boolean(document.querySelector('.main-quest.is-complete'))")
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
