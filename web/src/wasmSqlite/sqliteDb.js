import initSqlJs from 'sql.js'

let _dbPromise = null

async function fetchArrayBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${await res.text()}`)
  return res.arrayBuffer()
}

function withBase(path) {
  // Vite sets import.meta.env.BASE_URL; under GitHub Pages this is like '/ga-card-analyze/'.
  const base = (import.meta?.env?.BASE_URL) || '/'
  return new URL(path.replace(/^\//, ''), new URL(base, window.location.origin)).toString()
}

/**
 * Load the sqlite database into sql.js.
 *
 * Contract:
 * - Returns a sql.js Database instance.
 * - Caches the instance across calls.
 */
export async function getWasmDb({ dbUrl, wasmUrl } = {}) {
  if (_dbPromise) return _dbPromise

  const resolvedDbUrl = dbUrl || withBase('/data/gatcg.sqlite')
  const resolvedWasmUrl = wasmUrl || withBase('/sql-wasm.wasm')

  _dbPromise = (async () => {
    const SQL = await initSqlJs({ locateFile: () => resolvedWasmUrl })
    const buf = await fetchArrayBuffer(resolvedDbUrl)
    const db = new SQL.Database(new Uint8Array(buf))

    // Quick sanity check: cards table exists.
    try {
      db.exec('SELECT 1 FROM cards LIMIT 1')
    } catch (e) {
      db.close()
      throw new Error(`Invalid sqlite schema in ${resolvedDbUrl}: ${e?.message || e}`)
    }

    return db
  })()

  return _dbPromise
}

export function resetWasmDbCache() {
  _dbPromise = null
}
