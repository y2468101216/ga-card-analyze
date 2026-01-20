const { sleep } = require('../lib/sleep')
const config = require('../config')

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function parseRetryAfterMs(headers) {
  const v = headers.get('retry-after')
  if (!v) return null
  const seconds = Number(v)
  if (Number.isFinite(seconds)) return seconds * 1000
  const dateMs = Date.parse(v)
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now())
  return null
}

async function requestJson(url, opts = {}) {
  const {
    method = 'GET',
    headers = {},
    timeoutMs = config.requestTimeoutMs,
    retry = config.retry
  } = opts

  let attempt = 0
  let lastErr

  while (attempt <= retry.maxRetries) {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'accept': 'application/json',
          'user-agent': config.userAgent,
          ...headers
        },
        signal: controller.signal
      })

      if (res.ok) {
        return await res.json()
      }

      const retryable = res.status === 429 || (res.status >= 500 && res.status <= 599)
      const bodyText = await res.text().catch(() => '')

      if (!retryable || attempt === retry.maxRetries) {
        const err = new Error(`HTTP ${res.status} ${res.statusText} for ${url}${bodyText ? `: ${bodyText.slice(0, 300)}` : ''}`)
        err.status = res.status
        throw err
      }

      const retryAfterMs = parseRetryAfterMs(res.headers)
      const exp = retry.baseDelayMs * Math.pow(2, attempt)
      const jitter = Math.random() * 250
      const delay = retryAfterMs ?? clamp(exp + jitter, 0, retry.maxDelayMs)
      await sleep(delay)
      attempt++
      continue
    } catch (e) {
      lastErr = e
      const isAbort = e && (e.name === 'AbortError')
      if (attempt === retry.maxRetries) throw lastErr
      // Network error / timeout: small backoff and retry
      const exp = retry.baseDelayMs * Math.pow(2, attempt)
      const jitter = Math.random() * 250
      const delay = clamp(exp + jitter, 0, retry.maxDelayMs)
      if (!isAbort) {
        // fallthrough
      }
      await sleep(delay)
      attempt++
    } finally {
      clearTimeout(t)
    }
  }

  throw lastErr || new Error(`requestJson failed for ${url}`)
}

module.exports = { requestJson }

