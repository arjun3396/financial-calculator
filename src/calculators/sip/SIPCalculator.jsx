import React, { useMemo } from 'react'
import { simulate, findRequiredSIP } from './simulate'
import { formatCompact, formatMonthly, formatRupees, formatINRCommas, parseRupees, parseNumber } from '../../lib/format'
import { usePersistedState } from '../../lib/usePersistedState'
import SliderRow from '../../components/SliderRow'
import SummaryCard from '../../components/SummaryCard'
import InfoTooltip from '../../components/InfoTooltip'
import SIPChart from './SIPChart'
import ScheduleTable from '../../components/ScheduleTable'

const INFO = {
  monthlySIP:         'SIP = Systematic Investment Plan. A fixed amount invested every month into mutual funds or stocks. You benefit from rupee cost averaging — buying more units when markets are low, fewer when high.',
  annualReturn:       'The expected Compound Annual Growth Rate (CAGR) on your investments. Indian equity mutual funds have historically delivered 12–15% CAGR over long periods, though past returns don\'t guarantee future results.',
  years:              'The total number of years you plan to keep investing. Longer horizons let compounding work harder — doubling the time can more than quadruple your corpus.',
  sipStepUpPercent:   'Increase your monthly SIP by this percentage at the start of each step-up period. Even a 10% annual step-up dramatically boosts your final corpus because you invest more as your income grows.',
  stepUpEveryNYears:  'How often the step-up applies. Every 1 year = your SIP increases annually. Every 3 years = it increases once every 3 years.',
  initialLumpsum:     'A one-time investment made at the start alongside your regular SIP. It compounds for the entire duration, so even a small lump sum makes a big difference over 15–20 years.',
  periodicLumpsum:    'An extra injection of capital (like an annual bonus or maturity payout) added to your portfolio at regular intervals. Invested at the start of the chosen year and compounds from there.',
  lumpsumEveryNYears: 'How often the periodic lump sum is added. Every 3 years means you inject extra capital at years 3, 6, 9... and so on.',
  goalCr:             'Your target corpus at the end of the investment horizon. The calculator also reverse-engineers the monthly SIP you\'d need to reach this goal.',
}

const DEFAULTS = {
  monthlySIP:         10_000,
  annualReturn:       12,
  years:              20,
  sipStepUpPercent:   10,
  stepUpEveryNYears:  1,
  initialLumpsum:     0,
  periodicLumpsum:    0,
  lumpsumEveryNYears: 3,
  goalCr:             1,
}

