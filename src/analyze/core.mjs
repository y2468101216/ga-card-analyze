// Pure ESM version of the analysis core for browser bundling.
//
// This duplicates the logic of src/analyze/core.js (CommonJS) so:
// - Node/server can keep using CommonJS
// - Vite/Rollup can bundle for the browser without any CJS interop edge cases

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

  // combine duplicates
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

function makeBuckets(items, getter) {
  let total = 0
  const map = new Map()
  for (const it of items) {
    const b = getter(it)
    map.set(b, (map.get(b) || 0) + it.count)
    total += it.count
  }
  return Array.from(map.entries())
    .map(([bucket, count]) => ({ bucket, count, ratio: total ? count / total : 0 }))
    .sort((a, b) => {
      const ax = a.bucket
      const bx = b.bucket
      const aNum = /^[0-9]+$/.test(ax) ? Number(ax) : null
      const bNum = /^[0-9]+$/.test(bx) ? Number(bx) : null
      if (aNum !== null && bNum !== null) return aNum - bNum
      if (aNum !== null) return -1
      if (bNum !== null) return 1
      if (ax === 'X' && bx !== 'X') return -1
      if (bx === 'X' && ax !== 'X') return 1
      return ax.localeCompare(bx)
    })
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

function elementDebugRow(it) {
  const card = it?.card
  const rawEls = Array.isArray(card?.elements) ? card.elements : []
  const filtered = rawEls.filter(e => String(e).toUpperCase() !== 'EXALTED')
  return {
    name: it?.name,
    count: it?.count,
    element: card?.element,
    elements: rawEls,
    elementsFiltered: filtered,
    chosenElement: pickElementForChart(card)
  }
}

function elementBuckets(items) {
  let total = 0
  const map = new Map()
  for (const it of items) {
    const e = pickElementForChart(it.card) || 'Unknown'
    map.set(e, (map.get(e) || 0) + it.count)
    total += it.count
  }
  return Array.from(map.entries()).map(([element, count]) => ({ element, count, ratio: total ? count / total : 0 }))
}

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

function countEffectMatches(items, regex) {
  const hits = []
  let total = 0
  for (const it of items) {
    const raw = String(it.card?.effect_raw || '')
    if (regex.test(raw)) {
      hits.push({ name: it.name, count: it.count })
      total += it.count
    }
  }
  return {
    totalCopies: total,
    items: hits.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    unique: hits.length
  }
}

function estimateDraw(raw) {
  const s = String(raw || '').toLowerCase()
  const m1 = s.match(/\bdraw\s+(a|one)\s+card\b/)
  if (m1) return 1
  const m2 = s.match(/\bdraw\s+(\d+)\s+cards?\b/)
  if (m2) return Number(m2[1])

  const words = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10
  }
  const m3 = s.match(/\bdraw\s+(one|two|three|four|five|six|seven|eight|nine|ten)\s+cards?\b/)
  if (m3) return words[m3[1]]

  return null
}

function estimateDiscard(raw) {
  const s = String(raw || '').toLowerCase()
  const m1 = s.match(/\bdiscard\s+(a|one)\s+card\b/)
  if (m1) return 1
  const m2 = s.match(/\bdiscard\s+(\d+)\s+cards?\b/)
  if (m2) return Number(m2[1])

  const words = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10
  }
  const m3 = s.match(/\bdiscard\s+(one|two|three|four|five|six|seven|eight|nine|ten)\s+cards?\b/)
  if (m3) return words[m3[1]]

  return null
}

/**
 * Browser/shared analysis core (ESM).
 *
 * hydrate(list) must return items shaped like:
 *   { name, count, card, imageUrl }
 */
