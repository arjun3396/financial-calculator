import React, { useState, useMemo, useRef, useCallback } from 'react'
import { formatCompact, formatRupees } from '../lib/format'

const W = 1000, H = 380
const PAD = { l: 70, r: 24, t: 24, b: 44 }
const INNER_W = W - PAD.l - PAD.r
const INNER_H = H - PAD.t - PAD.b

function niceCeil(n) {
  if (n <= 0) return 1
  const exp = Math.floor(Math.log10(n))
  const f = n / Math.pow(10, exp)
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 3 ? 3 : f <= 5 ? 5 : f <= 6 ? 6 : 10
  return nf * Math.pow(10, exp)
}

function smoothPath(pts) {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2
    const t = 0.18
    d += ` C ${p1[0] + (p2[0] - p0[0]) * t} ${p1[1] + (p2[1] - p0[1]) * t},`
      + ` ${p2[0] - (p3[0] - p1[0]) * t} ${p2[1] - (p3[1] - p1[1]) * t},`
      + ` ${p2[0]} ${p2[1]}`
  }
  return d
}

function Tooltip({ x, y, year, corpus }) {
  const w = 130, h = 48, pad = 8
  let tx = Math.max(4, Math.min(x - w / 2, W - 4 - w))
  let ty = y - h - 14
  if (ty < 4) ty = y + 14
  return (
    <g transform={`translate(${tx} ${ty})`}>
      <rect className="chart-tooltip-bg" width={w} height={h} rx="6" />
      <text className="chart-tooltip-title" x={pad} y={16}>{year === 0 ? 'Today' : 'End of year ' + year}</text>
      <text className="chart-tooltip-value" x={pad} y={36}>{formatRupees(corpus)}</text>
    </g>
  )
}

export default function TrajectoryChart({ trajectory, target, years }) {
  const svgRef = useRef(null)
  const [hoverIdx, setHoverIdx] = useState(null)

  const xScale = (yr)  => PAD.l + (yr / years) * INNER_W
  const yScale = (val, max) => PAD.t + INNER_H - (val / max) * INNER_H

  const maxCorpus = Math.max(...trajectory.map(p => p.corpus), target) * 1.1

  const { ticks, tickMax } = useMemo(() => {
    const tickMax = niceCeil(maxCorpus)
    const step = tickMax / 6
    return { ticks: Array.from({ length: 7 }, (_, i) => i * step), tickMax }
  }, [maxCorpus])

  const ys = (val) => yScale(val, tickMax)

  const linePath = useMemo(() =>
    smoothPath(trajectory.map(p => [xScale(p.year), ys(p.corpus)])),
    [trajectory, tickMax]
  )

  const areaPath = useMemo(() => {
    const pts = trajectory.map(p => [xScale(p.year), ys(p.corpus)])
    return smoothPath(pts) + ` L ${xScale(years)} ${PAD.t + INNER_H} L ${PAD.l} ${PAD.t + INNER_H} Z`
  }, [trajectory, tickMax])

  const xTicks = useMemo(() => {
    const rawStep = years / 6
    const step = [1, 2, 5, 10, 20, 25, 50].find(s => s >= rawStep) || rawStep
    const tks = []
    for (let y = 0; y < years; y += step) tks.push(Math.round(y))
    tks.push(years)
    return tks
  }, [years])

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
      <svg ref={svgRef} className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        onMouseMove={handleMove} onMouseLeave={() => setHoverIdx(null)}>
        <defs>
          <linearGradient id="area-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#4ade9f" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#4ade9f" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line className="chart-grid-line" x1={PAD.l} x2={W - PAD.r} y1={ys(t)} y2={ys(t)} />
            <text className="chart-axis-label" x={PAD.l - 10} y={ys(t) + 4} textAnchor="end">{formatCompact(t)}</text>
          </g>
        ))}

        {target > 0 && target <= tickMax && (
          <line className="chart-target-line" x1={PAD.l} x2={W - PAD.r} y1={ys(target)} y2={ys(target)} />
        )}

        <path className="chart-area" d={areaPath} />
        <path className="chart-line" d={linePath} />

        {xTicks.map(yr => (
          <text key={yr} className="chart-axis-label" x={xScale(yr)} y={H - PAD.b + 22} textAnchor="middle">
            {yr === 0 ? 'Now' : 'Yr ' + yr}
          </text>
        ))}

        {hoverPt && (
          <g>
            <line className="chart-hover-line" x1={xScale(hoverPt.year)} x2={xScale(hoverPt.year)} y1={PAD.t} y2={PAD.t + INNER_H} />
            <circle className="chart-marker-ring" cx={xScale(hoverPt.year)} cy={ys(hoverPt.corpus)} r="9" />
            <circle className="chart-marker"      cx={xScale(hoverPt.year)} cy={ys(hoverPt.corpus)} r="3.5" />
            <Tooltip x={xScale(hoverPt.year)} y={ys(hoverPt.corpus)} year={hoverPt.year} corpus={hoverPt.corpus} />
          </g>
        )}
      </svg>
    </div>
  )
}
