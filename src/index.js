const { fetchAllCards } = require('./crawl/cards')

async function main() {
  const outDir = process.env.OUT_DIR
  await fetchAllCards({ outDir })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

