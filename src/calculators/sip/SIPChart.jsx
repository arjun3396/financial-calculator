import React, { useState, useMemo, useRef, useCallback } from 'react'
import { formatCompact, formatRupees } from '../../lib/format'
import { niceCeil, smoothPath, niceXTicks } from '../../lib/chartUtils'

const W = 1000, H = 380
const PAD = { l: 70, r: 24, t: 24, b: 44 }
const INNER_W = W - PAD.l - PAD.r
const INNER_H = H - PAD.t - PAD.b

function Tooltip({ x, y, year, corpus, invested }) {
  const gain = corpus - invested
  const w = 160, h = 70, pad = 10
  let tx = Math.max(4, Math.min(x - w / 2, W - 4 - w))
  let ty = y - h - 14
  if (ty < 4) ty = y + 14
  return (
    <g transform={`translate(${tx} ${ty})`}>
      <rect className="chart-tooltip-bg" width={w} height={h} rx="6" />
      <text className="chart-tooltip-title" x={pad} y={16}>{year === 0 ? 'Today' : 'End of year ' + year}</text>
      <text className="chart-tooltip-value" x={pad} y={34} style={{ fontSize: 12, fill: '#4ade9f' }}>
        {formatRupees(corpus)}
      </text>
      <text className="chart-tooltip-title" x={pad} y={50}>Invested {formatCompact(invested)}</text>
      <text className="chart-tooltip-title" x={pad} y={64} style={{ fill: '#4ade9f' }}>
        Gain {formatCompact(gain)}
      </text>
    </g>
  )
}

export default function SIPChart({ trajectory, goal, years }) {
  const svgRef  = useRef(null)
  const [hoverIdx, setHoverIdx] = useState(null)

  const xScale = (yr)       => PAD.l + (yr / years) * INNER_W
  const yScale = (val, max) => PAD.t + INNER_H - (val / max) * INNER_H

  const maxVal = Math.max(...trajectory.map(p => p.corpus), goal) * 1.1

  const { ticks, tickMax } = useMemo(() => {
    const tickMax = niceCeil(maxVal)
    return { ticks: Array.from({ length: 7 }, (_, i) => i * tickMax / 6), tickMax }
  }, [maxVal])

  const ys = (val) => yScale(val, tickMax)

  // Corpus area (teal gradient, fills from corpus down to invested line)
  const corpusPath = useMemo(() =>
    smoothPath(trajectory.map(p => [xScale(p.year), ys(p.corpus)])),
    [trajectory, tickMax]
  )

  // Gain fill area: top = corpus curve, bottom = invested curve
  const gainAreaPath = useMemo(() => {
    const corpusPts   = trajectory.map(p => [xScale(p.year), ys(p.corpus)])
    const investedPts = trajectory.map(p => [xScale(p.year), ys(p.invested)])
    const top    = smoothPath(corpusPts)
    // Reverse the invested points to close the shape
    const bottom = investedPts.slice().reverse().map((pt, i) =>
      i === 0 ? `L ${pt[0]} ${pt[1]}` : `L ${pt[0]} ${pt[1]}`
    ).join(' ')
    return top + ' ' + bottom + ' Z'
  }, [trajectory, tickMax])

  // Invested line
  const investedPath = useMemo(() =>
    smoothPath(trajectory.map(p => [xScale(p.year), ys(p.invested)])),
    [trajectory, tickMax]
  )

  const xTicks = useMemo(() => niceXTicks(years), [years])

  const handleMove = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const xPx = ((e.clientX - rect.left) / rect.width) * W
    const idx = Math.max(0, Math.min(trajectory.length - 1, Math.round(((xPx - PAD.l) / INNER_W) * years)))
    setHoverIdx(idx)
  }, [trajectory.length, years])

  const hoverPt = hoverIdx != null ? trajectory[hoverIdx] : null

  return (
    <div className="chart-card">
      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 14, fontSize: 12, color: 'var(--text-3)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 20, height: 2, background: 'var(--teal)', display: 'inline-block', borderRadius: 2 }} />
          Corpus value
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 20, height: 2, background: 'var(--text-3)', display: 'inline-block', borderRadius: 2 }} />
          Total invested
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 16, height: 10, background: 'rgba(74,222,159,0.15)', display: 'inline-block', borderRadius: 2 }} />
          Wealth gained
        </span>
        {goal > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, height: 1.5, background: 'var(--amber)', display: 'inline-block', borderRadius: 2 }} />
            Goal
          </span>
        )}
      </div>

      <svg ref={svgRef} className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        onMouseMove={handleMove} onMouseLeave={() => setHoverIdx(null)}>
        <defs>
          <linearGradient id="sip-gain-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#4ade9f" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#4ade9f" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Y grid + labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line className="chart-grid-line" x1={PAD.l} x2={W - PAD.r} y1={ys(t)} y2={ys(t)} />
            <text className="chart-axis-label" x={PAD.l - 10} y={ys(t) + 4} textAnchor="end">{formatCompact(t)}</text>
          </g>
        ))}

        {/* Goal line */}
        {goal > 0 && goal <= tickMax && (
          <line className="chart-target-line" x1={PAD.l} x2={W - PAD.r} y1={ys(goal)} y2={ys(goal)} />
        )}

        {/* Gain fill between corpus and invested */}
        <path d={gainAreaPath} fill="url(#sip-gain-gradient)" />

        {/* Invested line */}
        <path d={investedPath} fill="none" stroke="var(--text-3)" strokeWidth="1.4"
          strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 3" />

        {/* Corpus line */}
        <path className="chart-line" d={corpusPath} />

        {/* X labels */}
        {xTicks.map(yr => (
          <text key={yr} className="chart-axis-label" x={xScale(yr)} y={H - PAD.b + 22} textAnchor="middle">
            {yr === 0 ? 'Now' : 'Yr ' + yr}
          </text>
        ))}

        {/* Hover */}
        {hoverPt && (
          <g>
            <line className="chart-hover-line"
              x1={xScale(hoverPt.year)} x2={xScale(hoverPt.year)} y1={PAD.t} y2={PAD.t + INNER_H} />
            {/* Corpus marker */}
            <circle className="chart-marker-ring" cx={xScale(hoverPt.year)} cy={ys(hoverPt.corpus)} r="9" />
            <circle className="chart-marker"      cx={xScale(hoverPt.year)} cy={ys(hoverPt.corpus)} r="3.5" />
            {/* Invested marker */}
            <circle cx={xScale(hoverPt.year)} cy={ys(hoverPt.invested)} r="3.5"
              fill="var(--text-3)" />
            <Tooltip
              x={xScale(hoverPt.year)} y={ys(hoverPt.corpus)}
              year={hoverPt.year} corpus={hoverPt.corpus} invested={hoverPt.invested} />
          </g>
        )}
      </svg>
    </div>
  )
}
