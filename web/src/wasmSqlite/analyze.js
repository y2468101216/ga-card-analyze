import { analyzeCore } from '../../../src/analyze/core.mjs'
import { getLatestCardByNameWasm, getCardImageUrl } from './cardRepo'

export async function analyzeDeckWasm(deckText, wasmOpts) {
  const hydrate = async (list) => {
    const out = []
    for (const { name, count } of list) {
      const card = await getLatestCardByNameWasm(name, wasmOpts)
      out.push({ name, count, card, imageUrl: getCardImageUrl(card) })
    }
    return out
  }

  return analyzeCore(deckText, { hydrate })
}
