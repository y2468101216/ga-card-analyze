export async function analyzeDeck(deckText) {
  return analyzeDeckWithMode(deckText)
}

async function analyzeDeckServer(deckText) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deckText })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function getAnalyzeMode() {
  // Priority:
  // 1) ?mode=wasm|server|auto
  // 2) localStorage ANALYZE_MODE
  // 3) default: auto
  try {
    const url = new URL(window.location.href)
    const q = url.searchParams.get('mode')
    if (q) return q
  } catch {}

  try {
    const v = localStorage.getItem('ANALYZE_MODE')
    if (v) return v
  } catch {}

  return 'auto'
}

async function analyzeDeckWithMode(deckText) {
  const mode = String(getAnalyzeMode() || 'auto').toLowerCase()

  if (mode === 'server') {
    return analyzeDeckServer(deckText)
  }

  if (mode === 'wasm') {
    const { analyzeDeckWasm } = await import('./wasmSqlite/analyze')
    return analyzeDeckWasm(deckText)
  }

  // auto: try wasm first, fallback to server
  try {
    const { analyzeDeckWasm } = await import('./wasmSqlite/analyze')
    return await analyzeDeckWasm(deckText)
  } catch (e) {
    // Fallback to server keeps original mechanism intact.
    return analyzeDeckServer(deckText)
  }
}

export async function fetchApiVersion() {
  // Fully offline: never call /api/version.
  if (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) {
    return { name: 'web', version: String(__APP_VERSION__) }
  }

  return { name: 'web', version: 'unknown' }
}