export async function analyzeCore(deckText, { hydrate }) {
  const { sections, hasMaterial, hasMain } = parseDeck(deckText)
  if (!hasMaterial || !hasMain) {
    const err = new Error('Deck text must include exact "# Material Deck" and "# Main Deck" headers')
    err.status = 400
    throw err
  }

  const material = await hydrate(sections.material)
  const main = await hydrate(sections.main)

  const materialCostMemoryBuckets = makeBuckets(material, (it) => bucketCost(it.card?.cost_memory))
  const mainCostReserveBuckets = makeBuckets(main, (it) => bucketCost(it.card?.cost_reserve))

  const mainElements = elementBuckets(main)
  const mainTypes = typeBuckets(main)

  const drawWordRegex = /\bdraw\b/i
  const discardWordRegex = /\bdiscard\b/i
  const floatRegex = /floating memory/i

  const drawCards = countEffectMatches(main, drawWordRegex)
  const discardCards = countEffectMatches(main, discardWordRegex)
  const floatingMemoryCards = countEffectMatches(main, floatRegex)

  let totalDrawEstimated = 0
  let totalDiscardEstimated = 0
  const unparsedDrawCards = []
  const unparsedDiscardCards = []

  let drawOnly = 0
  let discardOnly = 0
  let both = 0
  let neither = 0

  for (const it of main) {
    const raw = String(it.card?.effect_raw || '')
    const hasDraw = drawWordRegex.test(raw)
    const hasDiscard = discardWordRegex.test(raw)

    if (hasDraw && hasDiscard) both += it.count
    else if (hasDraw) drawOnly += it.count
    else if (hasDiscard) discardOnly += it.count
    else neither += it.count

    if (hasDraw) {
      const per = estimateDraw(raw)
      if (per === null) unparsedDrawCards.push({ name: it.name, count: it.count, effect_raw: raw })
      else totalDrawEstimated += per * it.count
    }

    if (hasDiscard) {
      const per = estimateDiscard(raw)
      if (per === null) unparsedDiscardCards.push({ name: it.name, count: it.count, effect_raw: raw })
      else totalDiscardEstimated += per * it.count
    }
  }

  const effectClassBuckets = (() => {
    const total = drawOnly + discardOnly + both + neither
    const rows = [
      { key: 'drawOnly', label: '單純 draw', count: drawOnly },
      { key: 'discardOnly', label: '單純 discard', count: discardOnly },
      { key: 'both', label: '抽棄都有', count: both },
      { key: 'neither', label: '抽棄都沒有', count: neither }
    ]
    return rows.map(r => ({ ...r, ratio: total ? r.count / total : 0 }))
  })()

  const drawCardItems = main
    .filter(it => drawWordRegex.test(String(it.card?.effect_raw || '')))
    .map(it => ({ name: it.name, count: it.count, imageUrl: it.imageUrl }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  const discardCardItems = main
    .filter(it => discardWordRegex.test(String(it.card?.effect_raw || '')))
    .map(it => ({ name: it.name, count: it.count, imageUrl: it.imageUrl }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  const floatingItems = main
    .filter(it => floatRegex.test(String(it.card?.effect_raw || '')))
    .map(it => ({ name: it.name, count: it.count, imageUrl: it.imageUrl }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  return {
    material: {
      cards: material.map(x => ({ name: x.name, count: x.count, imageUrl: x.imageUrl })),
      costMemoryBuckets: materialCostMemoryBuckets
    },
    main: {
      cards: main.map(x => ({ name: x.name, count: x.count, imageUrl: x.imageUrl })),
      elementBuckets: mainElements,
      typeBuckets: mainTypes,
      elementDebug: main.map(elementDebugRow),
      costReserveBuckets: mainCostReserveBuckets,
      drawDiscardStats: {
        totalDrawEstimated,
        totalDiscardEstimated,
        unparsedDrawCards,
        unparsedDiscardCards,
        effectClassBuckets
      },
      drawCards: { totalCopies: drawCards.totalCopies, items: drawCardItems },
      discardCards: { totalCopies: discardCards.totalCopies, items: discardCardItems },
      floatingMemoryCards: { totalCopies: floatingMemoryCards.totalCopies, items: floatingItems }
    }
  }
}

export { parseDeck }
