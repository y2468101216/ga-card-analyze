#!/usr/bin/env node

// A tiny dev runner that loads .env once and then starts both API (nodemon) and WEB (vite)
// with consistent ports. This avoids brittle shell quoting in package.json.

require('dotenv').config()

const { spawn } = require('child_process')

const apiPort = process.env.API_PORT || '3001'
const vitePort = process.env.VITE_PORT || '5173'

function run(name, command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, ...extraEnv }
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${name}] exited with signal ${signal}`)
    } else if (code !== 0) {
      console.log(`[${name}] exited with code ${code}`)
    }
  })

  return child
}

console.log(`[DEV] API_PORT=${apiPort} VITE_PORT=${vitePort}`)

// Use local binaries via npm exec to avoid PATH issues.
const api = run('API', process.platform === 'win32' ? 'npx.cmd' : 'npx', [
  'nodemon',
  '--watch',
  'server',
  '--watch',
  'src',
  'server/index.js'
], {
  API_PORT: apiPort
})

const web = run('WEB', process.platform === 'win32' ? 'npx.cmd' : 'npx', [
  'vite',
  '--strictPort',
  '--port',
  String(vitePort)
], {
  VITE_PORT: vitePort,
  API_PORT: apiPort
})

function shutdown() {
  // On macOS/Linux, SIGINT will propagate; still try to terminate explicitly.
  try { api.kill('SIGINT') } catch {}
  try { web.kill('SIGINT') } catch {}
  setTimeout(() => process.exit(0), 250)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

