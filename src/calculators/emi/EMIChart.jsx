import React, { useState, useMemo, useRef, useCallback } from 'react'
import { formatCompact, formatRupees } from '../../lib/format'
import { niceCeil, smoothPath } from '../../lib/chartUtils'

const W = 1000, H = 380
const PAD = { l: 76, r: 32, t: 24, b: 44 }
const INNER_W = W - PAD.l - PAD.r
const INNER_H = H - PAD.t - PAD.b

function Tooltip({ x, y, year, baseBalance, accelBalance, interestSaved }) {
  const w = 210, h = accelBalance !== null ? 86 : 56, pad = 10
  let tx = Math.max(4, Math.min(x - w / 2, W - 4 - w))
  let ty = y - h - 14
  if (ty < 4) ty = y + 14

  return (
    <g transform={`translate(${tx} ${ty})`}>
      <rect className="chart-tooltip-bg" width={w} height={h} rx="6" />
      <text className="chart-tooltip-title" x={pad} y={16}>
        {year === 0 ? 'Loan start' : `End of year ${year}`}
      </text>
      <text className="chart-tooltip-title" x={pad} y={34}
        style={{ fill: '#6a6a6a' }}>
        Without prepayment: {formatCompact(baseBalance)}
      </text>
      {accelBalance !== null && (
        <>
          <text className="chart-tooltip-value" x={pad} y={52}
            style={{ fontSize: 12, fill: '#4ade9f' }}>
            With prepayment: {formatCompact(accelBalance)}
          </text>
          <text className="chart-tooltip-title" x={pad} y={70}
            style={{ fill: '#e0a056' }}>
            Interest saved so far: {formatCompact(interestSaved)}
          </text>
        </>
      )}
    </g>
  )
}

