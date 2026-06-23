import React, { useState, useMemo, useRef, useCallback } from 'react'
import { formatCompact, formatRupees } from '../../lib/format'
import { niceCeil, smoothPath, niceXTicks } from '../../lib/chartUtils'

const W = 1000, H = 400
const PAD = { l: 76, r: 32, t: 28, b: 48 }
const INNER_W = W - PAD.l - PAD.r
const INNER_H = H - PAD.t - PAD.b

function Tooltip({ x, y, pt, fireNumber }) {
  const isAcc   = pt.phase === 'accumulation'
  const gap     = fireNumber - pt.corpus
  const w = 190, h = isAcc ? 72 : 68, pad = 10
  let tx = Math.max(4, Math.min(x - w / 2, W - 4 - w))
  let ty = y - h - 14
  if (ty < 4) ty = y + 14

  return (
    <g transform={`translate(${tx} ${ty})`}>
      <rect className="chart-tooltip-bg" width={w} height={h} rx="6" />
      <text className="chart-tooltip-title" x={pad} y={16}>Age {pt.age}</text>
      <text className="chart-tooltip-value" x={pad} y={34}
        style={{ fill: isAcc ? '#4ade9f' : '#e0a056' }}>
        {formatRupees(pt.corpus)}
      </text>
      {isAcc && gap > 0 && (
        <text className="chart-tooltip-title" x={pad} y={52}>
          Gap to FIRE: {formatCompact(gap)}
        </text>
      )}
      {isAcc && gap <= 0 && (
        <text className="chart-tooltip-title" x={pad} y={52}
          style={{ fill: '#4ade9f' }}>
          FIRE achieved ✓
        </text>
      )}
      {!isAcc && (
        <text className="chart-tooltip-title" x={pad} y={52}>
          Distribution phase
        </text>
      )}
    </g>
  )
}

