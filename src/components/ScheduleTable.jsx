import React, { useState, useEffect, useRef } from 'react'
import { formatCompact, formatMonthly } from '../lib/format'

export default function ScheduleTable({ rows, target }) {
  const scrollRef = useRef(null)
  const [showHint, setShowHint] = useState(true)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setShowHint(!(el.scrollTop + el.clientHeight >= el.scrollHeight - 4))
    check()
    el.addEventListener('scroll', check)
    return () => el.removeEventListener('scroll', check)
  }, [rows.length])

  const lastIdx = rows.length - 1

  return (
    <div className="table-wrap">
      <div className="table-scroll" ref={scrollRef}>
        <table className="swp-table">
          <thead>
            <tr>
              <th className="col-year">Year</th>
              <th>Monthly SWP</th>
              <th>Withdrawn (yr)</th>
              <th>Corpus end of year</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.year} className={r.isStepUp ? 'stepup' : ''}>
                <td className="col-year">
                  Year {r.year}
                  {r.isStepUp && (
                    <span className="pill tiny" style={{ background: 'var(--teal-soft)', color: 'var(--teal)' }}>
                      step‑up
                    </span>
                  )}
                </td>
                <td className="col-mo">{formatMonthly(r.monthlySWP)}</td>
                <td>{formatCompact(r.withdrawnYear)}</td>
                <td>
                  {formatCompact(r.corpusEnd)}
                  {i === lastIdx && !r.busted && r.corpusEnd >= target  && <span className="pill ok">on track</span>}
                  {i === lastIdx && !r.busted && r.corpusEnd < target   && <span className="pill short">short of target</span>}
                  {r.busted && i > 0 && !rows[i - 1].busted             && <span className="pill bust">corpus exhausted</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showHint && rows.length > 8 && <div className="scroll-hint" aria-hidden="true">↓</div>}
    </div>
  )
}