export default function EMIChart({ base, accel, principal, tenureYears }) {
  const svgRef   = useRef(null)
  const [hoverYear, setHoverYear] = useState(null)

  const maxYear = tenureYears
  const xScale  = useCallback((yr) => PAD.l + (yr / maxYear) * INNER_W, [maxYear])

  // Build year-indexed balance maps from trajectories
  const baseMap  = useMemo(() => Object.fromEntries(base.trajectory.map(p => [p.year, p.balance])), [base])
  const accelMap = useMemo(() => Object.fromEntries(accel.trajectory.map(p => [p.year, p.balance])), [accel])

  // Cumulative interest saved per year (base cumulative - accel cumulative)
  const interestSavedByYear = useMemo(() => {
    const map = {}
    for (let y = 0; y <= maxYear; y++) {
      const bRow = base.yearlyRows.find(r => r.year === y)
      const aRow = accel.yearlyRows.find(r => r.year === y)
      // approximate: base cumulative interest - accel cumulative interest up to year y
      const bCum = base.yearlyRows.filter(r => r.year <= y).reduce((s, r) => s + r.interestTotal, 0)
      const aCum = accel.yearlyRows.filter(r => r.year <= y).reduce((s, r) => s + r.interestTotal, 0)
      map[y] = Math.max(0, bCum - aCum)
    }
    return map
  }, [base, accel, maxYear])

  const { tickMax, ticks } = useMemo(() => {
    const tickMax = niceCeil(principal * 1.05)
    return { tickMax, ticks: Array.from({ length: 7 }, (_, i) => i * tickMax / 6) }
  }, [principal])

  const ys = useCallback((val) => PAD.t + INNER_H - (val / tickMax) * INNER_H, [tickMax])

  // Base trajectory points (full tenure)
  const basePts  = useMemo(() =>
    base.trajectory.map(p => [xScale(p.year), ys(p.balance)]),
    [base, xScale, ys]
  )

  // Accel trajectory points (may close early, extend to 0 at closure year)
  const accelPts = useMemo(() => {
    const pts = accel.trajectory.map(p => [xScale(p.year), ys(p.balance)])
    // If loan closed early, extend a final point to y=0 baseline for clean closure look
    return pts
  }, [accel, xScale, ys])

  // Savings fill area: between base and accel (from year 0 to accel closure)
  const savingsArea = useMemo(() => {
    const accelYears = accel.trajectory.map(p => p.year)
    const commonYears = base.trajectory.map(p => p.year).filter(y => accelYears.includes(y))
    if (commonYears.length < 2) return ''
    const topPts    = commonYears.map(y => [xScale(y), ys(baseMap[y] ?? 0)])
    const bottomPts = commonYears.map(y => [xScale(y), ys(accelMap[y] ?? 0)])
    const top    = smoothPath(topPts)
    const bottom = bottomPts.slice().reverse().map((pt, i) => `L ${pt[0]} ${pt[1]}`).join(' ')
    return `${top} ${bottom} Z`
  }, [base, accel, baseMap, accelMap, xScale, ys])

  // X-axis labels (years, roughly every 5y)
  const xTicks = useMemo(() => {
    const step = tenureYears <= 10 ? 2 : tenureYears <= 20 ? 5 : 10
    const result = []
    for (let y = 0; y <= tenureYears; y += step) result.push(y)
    if (result.at(-1) !== tenureYears) result.push(tenureYears)
    return result
  }, [tenureYears])

  // Accel closure year vertical marker
  const accelClosureYear = accel.trajectory.at(-1)?.year ?? 0
  const closedEarly      = accel.totalMonths < base.totalMonths

  const handleMove = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const xPx    = ((e.clientX - rect.left) / rect.width) * W
    const yearRaw = ((xPx - PAD.l) / INNER_W) * maxYear
    const year   = Math.max(0, Math.min(maxYear, Math.round(yearRaw)))
    setHoverYear(year)
  }, [maxYear])

  const hoverBase  = hoverYear != null ? (baseMap[hoverYear]  ?? null) : null
  const hoverAccel = hoverYear != null ? (accelMap[hoverYear] ?? null) : null
  const hoverSaved = hoverYear != null ? (interestSavedByYear[hoverYear] ?? 0) : 0

  return (
    <div className="chart-card">
      <div style={{ display: 'flex', gap: 20, marginBottom: 14, fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 20, height: 2, background: 'var(--text-4)', display: 'inline-block', borderRadius: 2, borderTop: '2px dashed var(--text-4)' }} />
          No prepayment
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 20, height: 2, background: 'var(--teal)', display: 'inline-block', borderRadius: 2 }} />
          With prepayments
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 16, height: 10, background: 'rgba(224,160,86,0.18)', display: 'inline-block', borderRadius: 2 }} />
          Interest saved
        </span>
      </div>

      <svg ref={svgRef} className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        onMouseMove={handleMove} onMouseLeave={() => setHoverYear(null)}>
        <defs>
          <linearGradient id="emi-savings-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#e0a056" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#e0a056" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="emi-base-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#4a4a4a" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#4a4a4a" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y grid + labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line className="chart-grid-line" x1={PAD.l} x2={W - PAD.r} y1={ys(t)} y2={ys(t)} />
            <text className="chart-axis-label" x={PAD.l - 10} y={ys(t) + 4} textAnchor="end">
              {formatCompact(t)}
            </text>
          </g>
        ))}

        {/* Savings fill area */}
        <path d={savingsArea} fill="url(#emi-savings-gradient)" />

        {/* Base line — gray dashed */}
        <path d={smoothPath(basePts)} fill="none"
          stroke="#4a4a4a" strokeWidth="1.8"
          strokeDasharray="6 4" strokeLinejoin="round" strokeLinecap="round" />

        {/* Accel line — teal solid */}
        <path d={smoothPath(accelPts)} fill="none"
          stroke="var(--teal)" strokeWidth="2.4"
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Early-closure vertical marker */}
        {closedEarly && xScale(accelClosureYear) >= PAD.l && (
          <>
            <line
              x1={xScale(accelClosureYear)} x2={xScale(accelClosureYear)}
              y1={PAD.t} y2={PAD.t + INNER_H}
              stroke="var(--teal)" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
            <text
              x={xScale(accelClosureYear)} y={PAD.t + 14}
              textAnchor="middle"
              style={{ fontSize: 10, fill: 'var(--teal)', fontFamily: 'var(--sans)' }}>
              Loan closed
            </text>
          </>
        )}

        {/* X labels */}
        {xTicks.map(yr => (
          <text key={yr} className="chart-axis-label"
            x={xScale(yr)} y={H - PAD.b + 22} textAnchor="middle">
            {yr === 0 ? 'Now' : `Yr ${yr}`}
          </text>
        ))}

        {/* Hover */}
        {hoverYear != null && hoverBase != null && (
          <g>
            <line className="chart-hover-line"
              x1={xScale(hoverYear)} x2={xScale(hoverYear)} y1={PAD.t} y2={PAD.t + INNER_H} />
            {/* Base dot */}
            <circle cx={xScale(hoverYear)} cy={ys(hoverBase)} r="4" fill="#4a4a4a" />
            {/* Accel dot */}
            {hoverAccel != null && (
              <>
                <circle cx={xScale(hoverYear)} cy={ys(hoverAccel)} r="9"
                  fill="none" stroke="var(--teal)" strokeWidth="1" opacity="0.4" />
                <circle cx={xScale(hoverYear)} cy={ys(hoverAccel)} r="3.5" fill="var(--teal)" />
              </>
            )}
            <Tooltip
              x={xScale(hoverYear)} y={ys(hoverAccel ?? hoverBase)}
              year={hoverYear}
              baseBalance={hoverBase}
              accelBalance={hoverAccel}
              interestSaved={hoverSaved} />
          </g>
        )}
      </svg>
    </div>
  )
}
