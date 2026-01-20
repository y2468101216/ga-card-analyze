# Grand Archive 牌組分析器（Web）

## 簡介

這是一個給 **Grand Archive** 玩家用的牌組分析工具：把牌組文字貼上來，就能快速看到牌組的比例與分佈（例如曲線、元素比例、抽棄相關統計），並提供簡單的「試抽」功能，幫你在實戰前先感受起手與牌庫節奏。

線上官方/社群網站通常只有牌表展示，卻沒有「分析」：但我一直覺得 **牌組曲線、元素比例** 這些資訊非常關鍵；更別提 **draw / discard**、甚至像 **floating memory** 這種效果，組完牌後如果不能先試抽幾手，總覺得少了很重要的一步。

## 線上使用（GitHub Pages）

網站：

- https://y2468101216.github.io/ga-card-analyze/

使用方式：

1. 把牌組純文字貼到輸入框
2. 確認包含兩個段落標題（必須完全一致，可直接使用 build-v2.silvie.org 匯出 omnidex 格式）：
   - `# Material Deck`
   - `# Main Deck`
3. 每行卡片格式：`數量 空格 卡名`，例如：

```text
# Material Deck
1 Fire Shard

# Main Deck
3 Frostsworn Paladin
2 Fire Shard
```

4. 按下「分析」就會生成各種比例圖表與統計
5. 「試抽」會用 Main Deck 做不放回抽牌（抽完會從牌庫移除），可按「重洗」回到完整牌庫

> 小提示：分析模式預設為 `auto`（優先用前端 WASM SQLite，失敗才會回退呼叫 API）。你也可以在網址加上：
> - `?mode=wasm` 強制用前端 WASM SQLite
> - `?mode=server` 強制走 `/api/analyze`

## 功能清單

### 牌組分析

- Material Deck：
  - cost_memory 曲線分佈（長條圖）
- Main Deck：
  - cost_reserve 曲線分佈（長條圖）
  - 元素（element）分佈（圓餅圖）
  - 類型（types，排除 `UNIQUE`）分佈（圓餅圖）
  - draw / discard 統計：
    - 含 draw 的牌、含 discard 的牌、兩者都有/都沒有的比例
    - 估算可解析的 draw/discard 總量（依照 effect_raw 的簡易規則）
    - 無法解析但包含關鍵字的清單
  - floating memory 統計：
    - 找出 effect_raw 含「floating memory」的牌並統計張數

### 試抽

- 使用 Main Deck 做「不放回」抽牌（抽到的牌會從牌庫移除）
- 可指定抽 N 張，並顯示剩餘牌庫與手牌張數
- 「重洗」會把牌庫恢復成完整 Main Deck

## 本機開發 / 啟動

需求：Node.js（建議 18+ / 20+）

安裝：

```bash
npm install
```

常用指令：

```bash
# 同時啟動 API（http://localhost:3001）+ Web（http://localhost:5173）
npm run dev

# 只啟動 API
npm run api

# 只啟動前端（Vite dev server）
npm run web:dev

# Build 靜態網站（輸出到 dist/，給 GitHub Pages 使用）
npm run web:build

# 跑測試
npm test
```

## 如何更新卡牌資料庫（SQLite）

本專案的卡牌資料存放在 `data/gatcg.sqlite`。

更新方式：

```bash
# 同步卡牌到 SQLite（預設會做 incremental，同步最新變更）
npm run db:sync

# 指定 db 檔案路徑（可選）
node src/cli.js sync --db data/gatcg.sqlite

# 若想要從頭重抓（關閉 incremental）
node src/cli.js sync --incremental false
```

同步狀態查詢：

```bash
npm run db:state
```

---

## Introduction (EN)

This is a web-based deck analyzer for **Grand Archive** players. Paste your deck list text and instantly get useful breakdowns (curve distribution, element ratios, draw/discard-related stats, etc.), plus a simple draw simulator to help you “goldfish” a few hands before playing.

Many online deck pages focus on decklist sharing, but don’t provide analysis. I believe curve and element balance matter a lot—and effects like draw/discard (including things like *floating memory*) make it even more important to test a deck by drawing a few hands after you’ve built it.

## Online Usage (GitHub Pages)

Site:

- https://y2468101216.github.io/ga-card-analyze/

How to use:

1. Paste your deck list text
2. Make sure it contains the exact headers (can use omnidex export from build-v2.silvie.org):
   - `# Material Deck`
   - `# Main Deck`
3. Each card line format: `COUNT <space> CARD_NAME`, e.g.

```text
# Material Deck
1 Fire Shard

# Main Deck
3 Frostsworn Paladin
2 Fire Shard
```

4. Click “Analyze” to generate charts and stats
5. “Draw” simulates drawing without replacement from the Main Deck; “Reshuffle” restores the full deck

Tip: the default analyze mode is `auto` (try WASM SQLite first, fallback to server API). You can force a mode via URL:

- `?mode=wasm`
- `?mode=server`

## Features

### Analysis

- Material Deck:
  - cost_memory curve distribution
- Main Deck:
  - cost_reserve curve distribution
  - element distribution
  - type distribution (excluding `UNIQUE`)
  - draw/discard stats from `effect_raw`:
    - draw-only / discard-only / both / neither
    - estimated total draw/discard counts (simple heuristics)
    - list of “unparsed but matched” cards
  - floating memory stats:
    - cards whose `effect_raw` contains “floating memory”

### Draw Simulator

- Draw without replacement from the Main Deck
- Draw N cards and show remaining deck size / hand size
- Reshuffle restores the full Main Deck

## Local Development

Requirements: Node.js (18+ / 20+ recommended)

Install:

```bash
npm install
```

Commands:

```bash
# Start both API (http://localhost:3001) and Web (http://localhost:5173)
npm run dev

# API only
npm run api

# Web only (Vite dev server)
npm run web:dev

# Build for GitHub Pages (outputs dist/)
npm run web:build

# Tests
npm test
```

## Updating the Card Database (SQLite)

The card database is stored in `data/gatcg.sqlite`.

Update:

```bash
# Sync cards into SQLite (incremental by default)
npm run db:sync

# Optional: choose db path
node src/cli.js sync --db data/gatcg.sqlite

# Full resync (disable incremental)
node src/cli.js sync --incremental false
```

Check sync state:

```bash
npm run db:state
```
