const assert = require('assert')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { fetchAllCards } = require('../src/crawl/cards')

describe('fetchAllCards (smoke, mocked)', () => {
  it('writes cards.json', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gatcg-'))

    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        data: [{ slug: 'a' }],
        has_more: false,
        total_pages: 1
      })
    })

    const res = await fetchAllCards({ baseUrl: 'https://api.gatcg.com', outDir: tmp, pageSize: 50 })
    assert.strictEqual(res.data.length, 1)

    const outFile = path.join(tmp, 'cards.json')
    assert.ok(fs.existsSync(outFile))
    const parsed = JSON.parse(fs.readFileSync(outFile, 'utf8'))
    assert.strictEqual(parsed.data.length, 1)
  })
})

