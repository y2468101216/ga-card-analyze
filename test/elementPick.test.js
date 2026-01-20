const assert = require('assert')

// Mirror the server's pickElementForChart behavior by requiring server/testExports (kept separate)
const { pickElementForChartForTest } = require('../server/testExports')

describe('element picking', () => {
  it('uses first non-EXALTED element (Title Case)', () => {
    assert.strictEqual(pickElementForChartForTest({ elements: ['EXALTED', 'FIRE'] }), 'Fire')
  })

  it('falls back to Norm if only EXALTED', () => {
    assert.strictEqual(pickElementForChartForTest({ elements: ['EXALTED'] }), 'Norm')
  })

  it('Cheshire Cat case: [EXALTED, NORM] -> Norm', () => {
    assert.strictEqual(pickElementForChartForTest({ elements: ['EXALTED', 'NORM'] }), 'Norm')
  })
})
