const fs = require('fs')
const path = require('path')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath)
  ensureDir(dir)
  const tmp = `${filePath}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmp, filePath)
}

module.exports = { ensureDir, writeJsonAtomic }