export default function FIREChart({ trajectory, fireNumber, fireAge, currentAge, lifeExpectancy }) {
  const svgRef = useRef(null)
  const [hoverIdx, setHoverIdx] = useState(null)

  const minAge = currentAge
  const maxAge = Math.max(lifeExpectancy, trajectory.at(-1)?.age ?? lifeExpectancy)

  const xScale = useCallback(
    (age) => PAD.l + ((age - minAge) / (maxAge - minAge)) * INNER_W,
    [minAge, maxAge]
  )

  const maxCorpus = useMemo(
    () => Math.max(...trajectory.map(p => p.corpus), fireNumber) * 1.12,
    [trajectory, fireNumber]
  )

  const { ticks, tickMax } = useMemo(() => {
    const tickMax = niceCeil(maxCorpus)
    return { ticks: Array.from({ length: 7 }, (_, i) => i * tickMax / 6), tickMax }
  }, [maxCorpus])

  const ys = useCallback(
    (val) => PAD.t + INNER_H - (val / tickMax) * INNER_H,
    [tickMax]
  )

  const accPts  = trajectory.filter(p => p.phase === 'accumulation')
  const distPts = trajectory.filter(p => p.phase === 'distribution')

  // Include last accumulation point in distribution for continuity
  const distFull = accPts.length > 0 && distPts.length > 0
    ? [accPts.at(-1), ...distPts]
    : distPts

  const accLine = useMemo(() =>
    smoothPath(accPts.map(p => [xScale(p.age), ys(p.corpus)])),
    [accPts, xScale, ys]
  )
  const accArea = useMemo(() => {
    if (accPts.length === 0) return ''
    const pts = accPts.map(p => [xScale(p.age), ys(p.corpus)])
    const line = smoothPath(pts)
    const lastX = xScale(accPts.at(-1).age)
    return `${line} L ${lastX} ${PAD.t + INNER_H} L ${xScale(accPts[0].age)} ${PAD.t + INNER_H} Z`
  }, [accPts, xScale, ys])

  const distLine = useMemo(() =>
    smoothPath(distFull.map(p => [xScale(p.age), ys(p.corpus)])),
    [distFull, xScale, ys]
  )
  const distArea = useMemo(() => {
    if (distFull.length === 0) return ''
    const pts = distFull.map(p => [xScale(p.age), ys(p.corpus)])
    const line = smoothPath(pts)
    const lastX = xScale(distFull.at(-1).age)
    return `${line} L ${lastX} ${PAD.t + INNER_H} L ${xScale(distFull[0].age)} ${PAD.t + INNER_H} Z`
  }, [distFull, xScale, ys])

  const xTickAges = useMemo(() => {
    const span = maxAge - minAge
    const rawStep = span / 6
    const step = [1, 2, 5, 10, 15, 20, 25].find(s => s >= rawStep) || rawStep
    const result = []
    for (let a = minAge; a <= maxAge; a += step) result.push(Math.round(a))
    if (result.at(-1) !== maxAge) result.push(maxAge)
    return result
  }, [minAge, maxAge])

  const fireX = xScale(fireAge)

  const handleMove = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const xPx = ((e.clientX - rect.left) / rect.width) * W
    const ageRaw = minAge + ((xPx - PAD.l) / INNER_W) * (maxAge - minAge)
    const nearest = trajectory.reduce((best, pt, i) => {
      return Math.abs(pt.age - ageRaw) < Math.abs(trajectory[best].age - ageRaw) ? i : best
    }, 0)
    setHoverIdx(nearest)
  }, [trajectory, minAge, maxAge])

  const hoverPt = hoverIdx != null ? trajectory[hoverIdx] : null

  const fireTargetY = ys(fireNumber)
  const fireTargetVisible = fireNumber > 0 && fireNumber <= tickMax

  return (
    <div className="chart-card">
      <div style={{ display: 'flex', gap: 20, marginBottom: 14, fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 20, height: 2, background: 'var(--teal)', display: 'inline-block', borderRadius: 2 }} />
          Accumulation
        </span>
        {distPts.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, height: 2, background: 'var(--amber)', display: 'inline-block', borderRadius: 2 }} />
            Distribution (post-FIRE)
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 20, height: 1.5, background: '#e05858', display: 'inline-block', borderRadius: 2, borderBottom: '1.5px dashed #e05858' }} />
          FIRE number
        </span>
      </div>

      <svg ref={svgRef} className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        onMouseMove={handleMove} onMouseLeave={() => setHoverIdx(null)}>
        <defs>
          <linearGradient id="fire-acc-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#4ade9f" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#4ade9f" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fire-dist-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#e0a056" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#e0a056" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y grid */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line className="chart-grid-line" x1={PAD.l} x2={W - PAD.r} y1={ys(t)} y2={ys(t)} />
            <text className="chart-axis-label" x={PAD.l - 10} y={ys(t) + 4} textAnchor="end">
              {formatCompact(t)}
            </text>
          </g>
        ))}

        {/* FIRE number line */}
        {fireTargetVisible && (
          <>
            <line x1={PAD.l} x2={W - PAD.r} y1={fireTargetY} y2={fireTargetY}
              stroke="#e05858" strokeWidth="1.4" strokeDasharray="6 4" />
            <text x={W - PAD.r + 4} y={fireTargetY + 4}
              style={{ fontSize: 10, fill: '#e05858', fontFamily: 'var(--sans)' }}>
              FIRE
            </text>
          </>
        )}

        {/* FIRE age boundary */}
        {fireX >= PAD.l && fireX <= W - PAD.r && (
          <line x1={fireX} x2={fireX} y1={PAD.t} y2={PAD.t + INNER_H}
            stroke="#555" strokeWidth="1" strokeDasharray="4 3" />
        )}

        {/* Areas */}
        <path d={accArea}  fill="url(#fire-acc-gradient)" />
        {distPts.length > 0 && <path d={distArea} fill="url(#fire-dist-gradient)" />}

        {/* Lines */}
        <path d={accLine} fill="none" stroke="var(--teal)"  strokeWidth="2.2"
          strokeLinejoin="round" strokeLinecap="round" />
        {distPts.length > 0 && (
          <path d={distLine} fill="none" stroke="var(--amber)" strokeWidth="2.2"
            strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* X axis labels (ages) */}
        {xTickAges.map(age => (
          <text key={age} className="chart-axis-label"
            x={xScale(age)} y={H - PAD.b + 22} textAnchor="middle">
            {age === minAge ? 'Now' : age}
          </text>
        ))}

        {/* FIRE age label */}
        {fireX >= PAD.l && fireX <= W - PAD.r && (
          <text x={fireX} y={H - PAD.b + 38} textAnchor="middle"
            style={{ fontSize: 10, fill: 'var(--text-4)', fontFamily: 'var(--sans)' }}>
            FIRE
          </text>
        )}

        {/* Hover */}
        {hoverPt && (
          <g>
            <line className="chart-hover-line"
              x1={xScale(hoverPt.age)} x2={xScale(hoverPt.age)}
              y1={PAD.t} y2={PAD.t + INNER_H} />
            <circle cx={xScale(hoverPt.age)} cy={ys(hoverPt.corpus)} r="9"
              fill="none"
              stroke={hoverPt.phase === 'accumulation' ? 'var(--teal)' : 'var(--amber)'}
              strokeWidth="1" opacity="0.4" />
            <circle cx={xScale(hoverPt.age)} cy={ys(hoverPt.corpus)} r="3.5"
              fill={hoverPt.phase === 'accumulation' ? 'var(--teal)' : 'var(--amber)'} />
            <Tooltip
              x={xScale(hoverPt.age)} y={ys(hoverPt.corpus)}
              pt={hoverPt} fireNumber={fireNumber} />
          </g>
        )}
      </svg>
    </div>
  )
}
