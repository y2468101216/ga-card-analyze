// Expose internals for unit tests (kept small)

function parseDeck(deckText) {
  const lines = String(deckText || '').replace(/\r/g, '').split('\n')

  const sections = {
    material: [],
    main: [],
    sideboard: []
  }

  let current = null
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (line === '# Material Deck') {
      current = 'material'
      continue
    }
    if (line === '# Main Deck') {
      current = 'main'
      continue
    }
    if (line === '# Sideboard') {
      current = 'sideboard'
      continue
    }

    if (line.startsWith('#')) {
      current = null
      continue
    }

    if (!current) continue

    const m = line.match(/^(\d+)\s+(.+)$/)
    if (!m) continue
    const count = Number(m[1])
    const name = m[2]
    if (!Number.isFinite(count) || count <= 0) continue

    sections[current].push({ name, count })
  }

  for (const key of Object.keys(sections)) {
    const map = new Map()
    for (const x of sections[key]) {
      map.set(x.name, (map.get(x.name) || 0) + x.count)
    }
    sections[key] = Array.from(map.entries()).map(([name, count]) => ({ name, count }))
  }

  const hasMaterial = lines.some(l => l.trim() === '# Material Deck')
  const hasMain = lines.some(l => l.trim() === '# Main Deck')

  return { sections, hasMaterial, hasMain }
}

function bucketCost(v) {
  if (v === -1) return 'X'
  if (v === null || v === undefined) return 'Unknown'
  const n = Number(v)
  if (!Number.isFinite(n)) return 'Unknown'
  return String(n)
}

function toTitleCaseWord(s) {
  const str = String(s || '')
  if (!str) return str
  const lower = str.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function pickElementForChart(card) {
  const els = Array.isArray(card?.elements) ? card.elements : []
  if (els.length) {
    const filtered = els.filter(e => String(e).toUpperCase() !== 'EXALTED')
    if (filtered.length) return toTitleCaseWord(filtered[0])
    return 'Norm'
  }
  return toTitleCaseWord(card?.element || 'Unknown')
}

// NEW: type bucket helper used by API chart
function typeBuckets(items) {
  let total = 0
  const map = new Map()

  for (const it of items) {
    const rawTypes = Array.isArray(it?.card?.types) ? it.card.types : []
    const filtered = rawTypes
      .map(t => String(t || '').trim())
      .filter(Boolean)
      .filter(t => t.toUpperCase() !== 'UNIQUE')
      .map(t => toTitleCaseWord(t))

    if (!filtered.length) continue

    for (const t of filtered) {
      map.set(t, (map.get(t) || 0) + it.count)
      total += it.count
    }
  }

  return Array.from(map.entries())
    .map(([type, count]) => ({ type, count, ratio: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count || String(a.type).localeCompare(String(b.type)))
}

module.exports = {
  parseDeckForTest: parseDeck,
  bucketCostForTest: bucketCost,
  pickElementForChartForTest: pickElementForChart,
  typeBucketsForTest: typeBuckets
}
