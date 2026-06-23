import React, { useMemo, useRef, useEffect, useState } from 'react'
import { simulate, findRequiredSavings } from './simulate'
import {
  formatCompact, formatMonthly, formatRupees,
  formatINRCommas, parseRupees, parseNumber,
} from '../../lib/format'
import { usePersistedState } from '../../lib/usePersistedState'
import SliderRow from '../../components/SliderRow'
import SummaryCard from '../../components/SummaryCard'
import InfoTooltip from '../../components/InfoTooltip'
import FIREChart from './FIREChart'

const INFO = {
  currentAge:      'Your age today. This is the starting point for the projection.',
  fireAge:         'FIRE = Financial Independence, Retire Early. This is the age at which you want your investments to fully cover your living expenses — so working becomes a choice, not a necessity.',
  lifeExpectancy:  'The age until which your portfolio must last. Using a higher number (85–90) builds in a safety buffer. Your money must not run out before this age.',
  currentCorpus:   'The total value of your existing investments and savings today. This acts as a head start and compounds for the entire accumulation period.',
  monthlyExpenses: 'Your current monthly spending. This will be inflation-adjusted to project what you\'ll need at retirement age — your FIRE number is built on this.',
  inflationRate:   'The annual rate at which your cost of living rises. India\'s average CPI inflation is 5–7%. A higher inflation rate means your FIRE number grows faster and your corpus must be larger.',
  swr:             'Safe Withdrawal Rate — the percentage of your corpus you can withdraw each year without running out of money over a long retirement. The classic "4% rule" suits 30-year US retirements; Indian investors typically use 3–3.5% due to higher inflation and longer post-FIRE horizons.',
  monthlySavings:  'The amount you invest every month during the accumulation phase. This is your primary lever for reaching your FIRE number faster.',
  savingsStepUp:   'Increase your monthly savings by this percentage each year — matching income growth. Even a 10% step-up annually can cut years off your FIRE timeline.',
  preReturnRate:   'Expected CAGR on your investments before you retire. You can take more risk (higher equity allocation) during accumulation, so this is typically higher than the post-FIRE return.',
  postReturnRate:  'Expected CAGR on your portfolio after you retire. Usually lower than pre-retirement — you shift toward stable, income-generating assets (bonds, dividend funds) to reduce volatility.',
  fireNumber:      'The total corpus you need to retire. Calculated as: (your monthly expenses × 12, inflation-adjusted to your retirement age) ÷ safe withdrawal rate. This is the single most important number in your FIRE plan.',
  coastFIRE:       'Coast FIRE is the point where your existing investments, growing on their own without any new contributions, will reach your FIRE number by your target age. Once you hit coast FIRE, you can "coast" — stop investing new money and just let compounding do its job.',
  portfolioSurvival: 'Whether your corpus will last until your life expectancy. A surviving portfolio means you will never outlive your money. If it runs short, reduce your SWR or increase your savings.',
  fireAchieved:    'The age at which your corpus first crosses your FIRE number. If this is earlier than your target FIRE age, you could retire sooner.',
  savingsNeeded:   'The minimum monthly savings (with your step-up settings) required to hit your FIRE number by your target age. If lower than your current savings, you\'re on track.',
}

const DEFAULTS = {
  currentAge:     30,
  fireAge:        45,
  lifeExpectancy: 85,
  currentCorpus:  0,
  monthlyExpenses: 60_000,
  inflationRate:  6,
  swr:            3.5,
  monthlySavings: 50_000,
  savingsStepUp:  10,
  preReturnRate:  12,
  postReturnRate: 8,
}

