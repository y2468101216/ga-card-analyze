const { syncCardsToSqlite } = require('./crawl/syncCardsToSqlite')
const { openDb } = require('./db/sqlite')
const { searchCards, getCardBySlug, getState } = require('./db/cardRepo')

function parseArgs(argv) {
  const args = argv.slice(2)
  const cmd = args[0]
  const flags = {}
  const rest = []

  for (let i = 1; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = args[i + 1]
      if (!next || next.startsWith('--')) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      rest.push(a)
    }
  }

  return { cmd, flags, rest }
}

async function main() {
  const { cmd, flags, rest } = parseArgs(process.argv)
  const dbPath = flags.db

  if (cmd === 'sync') {
    const incremental = flags.incremental !== 'false'
    await syncCardsToSqlite({
      dbPath,
      incremental,
      pageSize: flags.page_size ? Number(flags.page_size) : undefined
    })
    return
  }

  if (cmd === 'search') {
    const q = rest.join(' ')
    const limit = flags.limit ? Number(flags.limit) : 20
    const offset = flags.offset ? Number(flags.offset) : 0
    const db = openDb({ dbPath })
    const rows = searchCards(db, { q, limit, offset })
    console.log(JSON.stringify(rows, null, 2))
    db.close()
    return
  }

  if (cmd === 'get') {
    const slug = rest[0]
    if (!slug) throw new Error('Usage: get <slug>')
    const db = openDb({ dbPath })
    const card = getCardBySlug(db, slug)
    console.log(JSON.stringify(card, null, 2))
    db.close()
    return
  }

  if (cmd === 'state') {
    const db = openDb({ dbPath })
    const keys = ['cards_last_update', 'cards_last_sync_started_at', 'cards_last_sync_finished_at', 'cards_last_sync_count']
    const out = {}
    for (const k of keys) out[k] = getState(db, k)
    console.log(JSON.stringify(out, null, 2))
    db.close()
    return
  }

  console.log(`Usage:
  node src/cli.js sync [--db data/gatcg.sqlite] [--incremental false] [--page_size 50]
  node src/cli.js search <text> [--db ...] [--limit 20] [--offset 0]
  node src/cli.js get <slug> [--db ...]
  node src/cli.js state [--db ...]
`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

