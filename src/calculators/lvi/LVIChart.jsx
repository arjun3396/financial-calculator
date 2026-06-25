import React, { useState, useMemo, useRef, useCallback } from 'react'
import { formatCompact } from '../../lib/format'
import { niceCeil, smoothPath } from '../../lib/chartUtils'

const W = 1000, H = 380
const PAD = { l: 76, r: 32, t: 28, b: 44 }
const INNER_W = W - PAD.l - PAD.r
const INNER_H = H - PAD.t - PAD.b

function Tooltip({ x, y, year, loanBenefit, interestSaved, freedEmi, investGain, repayFraction, splitLoanSaved, splitInvGain }) {
  const hasCustomSplit = repayFraction > 0 && repayFraction < 100
  const hasFreedEmi    = freedEmi > 0
  const lines = 2 + (hasFreedEmi ? 2 : 1) + (hasCustomSplit ? 2 : 0)
  const h = 20 + lines * 18 + 6
  const w = 248
  let tx = Math.max(4, Math.min(x - w / 2, W - 4 - w))
  let ty = y - h - 14
  if (ty < 4) ty = y + 14

  let row = 34
  const line = (text, color, fontSize) => {
    const el = (
      <text key={row} x={10} y={row} style={{ fontSize: fontSize ?? 12, fill: color, fontFamily: 'var(--sans)' }}>
        {text}
      </text>
    )
    row += 18
    return el
  }

  return (
    <g transform={`translate(${tx} ${ty})`}>
      <rect className="chart-tooltip-bg" width={w} height={h} rx="6" />
      <text className="chart-tooltip-title" x={10} y={16}>
        {year === 0 ? 'Start' : `End of year ${year}`}
      </text>
      {line(`All loan benefit: ${formatCompact(loanBenefit)}`, 'var(--teal)')}
      {hasFreedEmi && line(`  ↳ interest: ${formatCompact(interestSaved)}, freed EMI: ${formatCompact(freedEmi)}`, 'var(--text-3)', 10.5)}
      {line(`All invest: ${formatCompact(investGain)} gain`, 'var(--amber)')}
      {hasCustomSplit && line(`Your split — loan: ${formatCompact(splitLoanSaved)}, invest: ${formatCompact(splitInvGain)}`, 'var(--text-3)', 11)}
      {hasCustomSplit && line(`Split net: ${formatCompact(splitLoanSaved + splitInvGain)}`, 'var(--text-2)', 11)}
    </g>
  )
}

