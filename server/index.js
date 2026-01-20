const express = require('express')
const cors = require('cors')

require('dotenv').config()

const { openDb } = require('../src/db/sqlite')
const { getLatestCardByName, getCardImageUrl } = require('../src/db/cardRepo')
const { getApiVersionInfo } = require('./version')
const { analyzeCore, parseDeck } = require('../src/analyze/core')

process.env.API_STARTED_AT = process.env.API_STARTED_AT || new Date().toISOString()

async function analyze(deckText) {
  const db = openDb({})
  try {
    const hydrate = async (list) =>
      list.map(({ name, count }) => {
        const card = getLatestCardByName(db, name)
        return {
          name,
          count,
          card,
          imageUrl: getCardImageUrl(card)
        }
      })

    return await analyzeCore(deckText, { hydrate })
  } finally {
    db.close()
  }
}

function draw(deckText, n) {
  const { sections, hasMain } = parseDeck(deckText)
  if (!hasMain) {
    const err = new Error('Deck text must include exact "# Main Deck" header')
    err.status = 400
    throw err
  }

  const pool = []
  for (const { name, count } of sections.main) {
    for (let i = 0; i < count; i++) pool.push(name)
  }

  const want = Math.max(1, Math.floor(Number(n) || 1))
  const drawn = []
  const copy = pool.slice()

  for (let i = 0; i < want && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length)
    drawn.push(copy[idx])
    copy.splice(idx, 1) // without replacement
  }

  return { drawn, remaining: copy.length, deckSize: pool.length }
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.get('/api/version', (req, res) => res.json(getApiVersionInfo()))

app.post('/api/analyze', async (req, res) => {
  try {
    res.json(await analyze(req.body?.deckText))
  } catch (e) {
    res.status(e.status || 500).send(e.message || String(e))
  }
})

app.post('/api/draw', (req, res) => {
  try {
    res.json(draw(req.body?.deckText, req.body?.n))
  } catch (e) {
    res.status(e.status || 500).send(e.message || String(e))
  }
})

const port = Number(process.env.API_PORT || process.env.PORT || 3001)
app.listen(port, () => {
  const info = getApiVersionInfo()
  console.log(`API listening on http://localhost:${port}`)
  console.log(`API version: ${info.name}@${info.version}${info.commit ? ` (${info.commit.slice(0, 7)})` : ''}`)
})
