import { getWasmDb } from './sqliteDb'

function rowToJson(row) {
  if (!row) return null
  const json = row[0]
  if (!json) return null
  return JSON.parse(json)
}

export async function getLatestCardByNameWasm(name, opts) {
  const db = await getWasmDb(opts)
  const stmt = db.prepare('SELECT json FROM cards WHERE name = ? ORDER BY last_update DESC LIMIT 1')
  try {
    stmt.bind([name])
    if (!stmt.step()) return null
    const row = stmt.get()
    return rowToJson(row)
  } finally {
    stmt.free()
  }
}

export function getCardImageUrl(card, { baseUrl = 'https://api.gatcg.com' } = {}) {
  if (!card) return null

  const edition = Array.isArray(card.editions) && card.editions.length ? card.editions[card.editions.length - 1] : null

  const candidate =
    edition?.image ||
    edition?.image_url ||
    edition?.imageUrl ||
    edition?.card_image ||
    edition?.card_image_url ||
    edition?.front_image ||
    edition?.front_image_url ||
    null

  if (typeof candidate === 'string' && candidate.length) {
    if (/^https?:\/\//i.test(candidate)) return candidate
    if (candidate.startsWith('/')) return new URL(candidate, baseUrl).toString()
    return new URL(`/cards/images/${encodeURIComponent(candidate)}`, baseUrl).toString()
  }

  const images = edition?.images
  if (images && typeof images === 'object') {
    const values = Object.values(images).filter(v => typeof v === 'string' && v.length)
    if (values.length) {
      const v = values[0]
      if (/^https?:\/\//i.test(v)) return v
      if (v.startsWith('/')) return new URL(v, baseUrl).toString()
      return new URL(`/cards/images/${encodeURIComponent(v)}`, baseUrl).toString()
    }
  }

  return null
}
