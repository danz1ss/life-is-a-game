const fs = require('node:fs')
const path = require('node:path')
const { fileURLToPath } = require('node:url')
const { _electron } = require('C:/Users/muroc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')

async function main() {
  const deadline = setTimeout(() => { console.error('Preview timed out'); process.exit(2) }, 25000)
  const root = path.resolve(__dirname, '..')
  const profile = path.join(root, '.local-test-profile', 'hero-capture')
  const output = path.join(root, 'artifacts', 'hero-layout-preview.png')
  const cardOutput = path.join(root, 'artifacts', 'hero-card-preview.png')
  const narrowOutput = path.join(root, 'artifacts', 'hero-card-narrow-preview.png')
  fs.mkdirSync(profile, { recursive: true })
  fs.mkdirSync(path.dirname(output), { recursive: true })
  const electron = await _electron.launch({
    executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: ['.', '--disable-gpu'],
    cwd: root,
    env: { ...process.env, LIFE_GAME_USER_DATA: profile, LIFE_GAME_LOAD_DIST: '1', LIFE_GAME_PROFILE_LABEL: 'HERO LAYOUT QA 0.9.0' },
    timeout: 15000,
  })
  try {
    console.log('Electron launched')
    const page = await electron.firstWindow()
    page.setDefaultTimeout(8000)
    const url = page.url()
    const title = await page.title()
    const userData = await electron.evaluate(({ app }) => app.getPath('userData'))
    console.log(JSON.stringify({ url, title, userData }))
    if (!url.startsWith('file:') || path.resolve(fileURLToPath(url)) !== path.join(root, 'dist', 'index.html') || path.resolve(userData) !== profile) {
      throw new Error('Refusing to capture a page outside the isolated local preview')
    }
    await page.locator('.main-nav button').nth(4).click()
    await page.locator('.character-settings__preview').waitFor()
    console.log('Hero card ready')
    await page.screenshot({ path: output, animations: 'disabled', timeout: 8000 })
    await page.locator('.character-settings__preview').screenshot({ path: cardOutput, animations: 'disabled', timeout: 8000 })
    const measurements = await page.locator('.character-settings__preview').evaluate((card) => {
      const box = (selector) => {
        const rect = card.querySelector(selector).getBoundingClientRect()
        return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
      }
      return { card: box('.character-settings__art'), portrait: box('.character-settings__art > svg'), pet: box('.character-settings__pet-at-feet'), identity: box('.character-settings__identity'), next: box('.character-settings__next') }
    })
    await electron.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1040, 760))
    await page.locator('.character-settings__preview').screenshot({ path: narrowOutput, animations: 'disabled', timeout: 8000 })
    console.log(JSON.stringify({ output, cardOutput, narrowOutput, measurements }))
  } finally {
    await electron.close()
    clearTimeout(deadline)
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