export default function FIRECalculator() {
  const [currentAge,      setCurrentAge]      = usePersistedState('fire.currentAge',      DEFAULTS.currentAge)
  const [fireAge,         setFireAge]          = usePersistedState('fire.fireAge',          DEFAULTS.fireAge)
  const [lifeExpectancy,  setLifeExpectancy]   = usePersistedState('fire.lifeExpectancy',   DEFAULTS.lifeExpectancy)
  const [currentCorpus,   setCurrentCorpus]    = usePersistedState('fire.currentCorpus',    DEFAULTS.currentCorpus)
  const [monthlyExpenses, setMonthlyExpenses]  = usePersistedState('fire.monthlyExpenses',  DEFAULTS.monthlyExpenses)
  const [inflationRate,   setInflationRate]    = usePersistedState('fire.inflationRate',    DEFAULTS.inflationRate)
  const [swr,             setSwr]              = usePersistedState('fire.swr',              DEFAULTS.swr)
  const [monthlySavings,  setMonthlySavings]   = usePersistedState('fire.monthlySavings',   DEFAULTS.monthlySavings)
  const [savingsStepUp,   setSavingsStepUp]    = usePersistedState('fire.savingsStepUp',    DEFAULTS.savingsStepUp)
  const [preReturnRate,   setPreReturnRate]    = usePersistedState('fire.preReturnRate',    DEFAULTS.preReturnRate)
  const [postReturnRate,  setPostReturnRate]   = usePersistedState('fire.postReturnRate',   DEFAULTS.postReturnRate)

  // fireAge must be > currentAge; clamp on change
  const safeFireAge = Math.max(currentAge + 1, fireAge)

  const params = {
    currentAge, fireAge: safeFireAge, lifeExpectancy,
    currentCorpus, monthlyExpenses, inflationRate, swr,
    monthlySavings, savingsStepUp, preReturnRate, postReturnRate,
  }

  const sim = useMemo(() => simulate(params), [
    currentAge, safeFireAge, lifeExpectancy,
    currentCorpus, monthlyExpenses, inflationRate, swr,
    monthlySavings, savingsStepUp, preReturnRate, postReturnRate,
  ])

  const requiredSavings = useMemo(() => findRequiredSavings({
    ...params, fireAge: safeFireAge, fireNumber: sim.fireNumber,
  }), [
    currentAge, safeFireAge, lifeExpectancy,
    currentCorpus, monthlyExpenses, inflationRate, swr,
    savingsStepUp, preReturnRate, postReturnRate,
    sim.fireNumber,
  ])

  // ── Summary values ──────────────────────────────────────────
  const fireAchieved   = sim.actualFIREAge != null
  const onTrack        = fireAchieved && sim.actualFIREAge <= safeFireAge
  const corpusGap      = Math.max(0, sim.fireNumber - sim.corpusAtFIRE)
  const portfolioSafe  = sim.portfolioSurvivalAge >= lifeExpectancy

  const fireAgeLine = () => {
    if (currentCorpus >= sim.fireNumber) return 'Already FIRE!'
    if (onTrack) return `Age ${sim.actualFIREAge}${sim.actualFIREAge < safeFireAge ? ' (early!)' : ''}`
    return `Need ${formatCompact(corpusGap)} more`
  }

  const coastLine = () => {
    if (sim.coastFIREAge == null) return 'Not yet reached'
    if (sim.coastFIREAge <= currentAge) return 'Already coast FIRE!'
    return `Age ${sim.coastFIREAge}`
  }

  const survivalLine = () => {
    if (sim.distRows.length === 0) return '—'
    if (portfolioSafe) return `Outlasts age ${lifeExpectancy} ✓`
    return `Runs out at age ${sim.portfolioSurvivalAge}`
  }

  return (
    <>
      <section className="intro">
        <p className="eyebrow">CALCULATOR · 03</p>
        <h1>Financial Independence, Retire Early.</h1>
        <p className="lede">
          Find out exactly how much corpus you need, when you can FIRE, what monthly savings get you there,
          and whether your portfolio will outlast you. Every variable is yours to control.
        </p>
      </section>

      {/* ── Inputs ── */}
      <section className="section">
        <p className="section-label">Your profile</p>
        <div className="card">
          <SliderRow label="Current age" info={INFO.currentAge}
            min={18} max={60} step={1}
            value={currentAge}
            onChange={v => { const a = Math.round(v); setCurrentAge(a); if (fireAge <= a) setFireAge(a + 1) }}
            format={v => v + ' yrs'}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label="Target FIRE age" info={INFO.fireAge}
            min={currentAge + 1} max={70} step={1}
            value={safeFireAge}
            onChange={v => setFireAge(Math.max(currentAge + 1, Math.round(v)))}
            format={v => v + ' yrs'}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label="Life expectancy" info={INFO.lifeExpectancy}
            min={Math.max(safeFireAge + 1, 60)} max={100} step={1}
            value={lifeExpectancy}
            onChange={v => setLifeExpectancy(Math.round(v))}
            format={v => v + ' yrs'}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label="Current corpus / savings" info={INFO.currentCorpus}
            min={0} max={5_00_00_000} step={1_00_000}
            value={currentCorpus} onChange={setCurrentCorpus}
            format={v => v === 0 ? 'None' : formatCompact(v)}
            editParse={parseRupees} editSerialize={v => formatINRCommas(v)} />
        </div>
      </section>

      <section className="section">
        <p className="section-label">Expense planning</p>
        <div className="card">
          <SliderRow label="Monthly expenses (today)" info={INFO.monthlyExpenses}
            min={10_000} max={10_00_000} step={5_000}
            value={monthlyExpenses} onChange={setMonthlyExpenses}
            format={formatMonthly}
            editParse={parseRupees} editSerialize={v => formatINRCommas(v)} />

          <SliderRow label="Inflation rate (%)" info={INFO.inflationRate}
            min={2} max={12} step={0.5}
            value={inflationRate} onChange={setInflationRate}
            format={v => v + '%'}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label="Safe withdrawal rate (%)" info={INFO.swr}
            min={2} max={6} step={0.25}
            value={swr} onChange={setSwr}
            format={v => v + '%'}
            editParse={parseNumber} editSerialize={v => String(v)} />
        </div>
      </section>

      <section className="section">
        <p className="section-label">Building your corpus</p>
        <div className="card">
          <SliderRow label="Monthly savings / SIP" info={INFO.monthlySavings}
            min={5_000} max={5_00_000} step={5_000}
            value={monthlySavings} onChange={setMonthlySavings}
            format={formatMonthly}
            editParse={parseRupees} editSerialize={v => formatINRCommas(v)} />

          <SliderRow label="Annual savings step-up (%)" info={INFO.savingsStepUp}
            min={0} max={30} step={1}
            value={savingsStepUp} onChange={setSavingsStepUp}
            format={v => v + '%'}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label="Pre-retirement return (%)" info={INFO.preReturnRate}
            min={4} max={20} step={0.5}
            value={preReturnRate} onChange={setPreReturnRate}
            format={v => v + '%'}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label="Post-retirement return (%)" info={INFO.postReturnRate}
            min={3} max={15} step={0.5}
            value={postReturnRate} onChange={setPostReturnRate}
            format={v => v + '%'}
            editParse={parseNumber} editSerialize={v => String(v)} />
        </div>
      </section>

      {/* ── Summary ── */}
      <section className="section">
        <p className="section-label">Summary</p>
        <div className="summary-grid fire-summary-grid">
          <SummaryCard
            label={<>FIRE number <InfoTooltip text={INFO.fireNumber} /></>}
            value={formatCompact(sim.fireNumber)}
            tone="amber" />

          <SummaryCard
            label={<>You achieve FIRE at <InfoTooltip text={INFO.fireAchieved} /></>}
            value={fireAgeLine()}
            tone={onTrack ? 'teal' : (corpusGap > 0 ? 'amber' : 'teal')} />

          <SummaryCard
            label={<>Monthly savings needed <InfoTooltip text={INFO.savingsNeeded} /></>}
            value={requiredSavings === 0 ? 'Already met' : formatMonthly(requiredSavings)}
            tone={monthlySavings >= requiredSavings ? 'teal' : 'amber'} />

          <SummaryCard
            label={<>Coast FIRE age <InfoTooltip text={INFO.coastFIRE} /></>}
            value={coastLine()}
            tone={sim.coastFIREAge != null && sim.coastFIREAge <= safeFireAge ? 'teal' : undefined} />

          <SummaryCard
            label={<>Portfolio survival <InfoTooltip text={INFO.portfolioSurvival} /></>}
            value={survivalLine()}
            tone={portfolioSafe ? 'teal' : 'amber'} />

          <SummaryCard
            label={`Expenses at age ${safeFireAge}`}
            value={formatMonthly(sim.annualExpensesAtFIRE / 12)} />

          <SummaryCard
            label="Years to FIRE"
            value={`${sim.yearsToFIRE} years`} />

          <SummaryCard
            label="Corpus you'll build"
            value={formatCompact(sim.corpusAtFIRE)}
            tone={sim.corpusAtFIRE >= sim.fireNumber ? 'teal' : undefined} />
        </div>
      </section>

      {/* ── Chart ── */}
      <section className="section">
        <p className="section-label">Corpus trajectory — accumulation & distribution</p>
        <FIREChart
          trajectory={sim.trajectory}
          fireNumber={sim.fireNumber}
          fireAge={safeFireAge}
          currentAge={currentAge}
          lifeExpectancy={lifeExpectancy} />
      </section>

      {/* ── Accumulation table ── */}
      <section className="section">
        <p className="section-label">Year-by-year to FIRE</p>
        <AccumulationTable rows={sim.accRows} fireNumber={sim.fireNumber} />
      </section>

      {/* ── Distribution table ── */}
      {sim.distRows.length > 0 && (
        <section className="section">
          <p className="section-label">Post-FIRE distribution schedule</p>
          <DistributionTable rows={sim.distRows} lifeExpectancy={lifeExpectancy} />
        </section>
      )}

      <footer className="site-foot">
        FIRE Number = inflation-adjusted annual expenses at retirement ÷ safe withdrawal rate. Returns are
        illustrative. Pre-retirement: monthly compounding at the stated CAGR. Post-retirement: monthly
        withdrawals with inflation-indexed expenses. SWR of 3–4% reflects a conservative Indian context
        (higher inflation, longer retirement horizons). ₹1L = ₹1,00,000 · ₹1Cr = ₹1,00,00,000.
      </footer>
    </>
  )
}

