const { spawn } = require('node:child_process')
const path = require('node:path')
const electronPath = require('electron')

const environment = { ...process.env }
delete environment.ELECTRON_RUN_AS_NODE
if (process.argv.includes('--dist')) environment.LIFE_GAME_LOAD_DIST = '1'
if (process.argv.includes('--isolated')) environment.LIFE_GAME_USER_DATA = path.join(process.cwd(), '.local-test-profile')

const child = spawn(electronPath, ['.'], {
  cwd: process.cwd(),
  env: environment,
  stdio: 'inherit',
})

child.on('exit', (code) => process.exit(code ?? 0))
