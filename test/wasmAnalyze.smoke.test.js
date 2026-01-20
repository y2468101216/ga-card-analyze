const assert = require('assert')

// This is a tiny smoke test to ensure the repo's sqlite artifact can be loaded
// with sql.js (WASM) and queried. The web app uses ESM/Vite, but our mocha
// runner is CommonJS, so we test the same underlying pieces here.

describe('wasm sqlite analyze (smoke)', function () {
  this.timeout(60000)

  it('loads sqlite db via sql.js and can query a known table', async () => {
    const path = require('path')
    const fs = require('fs')

    const initSqlJs = require('sql.js')

    const wasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
    const dbPath = path.join(__dirname, '..', 'data', 'gatcg.sqlite')

    const SQL = await initSqlJs({ locateFile: () => wasmPath })
    const buf = fs.readFileSync(dbPath)
    const db = new SQL.Database(new Uint8Array(buf))

    const res = db.exec('SELECT count(*) AS n FROM cards')
    assert.ok(res && res.length)
    db.close()
  })
})
