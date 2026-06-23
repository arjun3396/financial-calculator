import React, { useMemo, useRef, useEffect, useState } from 'react'
import { simulate } from './simulate'
import {
  formatCompact, formatMonthly, formatRupees,
  formatINRCommas, parseRupees, parseNumber,
} from '../../lib/format'
import { usePersistedState } from '../../lib/usePersistedState'
import SliderRow from '../../components/SliderRow'
import SummaryCard from '../../components/SummaryCard'
import InfoTooltip from '../../components/InfoTooltip'
import EMIChart from './EMIChart'

const DEFAULTS = {
  principal:        30_00_000,
  annualRate:       8.5,
  tenureYears:      20,
  extraMonthly:     0,
  extraEMIsPerYear: 0,
  annualLumpsum:    0,
  lumpsumStartYear: 1,
  oneTimeBulk:      0,
  bulkAtMonth:      12,
}

const INFO = {
  principal:        'The total loan amount you borrow — the starting principal. Every rupee of principal accrues interest until it is repaid.',
  annualRate:       'The annual interest rate on a reducing balance basis. Interest is charged only on the outstanding principal — so as you repay, the interest component of each EMI shrinks.',
  tenureYears:      'The number of years to repay the loan. A longer tenure means smaller EMIs but far more total interest paid. Prepayments effectively shorten this.',
  extraMonthly:     'An additional fixed amount you pay every month on top of your regular EMI. This goes entirely toward reducing principal — every extra rupee cuts future interest.',
  extraEMIsPerYear: 'Pay this many extra full EMI-equivalents per year (e.g., using your annual bonus). This is automatically spread as a monthly top-up on top of any extra monthly amount you set.',
  annualLumpsum:    'A large lump-sum payment made once per year — like an annual bonus or maturity payout. Added on top of your regular EMI at the end of each year.',
  lumpsumStartYear: 'The year from which the annual lump-sum starts. Use year 1 to begin immediately, or a later year if you expect the funds later.',
  oneTimeBulk:      'A single large payment to knock down the principal in one shot — useful for a property sale, inheritance, or maturity of an investment.',
  bulkAtMonth:      'The month (from loan start) at which the one-time bulk payment is applied. Month 12 = end of year 1; month 24 = end of year 2, etc.',
  emi:              'EMI = Equated Monthly Instalment. A fixed monthly payment calculated so the loan is fully repaid by end of tenure. Each EMI covers an interest component (shrinks over time) and a principal component (grows over time).',
  totalInterest:    'Total interest paid over the full tenure with no prepayments. This is the "cost of the loan" on top of the principal.',
  interestSaved:    'The difference in total interest paid between the base (no prepayment) and accelerated (with prepayment) scenarios. This is real money you save.',
  timeSaved:        'How many months earlier your loan is fully paid off with the prepayment strategy. Fewer months = less interest.',
  totalPrepaid:     'The total extra amount paid above regular EMIs across the loan tenure. Compare this to interest saved to judge the efficiency of prepayment.',
}

