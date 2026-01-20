import React, { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LabelList } from 'recharts'
import { analyzeDeck, fetchApiVersion } from './api'
import { SAMPLE } from './deckSample'

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

function fmtPct(n) {
  if (!Number.isFinite(n)) return ''
  return `${(n * 100).toFixed(1)}%`
}

function bucketTooltipFormatter(value, name, props) {
  const ratio = props?.payload?.ratio
  if (name === 'count') return [`${value} (${fmtPct(ratio)})`, 'count']
  return [value, name]
}

function ChartCard({ title, children, className = '', bodyClassName = '' }) {
  return (
    <div className={`panel card ${className}`.trim()}>
      <h2>{title}</h2>
      <div className={bodyClassName}>
        {children}
      </div>
    </div>
  )
}

function CardGrid({ items, max = 30, showName = true, minColWidth = 92, hoverWidth = 320, onHover }) {
  if (!items?.length) return <div className="small">（無）</div>

  function handleEnter(e, x) {
    if (!x?.imageUrl || !onHover) return
    const rect = e.currentTarget.getBoundingClientRect()
    onHover({
      type: 'show',
      src: x.imageUrl,
      alt: x.name,
      anchorRect: rect,
      width: hoverWidth
    })
  }

  function handleMove(e, x) {
    if (!x?.imageUrl || !onHover) return
    const rect = e.currentTarget.getBoundingClientRect()
    onHover({
      type: 'move',
      src: x.imageUrl,
      alt: x.name,
      anchorRect: rect,
      width: hoverWidth
    })
  }

  function handleLeave() {
    onHover?.({ type: 'hide' })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minColWidth}px, 1fr))`, gap: 8 }}>
      {items.slice(0, max).map((x, idx) => (
        <div key={`${x.name}-${idx}`} style={{ textAlign: 'center' }}>
          {x.imageUrl ? (
            <div
              className="cardImgWrap"
              onMouseEnter={(e) => handleEnter(e, x)}
              onMouseMove={(e) => handleMove(e, x)}
              onMouseLeave={handleLeave}
            >
              <img src={x.imageUrl} alt={x.name} title={x.name} className="cardImg" loading="lazy" />
            </div>
          ) : (
            <div className="small">{x.name}</div>
          )}
          {showName && (
            <div className="small">
              {x.count ? `${x.count}× ` : ''}
              {x.name}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function HoverPreview({ state }) {
  if (!state?.visible || !state?.src) return null

  const { src, alt, x, y, w, h } = state
  const style = {
    position: 'fixed',
    left: x,
    top: y,
    width: w,
    height: h,
    zIndex: 99999,
    pointerEvents: 'none'
  }

  return (
    <div style={style} className="cardHoverOverlay">
      <img src={src} alt={alt || ''} className="cardHoverOverlayImg" />
    </div>
  )
}

function buildDeckPool(mainCards) {
  // Expand into single-card entries for random draw without replacement.
  const pool = []
  for (const c of mainCards || []) {
    const n = Number(c.count || 0)
    for (let i = 0; i < n; i++) {
      pool.push({ name: c.name, imageUrl: c.imageUrl || null })
    }
  }
  return pool
}

function drawFromPool(pool, n) {
  const copy = pool.slice()
  const drawn = []
  const want = Math.max(1, Math.floor(Number(n) || 1))

  for (let i = 0; i < want && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length)
    drawn.push(copy[idx])
    copy.splice(idx, 1)
  }

  return { drawn, remaining: copy }
}

export default function App() {
  const [deckText, setDeckText] = useState(SAMPLE)
  const [analysis, setAnalysis] = useState(null)
  const [err, setErr] = useState('')
  const [drawN, setDrawN] = useState(7)

  const [apiVersion, setApiVersion] = useState(null)

  useEffect(() => {
    let mounted = true
    fetchApiVersion()
      .then(v => { if (mounted) setApiVersion(v) })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  // Frontend-only draw simulation state
  const [deckPool, setDeckPool] = useState([])
  const [hand, setHand] = useState([])

  const [hoverPreview, setHoverPreview] = useState({ visible: false })

  const canAnalyze = useMemo(() => deckText.includes('# Material Deck') && deckText.includes('# Main Deck'), [deckText])

  async function onAnalyze() {
    setErr('')
    try {
      const data = await analyzeDeck(deckText)
      setAnalysis(data)

      // reset draw simulation to match new deck
      const pool = buildDeckPool(data?.main?.cards || [])
      setDeckPool(pool)
      setHand([])
    } catch (e) {
      setErr(String(e?.message || e))
    }
  }

  function onDraw(n) {
    setErr('')
    if (!analysis) {
      setErr('請先按「分析」以載入 Main Deck 資料')
      return
    }

    const { drawn, remaining } = drawFromPool(deckPool, n)
    setDeckPool(remaining)
    setHand(prev => [...prev, ...drawn])
  }

  function onReshuffle() {
    if (!analysis) {
      setHand([])
      setDeckPool([])
      return
    }
    // Put hand back into deck and reshuffle.
    const full = buildDeckPool(analysis?.main?.cards || [])
    setHand([])
    setDeckPool(full)
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n))
  }

  function computeOverlayPos(anchorRect, width, aspect = 1.4) {
    const padding = 12
    const w = Math.max(180, Math.floor(Number(width) || 320))
    const h = Math.floor(w * aspect)

    const vw = window.innerWidth
    const vh = window.innerHeight

    // Prefer to the right of the thumbnail; flip to left if needed.
    const gap = 12
    let x = anchorRect.right + gap
    if (x + w + padding > vw) x = anchorRect.left - gap - w

    // Vertical: try align top with thumbnail; clamp to viewport.
    let y = anchorRect.top

    x = clamp(x, padding, Math.max(padding, vw - w - padding))
    y = clamp(y, padding, Math.max(padding, vh - h - padding))

    return { x, y, w, h }
  }

  function onCardHover(evt) {
    if (!evt || evt.type === 'hide') {
      setHoverPreview(prev => ({ ...prev, visible: false }))
      return
    }

    const { src, alt, anchorRect, width } = evt
    if (!src || !anchorRect) return

    const { x, y, w, h } = computeOverlayPos(anchorRect, width)
    setHoverPreview({ visible: true, src, alt, x, y, w, h })
  }

  return (
    <>
      <div className="container">
        <div className="panel">
          <h2>卡表(純文字)</h2>
          <textarea value={deckText} onChange={e => setDeckText(e.target.value)} />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="primary" disabled={!canAnalyze} onClick={onAnalyze}>分析</button>
            {!canAnalyze && <span className="small bad">必須包含 # Material Deck 與 # Main Deck</span>}
          </div>

          <div style={{ marginTop: 16 }}>
            <h2>試抽</h2>
            <div className="row">
              <button onClick={() => onDraw(1)}>固定抽 1 張</button>
              <input type="number" min={1} value={drawN} onChange={e => setDrawN(Number(e.target.value))} />
              <button onClick={() => onDraw(drawN)}>抽 N 張</button>
              <button onClick={onReshuffle}>重洗</button>
            </div>
            <div className="small" style={{ marginTop: 8 }}>
              目前在前端用 Main Deck 做「不放回抽牌」。剩餘牌庫：{deckPool.length}，手牌：{hand.length}
            </div>

            <div className="panel" style={{ marginTop: 8 }}>
              {hand.length ? (
                <CardGrid items={hand} max={60} showName minColWidth={92} hoverWidth={320} onHover={onCardHover} />
              ) : (
                <div className="small">（手牌會顯示在這裡）</div>
              )}
            </div>
          </div>

          {err && <div className="small bad" style={{ marginTop: 12 }}>{err}</div>}
        </div>

        <div>
          {/* Top charts: force 2x2 by keeping only 4 cards in this grid */}
          <div className="grid2">
            <ChartCard bodyClassName="chartBody" title="Material Deck 長條圖 (cost_memory) – count + %">
              {analysis ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.material.costMemoryBuckets} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]} />
                    <Tooltip formatter={bucketTooltipFormatter} />
                    <Legend />
                    <Bar dataKey="count" fill="#2563eb" name="count">
                      <LabelList dataKey="count" position="top" offset={6} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="small">尚未分析</div>
              )}
            </ChartCard>

            <ChartCard bodyClassName="chartBody" title="Main Deck 圓餅圖 (element) – count + %">
              {analysis ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analysis.main.elementBuckets}
                      dataKey="count"
                      nameKey="element"
                      label={(d) => `${d.element} ${d.count} (${fmtPct(d.ratio)})`}
                    >
                      {analysis.main.elementBuckets.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, _, p) => [`${v} (${fmtPct(p.payload.ratio)})`, p.payload.element]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="small">尚未分析</div>
              )}
            </ChartCard>

            <ChartCard bodyClassName="chartBody" title="Main Deck 圓餅圖 (types，UNIQUE 不計) – count + %">
              {analysis ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analysis.main.typeBuckets}
                      dataKey="count"
                      nameKey="type"
                      label={(d) => `${d.type} ${d.count} (${fmtPct(d.ratio)})`}
                    >
                      {analysis.main.typeBuckets.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, _, p) => [`${v} (${fmtPct(p.payload.ratio)})`, p.payload.type]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="small">尚未分析</div>
              )}
            </ChartCard>

            <ChartCard bodyClassName="chartBody" title="Main Deck 長條圖 (cost_reserve) – count + %">
              {analysis ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.main.costReserveBuckets} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]} />
                    <Tooltip formatter={bucketTooltipFormatter} />
                    <Legend />
                    <Bar dataKey="count" fill="#16a34a" name="count">
                      <LabelList dataKey="count" position="top" offset={6} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="small">尚未分析</div>
              )}
            </ChartCard>
          </div>

          {/* Additional analysis: keep below in its own grid */}
          <div className="grid2" style={{ marginTop: 16 }}>
            <ChartCard bodyClassName="chartBody" title="Main Deck 抽棄分佈 – 估算抽棄牌量 (effect_raw)">
              {analysis ? (
                <div className="chartStack">
                  <div className="chartFill">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analysis.main.drawDiscardStats.effectClassBuckets}
                          dataKey="count"
                          nameKey="label"
                          label={(d) => `${d.label} ${d.count} (${fmtPct(d.ratio)})`}
                        >
                          {analysis.main.drawDiscardStats.effectClassBuckets.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, _, p) => [`${v} (${fmtPct(p.payload.ratio)})`, p.payload.label]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="small" style={{ marginTop: 6 }}>
                    估算可解析的 draw 總量：<b>{analysis.main.drawDiscardStats.totalDrawEstimated}</b>，discard 總量：<b>{analysis.main.drawDiscardStats.totalDiscardEstimated}</b>
                  </div>
                  <div className="small">
                    無法解析但包含 draw 的牌：<b>{analysis.main.drawDiscardStats.unparsedDrawCards.length}</b>，包含 discard 的牌：<b>{analysis.main.drawDiscardStats.unparsedDiscardCards.length}</b>
                  </div>
                </div>
              ) : (
                <div className="small">尚未分析</div>
              )}
            </ChartCard>

            <ChartCard className="analysis" title="Main Deck draw card – 含 draw 的牌 (圖片)">
              {analysis ? (
                <div>
                  <div className="small">共 {analysis.main.drawCards.items.length} 種牌 / {analysis.main.drawCards.totalCopies} 張</div>
                  <CardGrid items={analysis.main.drawCards.items} minColWidth={92} hoverWidth={360} onHover={onCardHover} />
                </div>
              ) : (
                <div className="small">尚未分析</div>
              )}
            </ChartCard>

            <ChartCard className="analysis" title="Main Deck discard card – 含 discard 的牌 (圖片)">
              {analysis ? (
                <div>
                  <div className="small">共 {analysis.main.discardCards.items.length} 種牌 / {analysis.main.discardCards.totalCopies} 張</div>
                  <CardGrid items={analysis.main.discardCards.items} minColWidth={92} hoverWidth={360} onHover={onCardHover} />
                </div>
              ) : (
                <div className="small">尚未分析</div>
              )}
            </ChartCard>

            <ChartCard className="analysis" title="Main Deck floating memory – 含 floating memory 的牌 (圖片)">
              {analysis ? (
                <div>
                  <div className="small">共 {analysis.main.floatingMemoryCards.items.length} 種牌 / {analysis.main.floatingMemoryCards.totalCopies} 張</div>
                  <CardGrid items={analysis.main.floatingMemoryCards.items} minColWidth={92} hoverWidth={360} onHover={onCardHover} />
                </div>
              ) : (
                <div className="small">尚未分析</div>
              )}
            </ChartCard>
          </div>
        </div>
      </div>

      <HoverPreview state={hoverPreview} />

      <div className="versionFooter">
        {apiVersion ? (
          <span>
            Web {apiVersion.name}@{apiVersion.version}
            {apiVersion.commit ? ` (${String(apiVersion.commit).slice(0, 7)})` : ''}
          </span>
        ) : (
          <span>Web (unknown)</span>
        )}
      </div>
    </>
  )
}