// ── Accumulation table ────────────────────────────────────────
function AccumulationTable({ rows, fireNumber }) {
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

  return (
    <div className="table-wrap">
      <div className="table-scroll" ref={scrollRef}>
        <table className="swp-table">
          <thead>
            <tr>
              <th className="col-year">Year / Age</th>
              <th>Monthly savings</th>
              <th>Saved this year</th>
              <th>Total saved</th>
              <th>Corpus</th>
              <th>Progress to FIRE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year} style={r.isFIRE ? { background: 'rgba(74,222,159,0.05)' } : {}}>
                <td className="col-year" style={r.isFIRE ? { color: 'var(--teal)' } : {}}>
                  Yr {r.year}
                  <span style={{ color: 'var(--text-3)', marginLeft: 6, fontSize: 12 }}>
                    Age {r.age}
                  </span>
                  {r.isFIRE && (
                    <span className="pill ok" style={{ marginLeft: 8 }}>FIRE ✓</span>
                  )}
                </td>
                <td>{formatMonthly(r.monthlySavings)}</td>
                <td>{formatCompact(r.savedYear)}</td>
                <td>{formatCompact(r.totalSaved)}</td>
                <td style={r.isFIRE ? { color: 'var(--teal)', fontWeight: 500 } : {}}>
                  {formatCompact(r.corpus)}
                </td>
                <td>
                  <ProgressBar pct={r.progressPercent} achieved={r.isFIRE} />
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

function ProgressBar({ pct, achieved }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1, height: 5, background: '#2f2f2f', borderRadius: 999, overflow: 'hidden',
        minWidth: 80,
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, pct)}%`,
          background: achieved ? 'var(--teal)' : 'var(--amber)',
          borderRadius: 999,
          transition: 'width 0.3s',
        }} />
      </div>
      <span style={{ fontSize: 12, color: achieved ? 'var(--teal)' : 'var(--text-3)', minWidth: 36 }}>
        {Math.min(100, Math.round(pct))}%
      </span>
    </div>
  )
}

// ── Distribution table ────────────────────────────────────────
function DistributionTable({ rows, lifeExpectancy }) {
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

  return (
    <div className="table-wrap">
      <div className="table-scroll" ref={scrollRef}>
        <table className="swp-table">
          <thead>
            <tr>
              <th className="col-year">Year / Age</th>
              <th>Monthly withdrawal</th>
              <th>Annual withdrawal</th>
              <th>Corpus end of year</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year}>
                <td className="col-year" style={r.busted ? { color: '#ff7474' } : {}}>
                  Yr {r.year}
                  <span style={{ color: 'var(--text-3)', marginLeft: 6, fontSize: 12 }}>
                    Age {r.age}
                  </span>
                  {r.age === lifeExpectancy && !r.busted && (
                    <span className="pill ok" style={{ marginLeft: 8 }}>life expectancy</span>
                  )}
                  {r.busted && (
                    <span className="pill bust" style={{ marginLeft: 8 }}>corpus exhausted</span>
                  )}
                </td>
                <td>{formatMonthly(r.monthlyWithdrawal)}</td>
                <td>{formatCompact(r.annualWithdrawal)}</td>
                <td style={r.corpus < r.annualWithdrawal * 3 && !r.busted ? { color: 'var(--amber)' } : {}}>
                  {formatCompact(r.corpus)}
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
