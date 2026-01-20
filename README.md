# grandArchiveCalcWeb – Local card DB crawler

This repo provides a small Node.js crawler that syncs card data from the **Grand Archive API** into a local **SQLite** database (plus an optional JSON snapshot crawler).

## What it does
- Uses `GET https://api.gatcg.com/cards/search` with pagination (`page`, `page_size`)
- **SQLite mode (recommended):** upserts cards into `data/gatcg.sqlite`
- **Incremental updates:** stores `cards_last_update` cursor and only fetches cards updated after that date

## Ports (.env)
This project runs two local servers in development:
- Frontend (Vite): `VITE_PORT`
- Backend API (Express): `API_PORT`

Vite proxies `/api/*` to the backend automatically. If you change `API_PORT`, **you do not need to change any API URL in the frontend**—just update `.env`.

See `example.env` for the template.

## Dev
```bash
npm run dev
```
This uses `run.js` to load `.env` once and start both the API (nodemon) and the web server (vite) with consistent ports.


## Quick start (SQLite)
```bash
npm install
npm run db:sync
npm run dev
```

Then open the frontend:
- `http://localhost:${VITE_PORT}` (use the value from your `.env`)

Then query (CLI):
```bash
npm run db:search -- "Apotheosis"
npm run db:get -- apotheosis-rite
npm run db:state
```

## JSON snapshot (optional)
```bash
npm run crawl:cards
```
Output:
- `./data/cards.json`

## Incremental sync details
- On the first `db:sync`, the crawler downloads all pages and records the maximum `last_update` it saw.
- On subsequent `db:sync`, it calls `/cards/search?last_update=YYYY-MM-DD` to only fetch updated cards.

## Env vars
- `OUT_DIR` – JSON output folder (default: `./data`)
- `PAGE_SIZE` – page size (default: 50, API max is 50)
- `MAX_PAGES` – safety limit (default: 10000)

## CLI options (advanced)
- Use a custom db file:
  - `node src/cli.js sync --db ./data/my.sqlite`
- Force a full resync:
  - `node src/cli.js sync --incremental false`
