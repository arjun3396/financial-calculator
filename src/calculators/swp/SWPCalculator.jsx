import React, { useMemo } from 'react'
import { simulate, findMaxStartingSWP } from './simulate'
import { formatCompact, formatMonthly, formatINRCommas, parseRupees, parseNumber } from '../../lib/format'
import { usePersistedState } from '../../lib/usePersistedState'
import SliderRow from '../../components/SliderRow'
import SummaryCard from '../../components/SummaryCard'
import TrajectoryChart from '../../components/TrajectoryChart'
import ScheduleTable from '../../components/ScheduleTable'

const DEFAULTS = {
  initialCorpus:     1_00_00_000,  // ₹1 Cr
  cagr:              12,
  startMonthlySWP:   1_10_000,
  stepUpEveryNYears: 3,
  stepUpPercent:     15,
  targetCr:          10,
  years:             10,
}

export default function SWPCalculator() {
  const [initialCorpus,     setInitialCorpus]     = usePersistedState('swp.initialCorpus',     DEFAULTS.initialCorpus)
  const [cagr,               setCagr]              = usePersistedState('swp.cagr',               DEFAULTS.cagr)
  const [startMonthlySWP,   setStartMonthlySWP]   = usePersistedState('swp.startMonthlySWP',   DEFAULTS.startMonthlySWP)
  const [stepUpEveryNYears, setStepUpEveryNYears] = usePersistedState('swp.stepUpEveryNYears', DEFAULTS.stepUpEveryNYears)
  const [stepUpPercent,     setStepUpPercent]     = usePersistedState('swp.stepUpPercent',     DEFAULTS.stepUpPercent)
  const [targetCr,           setTargetCr]          = usePersistedState('swp.targetCr',           DEFAULTS.targetCr)
  const [years,              setYears]             = usePersistedState('swp.years',              DEFAULTS.years)

  const targetCorpus = targetCr * 1_00_00_000

  const sim = useMemo(() =>
    simulate({ initialCorpus, cagr, startMonthlySWP, stepUpEveryNYears, stepUpPercent, years }),
    [initialCorpus, cagr, startMonthlySWP, stepUpEveryNYears, stepUpPercent, years]
  )

  const maxSWP = useMemo(() =>
    findMaxStartingSWP({ initialCorpus, cagr, stepUpEveryNYears, stepUpPercent, years, targetCorpus }),
    [initialCorpus, cagr, stepUpEveryNYears, stepUpPercent, targetCorpus, years]
  )

  const corpusTone = (!sim.busted && sim.finalCorpus >= targetCorpus) ? 'teal' : 'amber'

  return (
    <>
      <section className="intro">
        <p className="eyebrow">CALCULATOR · 01</p>
        <h1>SWP with periodic step‑ups.</h1>
        <p className="lede">
          A systematic withdrawal plan where the monthly draw climbs every few years to keep up with lifestyle
          inflation. Move the sliders &mdash; the trajectory, summary, and year‑by‑year schedule update live.
        </p>
      </section>

      <section className="section">
        <p className="section-label">Inputs</p>
        <div className="card">
          <SliderRow label="Initial corpus"
            min={50_00_000} max={10_00_00_000} step={10_00_000}
            value={initialCorpus} onChange={setInitialCorpus}
            format={formatCompact}
            editParse={parseRupees} editSerialize={v => formatINRCommas(v)} />

          <SliderRow label="Expected CAGR (%)"
            min={6} max={20} step={0.5}
            value={cagr} onChange={setCagr}
            format={v => v + '%'}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label="Starting monthly SWP"
            min={20_000} max={5_00_000} step={5_000}
            value={startMonthlySWP} onChange={setStartMonthlySWP}
            format={formatMonthly}
            editParse={parseRupees} editSerialize={v => formatINRCommas(v)} />

          <SliderRow label="SWP step‑up every N years"
            min={1} max={10} step={1}
            value={stepUpEveryNYears} onChange={v => setStepUpEveryNYears(Math.max(1, Math.round(v)))}
            format={v => v + (v === 1 ? ' year' : ' years')}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label="Step‑up % each time"
            min={0} max={30} step={1}
            value={stepUpPercent} onChange={setStepUpPercent}
            format={v => v + '%'}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label="Time horizon (years)"
            min={5} max={50} step={1}
            value={years} onChange={v => setYears(Math.max(1, Math.round(v)))}
            format={v => v + (v === 1 ? ' year' : ' years')}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label={`Target corpus at year ${years} (Cr)`}
            min={5} max={100} step={1}
            value={targetCr} onChange={setTargetCr}
            format={v => formatCompact(v * 1_00_00_000)}
            editParse={parseNumber} editSerialize={v => String(v)} />
        </div>
      </section>

      <section className="section">
        <p className="section-label">Summary</p>
        <div className="summary-grid">
          <SummaryCard
            label={`Corpus at yr ${years}`}
            value={sim.busted ? formatCompact(0) : formatCompact(sim.finalCorpus)}
            tone={corpusTone} />
          <SummaryCard label="Target"                        value={formatCompact(targetCorpus)} />
          <SummaryCard label={`Total withdrawn (${years}yr)`} value={formatCompact(sim.totalWithdrawn)} />
          <SummaryCard label="Max SWP to hit target"
            value={maxSWP == null ? '—' : formatMonthly(maxSWP)}
            tone="amber" />
        </div>
        {sim.busted && (
          <p style={{ marginTop: 14, fontSize: 13, color: '#ff7474' }}>
            ⚠ Corpus runs out in year {sim.bustedYear}. Reduce starting SWP, increase corpus, or pick a longer step‑up cadence.
          </p>
        )}
      </section>

      <section className="section">
        <p className="section-label">Corpus trajectory</p>
        <TrajectoryChart trajectory={sim.trajectory} target={targetCorpus} years={years} />
      </section>

      <section className="section">
        <p className="section-label">SWP withdrawal schedule</p>
        <ScheduleTable rows={sim.rows} target={targetCorpus} />
      </section>

      <footer className="site-foot">
        Returns are illustrative, not guaranteed. CAGR is applied annually and SWP is debited monthly from corpus.
        ₹1L = ₹1,00,000 · ₹1Cr = ₹1,00,00,000.
      </footer>
    </>
  )
}
