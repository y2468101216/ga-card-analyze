const assert = require('assert')

const { typeBucketsForTest } = require('../server/testExports')

describe('typeBuckets', () => {
  it('excludes UNIQUE (case-insensitive) and counts remaining types per copy', () => {
    const items = [
      { count: 2, card: { types: ['Spell', 'UNIQUE'] } },
      { count: 1, card: { types: ['Ally', 'unique'] } },
      { count: 3, card: { types: ['SPELL'] } },
      { count: 5, card: { types: [] } },
      { count: 4, card: {} }
    ]

    const out = typeBucketsForTest(items)

    const spell = out.find(x => x.type === 'Spell')
    const ally = out.find(x => x.type === 'Ally')
    const unique = out.find(x => String(x.type).toUpperCase() === 'UNIQUE')

    assert.ok(spell)
    assert.ok(ally)
    assert.strictEqual(unique, undefined)

    // Spell: (2 copies from first item) + (3 copies from third item) = 5
    assert.strictEqual(spell.count, 5)
    // Ally: 1 copy
    assert.strictEqual(ally.count, 1)

    // total counted copies = 2 (Spell) + 1 (Ally) + 3 (Spell) = 6
    assert.ok(Math.abs(spell.ratio - 5 / 6) < 1e-9)
    assert.ok(Math.abs(ally.ratio - 1 / 6) < 1e-9)
  })
})
