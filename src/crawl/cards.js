const path = require('path')
const config = require('../config')
const { requestJson } = require('../api/http')
const { writeJsonAtomic, ensureDir } = require('../storage/jsonStore')

function buildUrl(baseUrl, p, params) {
  const u = new URL(p, baseUrl)
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null) continue
    if (Array.isArray(v)) {
      // OpenAPI says arrays for some fields; encode as repeated query params
      for (const item of v) u.searchParams.append(k, String(item))
    } else {
      u.searchParams.set(k, String(v))
    }
  }
  return u.toString()
}

async function fetchAllCards({
  baseUrl = config.baseUrl,
  pageSize = config.crawl.pageSize,
  maxPages = config.crawl.maxPages,
  separateEditions = true,
  outDir = path.resolve(process.cwd(), 'data')
} = {}) {
  ensureDir(outDir)

  let page = 1
  let all = []

  while (page <= maxPages) {
    const url = buildUrl(baseUrl, config.paths.cardsSearch, {
      page,
      page_size: pageSize,
      separate_editions: separateEditions
    })

    const payload = await requestJson(url)
    const data = payload?.data
    if (!Array.isArray(data)) {
      throw new Error(`Unexpected /cards/search payload shape on page ${page}`)
    }

    all.push(...data)

    const hasMore = Boolean(payload?.has_more)
    const totalPages = Number(payload?.total_pages)

    process.stdout.write(`Fetched page ${page}${Number.isFinite(totalPages) ? `/${totalPages}` : ''} (+${data.length})\n`)

    if (!hasMore) break
    page++
  }

  const meta = {
    fetchedAt: new Date().toISOString(),
    pageSize,
    total: all.length
  }

  writeJsonAtomic(path.join(outDir, 'cards.json'), { meta, data: all })
  return { meta, data: all }
}

module.exports = { fetchAllCards }