export default function LVIChart({ yearlyData, horizon, loanRate, investmentReturn, repayFraction }) {
  const svgRef    = useRef(null)
  const [hoverY, setHoverY] = useState(null)

  const maxVal = useMemo(() => {
    if (!yearlyData.length) return 1
    return Math.max(
      ...yearlyData.map(d => Math.max(d.allLoanSaved, d.allInvestGain)),
      1
    )
  }, [yearlyData])

  const tickMax = useMemo(() => niceCeil(maxVal * 1.08), [maxVal])
  const yTicks  = useMemo(
    () => Array.from({ length: 7 }, (_, i) => i * tickMax / 6),
    [tickMax]
  )

  const xScale = useCallback(yr => PAD.l + (yr / horizon) * INNER_W, [horizon])
  const yScale = useCallback(v  => PAD.t + INNER_H - (v / tickMax) * INNER_H, [tickMax])

  const loanPts  = useMemo(() =>
    yearlyData.map(d => [xScale(d.year), yScale(d.allLoanSaved)]),
    [yearlyData, xScale, yScale]
  )
  const investPts = useMemo(() =>
    yearlyData.map(d => [xScale(d.year), yScale(d.allInvestGain)]),
    [yearlyData, xScale, yScale]
  )

  const hasCustomSplit = repayFraction > 0 && repayFraction < 100
  const splitPts = useMemo(() =>
    hasCustomSplit
      ? yearlyData.map(d => [xScale(d.year), yScale(d.splitTotalBenefit)])
      : [],
    [yearlyData, xScale, yScale, hasCustomSplit]
  )

  // First year where invest gain surpasses total loan benefit
  const crossoverYear = useMemo(() => {
    for (const d of yearlyData) {
      if (d.allInvestGain > d.allLoanSaved) return d.year
    }
    return null
  }, [yearlyData])

  const xTicks = useMemo(() => {
    const step = horizon <= 10 ? 2 : horizon <= 20 ? 5 : 10
    const result = []
    for (let y = 0; y <= horizon; y += step) result.push(y)
    if (result.at(-1) !== horizon) result.push(horizon)
    return result
  }, [horizon])

  const handleMove = useCallback(e => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const xPx   = ((e.clientX - rect.left) / rect.width) * W
    const yrRaw = ((xPx - PAD.l) / INNER_W) * horizon
    setHoverY(Math.max(1, Math.min(horizon, Math.round(yrRaw))))
  }, [horizon])

  const hoverData = hoverY != null ? yearlyData.find(d => d.year === hoverY) : null
  const bottom    = PAD.t + INNER_H

  const loanAreaPath = useMemo(() => {
    if (!loanPts.length) return ''
    const base0 = [xScale(yearlyData[0]?.year ?? 1), bottom]
    const baseN = [xScale(yearlyData.at(-1)?.year ?? horizon), bottom]
    const path  = smoothPath(loanPts)
    return `${path} L ${baseN[0]} ${bottom} L ${base0[0]} ${bottom} Z`
  }, [loanPts, xScale, bottom, yearlyData, horizon])

  const investAreaPath = useMemo(() => {
    if (!investPts.length) return ''
    const base0 = [xScale(yearlyData[0]?.year ?? 1), bottom]
    const baseN = [xScale(yearlyData.at(-1)?.year ?? horizon), bottom]
    const path  = smoothPath(investPts)
    return `${path} L ${baseN[0]} ${bottom} L ${base0[0]} ${bottom} Z`
  }, [investPts, xScale, bottom, yearlyData, horizon])

  return (
    <div className="chart-card">
      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 14, fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 20, height: 2, background: 'var(--teal)', display: 'inline-block', borderRadius: 2 }} />
          All into loan (interest saved + freed EMI reinvested)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 20, height: 2, background: 'var(--amber)', display: 'inline-block', borderRadius: 2 }} />
          All invested ({investmentReturn}% CAGR gain)
        </span>
        {hasCustomSplit && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, height: 2, background: '#a78bfa', display: 'inline-block', borderRadius: 2, borderTop: '2px dashed #a78bfa' }} />
            Your split ({repayFraction}% loan / {100 - repayFraction}% invest)
          </span>
        )}
      </div>

      <svg ref={svgRef} className="chart-svg" viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onMouseMove={handleMove} onMouseLeave={() => setHoverY(null)}>
        <defs>
          <linearGradient id="lvi-loan-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="var(--teal)"  stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--teal)"  stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="lvi-invest-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="var(--amber)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--amber)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y grid + labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line className="chart-grid-line" x1={PAD.l} x2={W - PAD.r} y1={yScale(t)} y2={yScale(t)} />
            <text className="chart-axis-label" x={PAD.l - 10} y={yScale(t) + 4} textAnchor="end">
              {formatCompact(t)}
            </text>
          </g>
        ))}

        {/* Area fills */}
        <path d={loanAreaPath}   fill="url(#lvi-loan-grad)" />
        <path d={investAreaPath} fill="url(#lvi-invest-grad)" />

        {/* Loan line — teal */}
        {loanPts.length > 0 && (
          <path d={smoothPath(loanPts)} fill="none"
            stroke="var(--teal)" strokeWidth="2.4"
            strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* Invest line — amber */}
        {investPts.length > 0 && (
          <path d={smoothPath(investPts)} fill="none"
            stroke="var(--amber)" strokeWidth="2.4"
            strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* Split line — purple dashed */}
        {hasCustomSplit && splitPts.length > 0 && (
          <path d={smoothPath(splitPts)} fill="none"
            stroke="#a78bfa" strokeWidth="1.8"
            strokeDasharray="6 4"
            strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* Crossover marker */}
        {crossoverYear != null && (
          <>
            <line
              x1={xScale(crossoverYear)} x2={xScale(crossoverYear)}
              y1={PAD.t} y2={PAD.t + INNER_H}
              stroke="var(--text-4)" strokeWidth="1" strokeDasharray="4 3" />
            <text
              x={xScale(crossoverYear)} y={PAD.t + 14}
              textAnchor="middle"
              style={{ fontSize: 10, fill: 'var(--text-3)', fontFamily: 'var(--sans)' }}>
              Invest overtakes yr {crossoverYear}
            </text>
          </>
        )}

        {/* X axis labels */}
        {xTicks.map(yr => (
          <text key={yr} className="chart-axis-label"
            x={xScale(yr)} y={H - PAD.b + 22} textAnchor="middle">
            {yr === 0 ? 'Now' : `Yr ${yr}`}
          </text>
        ))}

        {/* Hover */}
        {hoverY != null && hoverData != null && (
          <g>
            <line className="chart-hover-line"
              x1={xScale(hoverY)} x2={xScale(hoverY)} y1={PAD.t} y2={PAD.t + INNER_H} />
            <circle cx={xScale(hoverY)} cy={yScale(hoverData.allLoanSaved)}  r="4" fill="var(--teal)" />
            <circle cx={xScale(hoverY)} cy={yScale(hoverData.allInvestGain)} r="4" fill="var(--amber)" />
            {hasCustomSplit && (
              <circle cx={xScale(hoverY)} cy={yScale(hoverData.splitTotalBenefit)} r="4" fill="#a78bfa" />
            )}
            <Tooltip
              x={xScale(hoverY)}
              y={Math.min(yScale(hoverData.allLoanSaved), yScale(hoverData.allInvestGain))}
              year={hoverY}
              loanBenefit={hoverData.allLoanSaved}
              interestSaved={hoverData.allInterestSaved}
              freedEmi={hoverData.yFreedEmiAll}
              investGain={hoverData.allInvestGain}
              repayFraction={repayFraction}
              splitLoanSaved={hoverData.splitLoanSaved}
              splitInvGain={hoverData.splitInvGain}
            />
          </g>
        )}
      </svg>
    </div>
  )
}
