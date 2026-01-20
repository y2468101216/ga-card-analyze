const assert = require('assert')

const { parseDeckForTest, bucketCostForTest } = require('../server/testExports')

describe('deck parsing rules', () => {
  it('requires exact headers and ignores other sections', () => {
    const text = `# Material Deck\n1 A\n# Other\n1 B\n# Main Deck\n2 C\n# Sideboard\n1 D\n`
    const { sections, hasMaterial, hasMain } = parseDeckForTest(text)
    assert.strictEqual(hasMaterial, true)
    assert.strictEqual(hasMain, true)
    assert.deepStrictEqual(sections.material, [{ name: 'A', count: 1 }])
    assert.deepStrictEqual(sections.main, [{ name: 'C', count: 2 }])
    assert.deepStrictEqual(sections.sideboard, [{ name: 'D', count: 1 }])
  })

  it('buckets -1 as X', () => {
    assert.strictEqual(bucketCostForTest(-1), 'X')
  })
})

