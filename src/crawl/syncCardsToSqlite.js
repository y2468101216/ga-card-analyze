const config = require('../config')
const { requestJson } = require('../api/http')
const { openDb } = require('../db/sqlite')
const { upsertCards, getState, setState } = require('../db/cardRepo')

function buildUrl(baseUrl, p, params) {
  const u = new URL(p, baseUrl)
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) {
      for (const item of v) u.searchParams.append(k, String(item))
    } else {
      u.searchParams.set(k, String(v))
    }
  }
  return u.toString()
}

function maxIso(a, b) {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

async function syncCardsToSqlite({
  dbPath,
  baseUrl = config.baseUrl,
  pageSize = config.crawl.pageSize,
  maxPages = config.crawl.maxPages,
  separateEditions = true,
  incremental = true
} = {}) {
  const db = openDb({ dbPath })

  // Incremental cursor stored as ISO. API param expects date, but appears to accept ISO too.
  // To be safe, send YYYY-MM-DD derived from last sync.
  const lastSyncIso = incremental ? getState(db, 'cards_last_update') : null
  const lastSyncDate = lastSyncIso ? lastSyncIso.slice(0, 10) : null

  const startedAt = new Date().toISOString()
  let page = 1
  let totalUpserted = 0
  let highWatermarkIso = lastSyncIso

  while (page <= maxPages) {
    const url = buildUrl(baseUrl, config.paths.cardsSearch, {
      page,
      page_size: pageSize,
      separate_editions: separateEditions,
      ...(lastSyncDate ? { last_update: lastSyncDate } : {})
    })

    const payload = await requestJson(url)
    const data = payload?.data
    if (!Array.isArray(data)) {
      throw new Error(`Unexpected /cards/search payload shape on page ${page}`)
    }

    if (data.length) {
      upsertCards(db, data)
      totalUpserted += data.length
      for (const c of data) {
        if (c && typeof c.last_update === 'string') {
          highWatermarkIso = maxIso(highWatermarkIso, c.last_update)
        }
      }
    }

    const hasMore = Boolean(payload?.has_more)
    const totalPages = Number(payload?.total_pages)
    process.stdout.write(
      `Synced page ${page}${Number.isFinite(totalPages) ? `/${totalPages}` : ''} (+${data.length})\n`
    )

    if (!hasMore) break
    page++
  }

  if (incremental && highWatermarkIso) {
    // Store the max last_update we saw as the new cursor.
    setState(db, 'cards_last_update', highWatermarkIso)
  }

  setState(db, 'cards_last_sync_started_at', startedAt)
  setState(db, 'cards_last_sync_finished_at', new Date().toISOString())
  setState(db, 'cards_last_sync_count', totalUpserted)

  db.close()

  return {
    incremental,
    lastSyncIso,
    highWatermarkIso,
    totalUpserted
  }
}

module.exports = { syncCardsToSqlite }