function fmt(n) { return formatCompact(Math.round(n)) }
function fmtYM(months) {
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m} mo`
  if (m === 0) return `${y} yr`
  return `${y} yr ${m} mo`
}

export default function EMICalculator() {
  const [principal,        setPrincipal]        = usePersistedState('emi.principal',        DEFAULTS.principal)
  const [annualRate,       setAnnualRate]        = usePersistedState('emi.annualRate',        DEFAULTS.annualRate)
  const [tenureYears,      setTenureYears]       = usePersistedState('emi.tenureYears',       DEFAULTS.tenureYears)
  const [extraMonthly,     setExtraMonthly]      = usePersistedState('emi.extraMonthly',      DEFAULTS.extraMonthly)
  const [extraEMIsPerYear, setExtraEMIsPerYear]  = usePersistedState('emi.extraEMIsPerYear',  DEFAULTS.extraEMIsPerYear)
  const [annualLumpsum,    setAnnualLumpsum]     = usePersistedState('emi.annualLumpsum',     DEFAULTS.annualLumpsum)
  const [lumpsumStartYear, setLumpsumStartYear]  = usePersistedState('emi.lumpsumStartYear',  DEFAULTS.lumpsumStartYear)
  const [oneTimeBulk,      setOneTimeBulk]       = usePersistedState('emi.oneTimeBulk',       DEFAULTS.oneTimeBulk)
  const [bulkAtMonth,      setBulkAtMonth]       = usePersistedState('emi.bulkAtMonth',       DEFAULTS.bulkAtMonth)

  const sim = useMemo(() => simulate({
    principal, annualRate, tenureYears,
    extraMonthly, extraEMIsPerYear,
    annualLumpsum, lumpsumStartYear,
    oneTimeBulk, bulkAtMonth,
  }), [principal, annualRate, tenureYears, extraMonthly, extraEMIsPerYear,
       annualLumpsum, lumpsumStartYear, oneTimeBulk, bulkAtMonth])

  const hasPrepayment   = sim.totalPrepaid > 0
  const savingsPct      = sim.base.totalInterest > 0
    ? Math.round((sim.interestSaved / sim.base.totalInterest) * 100) : 0
  const accelYears      = Math.floor(sim.accel.totalMonths / 12)
  const accelMonths     = sim.accel.totalMonths % 12

  return (
    <>
      <section className="intro">
        <p className="eyebrow">CALCULATOR · 04</p>
        <h1>EMI &amp; loan repayment planner.</h1>
        <p className="lede">
          Calculate your EMI, then model how extra monthly payments, annual prepayments, or a one-time
          bulk payment cut your interest burden and close your loan years early. Every variable is yours
          to adjust.
        </p>
      </section>

      {/* ── Loan Details ── */}
      <section className="section">
        <p className="section-label">Loan details</p>
        <div className="card">
          <SliderRow label="Loan amount (principal)" info={INFO.principal}
            min={1_00_000} max={5_00_00_000} step={1_00_000}
            value={principal} onChange={setPrincipal}
            format={fmt}
            editParse={parseRupees} editSerialize={v => formatINRCommas(v)} />

          <SliderRow label="Annual interest rate (%)" info={INFO.annualRate}
            min={5} max={20} step={0.05}
            value={annualRate} onChange={setAnnualRate}
            format={v => v.toFixed(2) + '%'}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label="Loan tenure (years)" info={INFO.tenureYears}
            min={1} max={30} step={1}
            value={tenureYears} onChange={v => setTenureYears(Math.round(v))}
            format={v => v + (v === 1 ? ' year' : ' years')}
            editParse={parseNumber} editSerialize={v => String(v)} />
        </div>
      </section>

      {/* ── Regular prepayment ── */}
      <section className="section">
        <p className="section-label">Regular monthly prepayment</p>
        <div className="card">
          <SliderRow label="Extra monthly top-up" info={INFO.extraMonthly}
            min={0} max={1_00_000} step={1_000}
            value={extraMonthly} onChange={setExtraMonthly}
            format={v => v === 0 ? 'None' : formatMonthly(v)}
            editParse={parseRupees} editSerialize={v => formatINRCommas(v)} />

          <SliderRow label="Extra EMIs per year" info={INFO.extraEMIsPerYear}
            min={0} max={12} step={1}
            value={extraEMIsPerYear} onChange={v => setExtraEMIsPerYear(Math.round(v))}
            format={v => v === 0 ? 'None'
              : `${v} EMI${v > 1 ? 's' : ''}/yr  (≈ ${formatMonthly(Math.round(sim.emi * v / 12))} extra/mo)`}
            editParse={parseNumber} editSerialize={v => String(v)} />
        </div>
      </section>

      {/* ── Annual lump-sum ── */}
      <section className="section">
        <p className="section-label">Annual lump-sum prepayment</p>
        <div className="card">
          <SliderRow label="Annual lump sum" info={INFO.annualLumpsum}
            min={0} max={20_00_000} step={10_000}
            value={annualLumpsum} onChange={setAnnualLumpsum}
            format={v => v === 0 ? 'None' : fmt(v) + '/yr'}
            editParse={parseRupees} editSerialize={v => formatINRCommas(v)} />

          <SliderRow label="Starting from year" info={INFO.lumpsumStartYear}
            min={1} max={tenureYears} step={1}
            value={Math.min(lumpsumStartYear, tenureYears)}
            onChange={v => setLumpsumStartYear(Math.round(v))}
            format={v => `Year ${v}`}
            editParse={parseNumber} editSerialize={v => String(v)} />
        </div>
      </section>

      {/* ── One-time bulk ── */}
      <section className="section">
        <p className="section-label">One-time bulk prepayment</p>
        <div className="card">
          <SliderRow label="Bulk prepayment amount" info={INFO.oneTimeBulk}
            min={0} max={1_00_00_000} step={50_000}
            value={oneTimeBulk} onChange={setOneTimeBulk}
            format={v => v === 0 ? 'None' : fmt(v)}
            editParse={parseRupees} editSerialize={v => formatINRCommas(v)} />

          <SliderRow label="Apply at month" info={INFO.bulkAtMonth}
            min={1} max={tenureYears * 12} step={1}
            value={Math.min(bulkAtMonth, tenureYears * 12)}
            onChange={v => setBulkAtMonth(Math.round(v))}
            format={v => {
              const y = Math.ceil(v / 12)
              const m = v % 12 === 0 ? 12 : v % 12
              return `Month ${v}  (yr ${y}, mo ${m})`
            }}
            editParse={parseNumber} editSerialize={v => String(v)} />
        </div>
      </section>

      {/* ── Summary ── */}
      <section className="section">
        <p className="section-label">Summary</p>
        <div className="summary-grid fire-summary-grid">
          <SummaryCard
            label={<>Monthly EMI <InfoTooltip text={INFO.emi} /></>}
            value={formatMonthly(Math.round(sim.emi))} />

          <SummaryCard
            label={<>Total interest (no prepayment) <InfoTooltip text={INFO.totalInterest} /></>}
            value={fmt(sim.base.totalInterest)}
            tone="amber" />

          <SummaryCard
            label={<>Interest saved <InfoTooltip text={INFO.interestSaved} /></>}
            value={hasPrepayment ? `${fmt(sim.interestSaved)}  (${savingsPct}%)` : '—'}
            tone={hasPrepayment ? 'teal' : undefined} />

          <SummaryCard
            label={<>Time saved <InfoTooltip text={INFO.timeSaved} /></>}
            value={hasPrepayment ? fmtYM(sim.monthsSaved) : '—'}
            tone={hasPrepayment ? 'teal' : undefined} />

          <SummaryCard
            label="Loan closes in"
            value={`${fmtYM(sim.accel.totalMonths)}${hasPrepayment && sim.monthsSaved > 0 ? ' ✓ early' : ''}`}
            tone={hasPrepayment && sim.monthsSaved > 0 ? 'teal' : undefined} />

          <SummaryCard
            label={<>Total prepaid (extra) <InfoTooltip text={INFO.totalPrepaid} /></>}
            value={hasPrepayment ? fmt(sim.totalPrepaid) : '—'} />

          <SummaryCard
            label="Total paid (with prepayment)"
            value={fmt(principal + sim.accel.totalInterest)} />

          <SummaryCard
            label="Principal : Interest ratio"
            value={sim.accel.totalInterest > 0
              ? `${Math.round(principal / (principal + sim.accel.totalInterest) * 100)}% : ${Math.round(sim.accel.totalInterest / (principal + sim.accel.totalInterest) * 100)}%`
              : '—'} />
        </div>

        {/* Inline prepayment effectiveness callout */}
        {hasPrepayment && sim.interestSaved > 0 && (
          <div style={{
            marginTop: 16, padding: '14px 18px', borderRadius: 10,
            background: 'rgba(74,222,159,0.07)', border: '1px solid rgba(74,222,159,0.18)',
            fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6,
          }}>
            Your prepayments total <strong style={{ color: 'var(--text)' }}>{fmt(sim.totalPrepaid)}</strong> and
            save you <strong style={{ color: 'var(--teal)' }}>{fmt(sim.interestSaved)}</strong> in interest —
            a <strong style={{ color: 'var(--teal)' }}>{(sim.interestSaved / sim.totalPrepaid).toFixed(1)}×</strong> return
            on every extra rupee paid.
            {sim.monthsSaved > 0 && (
              <> Your loan closes <strong style={{ color: 'var(--teal)' }}>{fmtYM(sim.monthsSaved)} early</strong>.</>
            )}
          </div>
        )}
      </section>

      {/* ── Chart ── */}
      <section className="section">
        <p className="section-label">Outstanding balance — with vs without prepayment</p>
        <EMIChart base={sim.base} accel={sim.accel} principal={principal} tenureYears={tenureYears} />
      </section>

      {/* ── Amortization table ── */}
      <section className="section">
        <p className="section-label">Year-by-year amortization</p>
        <AmortizationTable
          baseRows={sim.base.yearlyRows}
          accelRows={sim.accel.yearlyRows}
          accelClosedYear={Math.ceil(sim.accel.totalMonths / 12)}
          baseClosedYear={tenureYears}
          hasPrepayment={hasPrepayment} />
      </section>

      <footer className="site-foot">
        EMI calculated on reducing balance (flat-rate loans will show different numbers — divide flat rate by ~1.83 to
        approximate reducing rate). Prepayments are applied in the month they fall due; any month where
        the outstanding balance is lower than the scheduled prepayment, the excess is capped. Interest saved
        is nominal (not inflation-adjusted). ₹1L = ₹1,00,000 · ₹1Cr = ₹1,00,00,000.
      </footer>
    </>
  )
}

// ── Amortization table ────────────────────────────────────────────────────────
function AmortizationTable({ baseRows, accelRows, accelClosedYear, baseClosedYear, hasPrepayment }) {
  const scrollRef = useRef(null)
  const [showHint, setShowHint] = useState(true)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setShowHint(!(el.scrollTop + el.clientHeight >= el.scrollHeight - 4))
    check()
    el.addEventListener('scroll', check)
    return () => el.removeEventListener('scroll', check)
  }, [baseRows.length])

  // Merge base and accel rows by year
  const maxYear = Math.max(
    baseRows.at(-1)?.year  ?? 0,
    accelRows.at(-1)?.year ?? 0,
  )

  const rows = []
  for (let y = 1; y <= maxYear; y++) {
    const b = baseRows.find(r => r.year === y)
    const a = accelRows.find(r => r.year === y)
    rows.push({ year: y, base: b, accel: a })
  }

  return (
    <div className="table-wrap">
      <div className="table-scroll" ref={scrollRef}>
        <table className="swp-table">
          <thead>
            <tr>
              <th className="col-year">Year</th>
              <th>EMI paid</th>
              {hasPrepayment && <th style={{ color: 'var(--amber)' }}>Prepaid extra</th>}
              <th>Principal (yr)</th>
              <th>Interest (yr)</th>
              <th>Balance</th>
              {hasPrepayment && <th style={{ color: 'var(--teal)' }}>Balance (prepaid)</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ year, base: b, accel: a }) => {
              const isAccelClosed = hasPrepayment && year === accelClosedYear && a?.balance === 0
              const isBaseClosed  = year === baseClosedYear && b?.balance === 0
              return (
                <tr key={year}
                  style={isAccelClosed ? { background: 'rgba(74,222,159,0.05)' } : {}}>
                  <td className="col-year" style={isAccelClosed ? { color: 'var(--teal)' } : {}}>
                    Year {year}
                    {isAccelClosed && <span className="pill ok" style={{ marginLeft: 8 }}>closed ✓</span>}
                    {isBaseClosed && !hasPrepayment && <span className="pill ok" style={{ marginLeft: 8 }}>closed</span>}
                  </td>
                  <td>{b ? formatCompact(Math.round(b.emiTotal)) : '—'}</td>
                  {hasPrepayment && (
                    <td style={{ color: a?.prepayTotal > 0 ? 'var(--amber)' : 'var(--text-3)' }}>
                      {a ? (a.prepayTotal > 0 ? formatCompact(Math.round(a.prepayTotal)) : '—') : '—'}
                    </td>
                  )}
                  <td>{b ? formatCompact(Math.round(b.principalTotal)) : '—'}</td>
                  <td style={{ color: 'var(--amber)' }}>
                    {b ? formatCompact(Math.round(b.interestTotal)) : '—'}
                  </td>
                  <td style={{ color: b?.balance === 0 ? 'var(--text-3)' : 'inherit' }}>
                    {b ? (b.balance === 0 ? 'Nil' : formatCompact(Math.round(b.balance))) : '—'}
                  </td>
                  {hasPrepayment && (
                    <td style={{ color: a?.balance === 0 ? 'var(--teal)' : 'var(--teal)', fontWeight: a?.balance === 0 ? 600 : 400 }}>
                      {a ? (a.balance === 0 ? 'Nil ✓' : formatCompact(Math.round(a.balance))) : 'Closed'}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {showHint && rows.length > 8 && <div className="scroll-hint" aria-hidden="true">↓</div>}
    </div>
  )
}
