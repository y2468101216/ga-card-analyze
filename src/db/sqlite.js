const path = require('path')
const Database = require('better-sqlite3')
const { CREATE_TABLES_SQL, SCHEMA_VERSION } = require('./schema')

function openDb({ dbPath } = {}) {
  const resolved = dbPath
    ? path.resolve(process.cwd(), dbPath)
    : path.resolve(process.cwd(), 'data', 'gatcg.sqlite')

  const db = new Database(resolved)
  db.pragma('busy_timeout = 5000')

  db.exec(CREATE_TABLES_SQL)

  const getVersion = db.prepare('SELECT value FROM sync_state WHERE key = ?')
  const row = getVersion.get('schema_version')
  if (!row) {
    db.prepare('INSERT OR REPLACE INTO sync_state(key, value) VALUES(?, ?)')
      .run('schema_version', String(SCHEMA_VERSION))
  }

  return db
}

module.exports = { openDb }

