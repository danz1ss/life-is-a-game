const { spawn } = require('node:child_process')
const electronPath = require('electron')

const environment = { ...process.env }
delete environment.ELECTRON_RUN_AS_NODE
if (process.argv.includes('--dist')) environment.LIFE_GAME_LOAD_DIST = '1'

const child = spawn(electronPath, ['.'], {
  cwd: process.cwd(),
  env: environment,
  stdio: 'inherit',
})

child.on('exit', (code) => process.exit(code ?? 0))
