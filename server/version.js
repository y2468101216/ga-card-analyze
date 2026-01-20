const fs = require('fs')
const path = require('path')

function safeReadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

function getPackageMeta() {
  const pkgPath = path.resolve(__dirname, '..', 'package.json')
  const pkg = safeReadJson(pkgPath)
  return {
    name: pkg?.name || null,
    version: pkg?.version || null
  }
}

function getGitCommit() {
  // Works for a git checkout without requiring git executable.
  try {
    const headPath = path.resolve(__dirname, '..', '.git', 'HEAD')
    const head = fs.readFileSync(headPath, 'utf8').trim()
    if (head.startsWith('ref:')) {
      const ref = head.replace('ref:', '').trim()
      const refPath = path.resolve(__dirname, '..', '.git', ref)
      return fs.readFileSync(refPath, 'utf8').trim() || null
    }
    return head || null
  } catch {
    return null
  }
}

function getApiVersionInfo() {
  const pkg = getPackageMeta()
  return {
    ...pkg,
    commit: getGitCommit(),
    startedAt: process.env.API_STARTED_AT || null,
    now: new Date().toISOString(),
    apiPort: process.env.API_PORT || process.env.PORT || null
  }
}

module.exports = { getApiVersionInfo }

