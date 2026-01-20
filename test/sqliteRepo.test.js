const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { openDb } = require('../src/db/sqlite')
const { upsertCards, getCardBySlug, searchCards, getState, setState } = require('../src/db/cardRepo')

describe('sqlite repo', () => {
  it('upserts and queries', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatcg-db-'))
    const dbPath = path.join(dir, 't.sqlite')
    const db = openDb({ dbPath })

    upsertCards(db, [
      { slug: 'a', name: 'Alpha', last_update: '2025-01-01T00:00:00.000Z' },
      { slug: 'b', name: 'Beta', last_update: '2025-01-02T00:00:00.000Z' }
    ])

    const hit = getCardBySlug(db, 'a')
    assert.strictEqual(hit.slug, 'a')
    assert.strictEqual(hit.name, 'Alpha')

    const rows = searchCards(db, { q: 'Al', limit: 10 })
    assert.strictEqual(rows.length, 1)
    assert.strictEqual(rows[0].slug, 'a')

    setState(db, 'cards_last_update', '2025-01-02T00:00:00.000Z')
    assert.strictEqual(getState(db, 'cards_last_update'), '2025-01-02T00:00:00.000Z')

    db.close()
  })
})

