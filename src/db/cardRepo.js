function upsertCards(db, cards) {
  const stmt = db.prepare(`
    INSERT INTO cards(slug, name, json, last_update, created_at, updated_at)
    VALUES (@slug, @name, @json, @last_update, @created_at, @updated_at)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      json = excluded.json,
      last_update = excluded.last_update,
      created_at = COALESCE(excluded.created_at, cards.created_at),
      updated_at = excluded.updated_at
  `)

  const tx = db.transaction((rows) => {
    for (const c of rows) {
      stmt.run({
        slug: c.slug,
        name: c.name || null,
        json: JSON.stringify(c),
        last_update: c.last_update || null,
        created_at: c.created_at || null,
        updated_at: new Date().toISOString()
      })
    }
  })

  tx(cards)
}

function setState(db, key, value) {
  db.prepare('INSERT OR REPLACE INTO sync_state(key, value) VALUES(?, ?)').run(key, String(value))
}

function getState(db, key) {
  const row = db.prepare('SELECT value FROM sync_state WHERE key = ?').get(key)
  return row ? row.value : null
}

function searchCards(db, { q, limit = 20, offset = 0 } = {}) {
  if (!q) {
    return db.prepare('SELECT slug, name, last_update FROM cards ORDER BY name ASC LIMIT ? OFFSET ?').all(limit, offset)
  }

  // Use parameterized LIKE to avoid injection; escape %/_ minimally
  const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`
  return db
    .prepare(
      "SELECT slug, name, last_update FROM cards WHERE name LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\' ORDER BY name ASC LIMIT ? OFFSET ?"
    )
    .all(like, like, limit, offset)
}

function getCardBySlug(db, slug) {
  const row = db.prepare('SELECT json FROM cards WHERE slug = ?').get(slug)
  return row ? JSON.parse(row.json) : null
}

function getLatestCardByName(db, name) {
  const row = db
    .prepare('SELECT json, last_update FROM cards WHERE name = ? ORDER BY last_update DESC LIMIT 1')
    .get(name)
  return row ? JSON.parse(row.json) : null
}

function getCardImageUrl(card, { baseUrl = 'https://api.gatcg.com' } = {}) {
  if (!card) return null

  // Try common fields found in editions payload. Fall back gracefully.
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
    // Already absolute
    if (/^https?:\/\//i.test(candidate)) return candidate

    // API commonly returns relative path like '/cards/images/xxx.jpg'
    if (candidate.startsWith('/')) {
      return new URL(candidate, baseUrl).toString()
    }

    // Or just a filename
    return new URL(`/cards/images/${encodeURIComponent(candidate)}`, baseUrl).toString()
  }

  // Some payloads store images object with filenames.
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

module.exports = {
  upsertCards,
  setState,
  getState,
  searchCards,
  getCardBySlug,
  getLatestCardByName,
  getCardImageUrl
}
