module.exports = {
  baseUrl: process.env.GATCG_BASE_URL || 'https://api.gatcg.com',
  userAgent: process.env.USER_AGENT || 'grandArchiveCalcWeb/1.0 (+local crawler)',
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 30_000),
  retry: {
    maxRetries: Number(process.env.RETRY_MAX || 5),
    baseDelayMs: Number(process.env.RETRY_BASE_DELAY_MS || 500),
    maxDelayMs: Number(process.env.RETRY_MAX_DELAY_MS || 10_000)
  },
  crawl: {
    pageSize: Number(process.env.PAGE_SIZE || 50),
    // Safety cap in case API behavior changes.
    maxPages: Number(process.env.MAX_PAGES || 10_000)
  },
  paths: {
    // Endpoints discovered in openapi.json
    cardsSearch: '/cards/search'
  }
}