export default function SIPCalculator() {
  const [monthlySIP,         setMonthlySIP]         = usePersistedState('sip.monthlySIP',         DEFAULTS.monthlySIP)
  const [annualReturn,       setAnnualReturn]        = usePersistedState('sip.annualReturn',       DEFAULTS.annualReturn)
  const [years,              setYears]               = usePersistedState('sip.years',              DEFAULTS.years)
  const [sipStepUpPercent,   setSipStepUpPercent]    = usePersistedState('sip.sipStepUpPercent',   DEFAULTS.sipStepUpPercent)
  const [stepUpEveryNYears,  setStepUpEveryNYears]   = usePersistedState('sip.stepUpEveryNYears',  DEFAULTS.stepUpEveryNYears)
  const [initialLumpsum,     setInitialLumpsum]      = usePersistedState('sip.initialLumpsum',     DEFAULTS.initialLumpsum)
  const [periodicLumpsum,    setPeriodicLumpsum]     = usePersistedState('sip.periodicLumpsum',    DEFAULTS.periodicLumpsum)
  const [lumpsumEveryNYears, setLumpsumEveryNYears]  = usePersistedState('sip.lumpsumEveryNYears', DEFAULTS.lumpsumEveryNYears)
  const [goalCr,             setGoalCr]              = usePersistedState('sip.goalCr',             DEFAULTS.goalCr)

  const goalCorpus = goalCr * 1_00_00_000

  const sim = useMemo(() =>
    simulate({ initialLumpsum, monthlySIP, annualReturn, years, sipStepUpPercent, stepUpEveryNYears, periodicLumpsum, lumpsumEveryNYears }),
    [initialLumpsum, monthlySIP, annualReturn, years, sipStepUpPercent, stepUpEveryNYears, periodicLumpsum, lumpsumEveryNYears]
  )

  const requiredSIP = useMemo(() =>
    findRequiredSIP({ initialLumpsum, annualReturn, years, sipStepUpPercent, stepUpEveryNYears, periodicLumpsum, lumpsumEveryNYears, goalCorpus }),
    [initialLumpsum, annualReturn, years, sipStepUpPercent, stepUpEveryNYears, periodicLumpsum, lumpsumEveryNYears, goalCorpus]
  )

  const onTrack    = sim.finalCorpus >= goalCorpus
  const corpusTone = onTrack ? 'teal' : 'amber'

  // Build table rows in the shape ScheduleTable expects
  const tableRows = sim.rows.map(r => ({
    year:         r.year,
    monthlySWP:   r.monthlySIP,       // ScheduleTable uses monthlySWP field name
    withdrawnYear: r.investedYear,    // re-use "Withdrawn (yr)" column for "Invested (yr)"
    corpusEnd:    r.corpusEnd,
    isStepUp:     r.isStepUp,
    busted:       false,
    hasLumpsum:   r.hasLumpsum,
    gain:         r.gain,
    totalInvested: r.totalInvested,
  }))

  return (
    <>
      <section className="intro">
        <p className="eyebrow">CALCULATOR · 02</p>
        <h1>SIP with step‑ups &amp; lump sum boosts.</h1>
        <p className="lede">
          A systematic investment plan that compounds monthly, grows your SIP each year, and lets you inject
          extra capital at regular intervals. Move the sliders — the projection, summary, and year‑by‑year
          schedule update live.
        </p>
      </section>

      {/* Inputs */}
      <section className="section">
        <p className="section-label">Inputs</p>
        <div className="card">
          <SliderRow label="Monthly SIP" info={INFO.monthlySIP}
            min={1_000} max={2_00_000} step={1_000}
            value={monthlySIP} onChange={setMonthlySIP}
            format={formatMonthly}
            editParse={parseRupees} editSerialize={v => formatINRCommas(v)} />

          <SliderRow label="Expected annual return (%)" info={INFO.annualReturn}
            min={4} max={30} step={0.5}
            value={annualReturn} onChange={setAnnualReturn}
            format={v => v + '%'}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label="Investment horizon (years)" info={INFO.years}
            min={1} max={40} step={1}
            value={years} onChange={v => setYears(Math.max(1, Math.round(v)))}
            format={v => v + (v === 1 ? ' year' : ' years')}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label="Annual SIP step‑up %" info={INFO.sipStepUpPercent}
            min={0} max={30} step={1}
            value={sipStepUpPercent} onChange={setSipStepUpPercent}
            format={v => v + '%'}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label="Step‑up every N years" info={INFO.stepUpEveryNYears}
            min={1} max={5} step={1}
            value={stepUpEveryNYears} onChange={v => setStepUpEveryNYears(Math.max(1, Math.round(v)))}
            format={v => v + (v === 1 ? ' year' : ' years')}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label="Initial lump sum" info={INFO.initialLumpsum}
            min={0} max={50_00_000} step={25_000}
            value={initialLumpsum} onChange={setInitialLumpsum}
            format={v => v === 0 ? 'None' : formatCompact(v)}
            editParse={parseRupees} editSerialize={v => formatINRCommas(v)} />

          <SliderRow label="Periodic extra lump sum" info={INFO.periodicLumpsum}
            min={0} max={20_00_000} step={10_000}
            value={periodicLumpsum} onChange={setPeriodicLumpsum}
            format={v => v === 0 ? 'None' : formatCompact(v)}
            editParse={parseRupees} editSerialize={v => formatINRCommas(v)} />

          <SliderRow label="Lump sum every N years" info={INFO.lumpsumEveryNYears}
            min={1} max={10} step={1}
            value={lumpsumEveryNYears} onChange={v => setLumpsumEveryNYears(Math.max(1, Math.round(v)))}
            format={v => v + (v === 1 ? ' year' : ' years')}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label={`Goal at year ${years} (Cr)`} info={INFO.goalCr}
            min={0.1} max={50} step={0.1}
            value={goalCr} onChange={setGoalCr}
            format={v => formatCompact(v * 1_00_00_000)}
            editParse={parseNumber} editSerialize={v => String(v)} />
        </div>
      </section>

      {/* Summary */}
      <section className="section">
        <p className="section-label">Summary</p>
        <div className="summary-grid">
          <SummaryCard
            label={`Corpus at yr ${years}`}
            value={formatCompact(sim.finalCorpus)}
            tone={corpusTone} />
          <SummaryCard label="Total invested"  value={formatCompact(sim.totalInvested)} />
          <SummaryCard label="Wealth gained"   value={formatCompact(sim.totalGain)} tone="teal" />
          <SummaryCard
            label={<>SIP needed for goal <InfoTooltip text="The minimum monthly SIP (with your current step-up settings) required to reach your goal corpus by the end of the horizon. Calculated by binary search." /></>}
            value={requiredSIP === 0 ? 'Already met' : formatMonthly(requiredSIP)}
            tone="amber" />
        </div>
      </section>

      {/* Chart */}
      <section className="section">
        <p className="section-label">Corpus vs invested trajectory</p>
        <SIPChart trajectory={sim.trajectory} goal={goalCorpus} years={years} />
      </section>

      {/* Table */}
      <section className="section">
        <p className="section-label">Year‑by‑year schedule</p>
        <SIPScheduleTable rows={sim.rows} goal={goalCorpus} years={years} />
      </section>

      <footer className="site-foot">
        Returns are illustrative, not guaranteed. CAGR is applied monthly. Step‑up increases SIP at the start
        of each step‑up period. Lump sums are invested at the start of the year and compound for the full year.
        ₹1L = ₹1,00,000 · ₹1Cr = ₹1,00,00,000.
      </footer>
    </>
  )
}

// SIP-specific table — columns differ from SWP (gain instead of withdrawal)
function SIPScheduleTable({ rows, goal }) {
  const [showHint, setShowHint] = React.useState(true)
  const scrollRef = React.useRef(null)

  React.useEffect(() => {
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
              <th>Monthly SIP</th>
              <th>Invested (yr)</th>
              <th>Total invested</th>
              <th>Corpus end of year</th>
              <th>Gain</th>
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
                  {r.hasLumpsum && (
                    <span className="pill tiny" style={{ background: 'var(--amber-soft)', color: 'var(--amber)', marginLeft: 4 }}>
                      lump sum
                    </span>
                  )}
                </td>
                <td className="col-mo">{formatMonthly(r.monthlySIP)}</td>
                <td>{formatCompact(r.investedYear)}</td>
                <td>{formatCompact(r.totalInvested)}</td>
                <td>
                  {formatCompact(r.corpusEnd)}
                  {i === lastIdx && r.corpusEnd >= goal && <span className="pill ok">goal met</span>}
                  {i === lastIdx && r.corpusEnd <  goal && <span className="pill short">short of goal</span>}
                </td>
                <td style={{ color: 'var(--teal)' }}>{formatCompact(r.gain)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showHint && rows.length > 8 && <div className="scroll-hint" aria-hidden="true">↓</div>}
    </div>
  )
}
