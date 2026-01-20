const assert = require('assert')
const { requestJson } = require('../src/api/http')

describe('requestJson', () => {
  it('retries on 429 then succeeds', async () => {
    let calls = 0
    global.fetch = async () => {
      calls++
      if (calls === 1) {
        return {
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Map([['retry-after', '0']]),
          text: async () => 'rate limited'
        }
      }
      return {
        ok: true,
        json: async () => ({ ok: true })
      }
    }

    // Patch headers.get for our Map
    const origFetch = global.fetch
    global.fetch = async (...args) => {
      const res = await origFetch(...args)
      if (res.headers instanceof Map) {
        res.headers = { get: (k) => res.headers.get(k) }
      }
      return res
    }

    const j = await requestJson('https://example.test', { retry: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5 }, timeoutMs: 1000 })
    assert.deepStrictEqual(j, { ok: true })
    assert.strictEqual(calls, 2)
  })
})

