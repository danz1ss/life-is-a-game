const { app, BrowserWindow, dialog, ipcMain, session } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const { DatabaseSync } = require('node:sqlite')

if (process.env.LIFE_GAME_USER_DATA) app.setPath('userData', process.env.LIFE_GAME_USER_DATA)

let database

function getDatabase() {
  if (database) return database

  const databasePath = path.join(app.getPath('userData'), 'life-is-a-game.sqlite')
  database = new DatabaseSync(databasePath)
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
  return database
}

function loadState() {
  const row = getDatabase().prepare('SELECT payload FROM app_state WHERE id = 1').get()
  if (!row) return null
  return JSON.parse(row.payload)
}

function saveState(state) {
  const payload = JSON.stringify(state)
  JSON.parse(payload)
  getDatabase()
    .prepare(`
      INSERT INTO app_state (id, payload, updated_at)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
    `)
    .run(payload, new Date().toISOString())
  return true
}

function registerIpc() {
  ipcMain.handle('state:load', () => loadState())
  ipcMain.handle('state:save', (_event, state) => saveState(state))
  ipcMain.handle('storage:info', () => ({
    databasePath: path.join(app.getPath('userData'), 'life-is-a-game.sqlite'),
    offline: true,
  }))

  ipcMain.handle('backup:export', async (_event, state) => {
    const result = await dialog.showSaveDialog({
      title: 'Сохранить резервную копию',
      defaultPath: `life-is-a-game-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'Резервная копия Life is a Game', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) return { canceled: true }
    fs.writeFileSync(result.filePath, JSON.stringify(state, null, 2), 'utf8')
    return { canceled: false, filePath: result.filePath }
  })

  ipcMain.handle('backup:import', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Восстановить резервную копию',
      properties: ['openFile'],
      filters: [{ name: 'Резервная копия Life is a Game', extensions: ['json'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return { canceled: true }

    const state = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'))
    if (!state || typeof state !== 'object' || !Array.isArray(state.quests) || !Array.isArray(state.skills)) {
      throw new Error('Выбранный файл не является резервной копией Life is a Game')
    }
    saveState(state)
    return { canceled: false, state, filePath: result.filePaths[0] }
  })
}

function createWindow() {
  const profileTitle = process.env.LIFE_GAME_PROFILE_LABEL
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1040,
    minHeight: 700,
    backgroundColor: '#17191f',
    title: profileTitle ? `Life is a Game — ${profileTitle}` : 'Life is a Game',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (profileTitle) {
    window.on('page-title-updated', (event) => event.preventDefault())
    window.webContents.on('did-finish-load', () => window.setTitle(`Life is a Game — ${profileTitle}`))
  }

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  if (app.isPackaged || process.env.LIFE_GAME_LOAD_DIST === '1') {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  } else {
    window.loadURL('http://127.0.0.1:5173')
    if (process.env.LIFE_GAME_DEVTOOLS === '1') window.webContents.openDevTools({ mode: 'detach' })
  }
}

app.whenReady().then(() => {
  registerIpc()

  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (details, callback) => {
    const isLocalDev = !app.isPackaged && details.url.startsWith('http://127.0.0.1:5173')
    callback({ cancel: !isLocalDev })
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  if (database) database.close()
})
