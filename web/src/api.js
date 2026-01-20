export async function analyzeDeck(deckText) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deckText })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function fetchApiVersion() {
  const res = await fetch('/api/version')
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
