import initSqlJs from 'sql.js'

let _dbPromise = null

async function fetchArrayBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${await res.text()}`)
  return res.arrayBuffer()
}

/**
 * Load the sqlite database into sql.js.
 *
 * Contract:
 * - Returns a sql.js Database instance.
 * - Caches the instance across calls.
 */
export async function getWasmDb({ dbUrl = '/data/gatcg.sqlite', wasmUrl = '/sql-wasm.wasm' } = {}) {
  if (_dbPromise) return _dbPromise

  _dbPromise = (async () => {
    const SQL = await initSqlJs({ locateFile: () => wasmUrl })
    const buf = await fetchArrayBuffer(dbUrl)
    const db = new SQL.Database(new Uint8Array(buf))

    // Quick sanity check: cards table exists.
    try {
      db.exec('SELECT 1 FROM cards LIMIT 1')
    } catch (e) {
      db.close()
      throw new Error(`Invalid sqlite schema in ${dbUrl}: ${e?.message || e}`)
    }

    return db
  })()

  return _dbPromise
}

export function resetWasmDbCache() {
  _dbPromise = null
}
