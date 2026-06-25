import React, { useMemo, useRef, useEffect, useState } from 'react'
import { simulate } from './simulate'
import {
  formatCompact, formatMonthly, formatINRCommas,
  parseRupees, parseNumber,
} from '../../lib/format'
import { usePersistedState } from '../../lib/usePersistedState'
import SliderRow from '../../components/SliderRow'
import SummaryCard from '../../components/SummaryCard'
import InfoTooltip from '../../components/InfoTooltip'
import LVIChart from './LVIChart'

const DEFAULTS = {
  bulkAmount:       10_00_000,
  loanBalance:      30_00_000,
  loanRate:         8.5,
  remainingTenure:  15,
  investmentReturn: 12,
  horizon:          15,
  repayFraction:    0,
}

const INFO = {
  bulkAmount:        'The lump sum you have in hand — maybe a bonus, a maturity payout, or inherited money. This is the amount you want to put to best use.',
  loanBalance:       'The outstanding principal remaining on your loan right now. This is what you owe, not the original loan amount.',
  loanRate:          'Annual interest rate on your loan (reducing balance). This is the guaranteed risk-free return you earn by prepaying — every rupee of principal you knock out stops accruing interest at this rate.',
  remainingTenure:   'How many more years you have left on your loan. Longer tenure = more interest still to be paid = greater potential savings from prepayment.',
  investmentReturn:  'Expected average annual return (CAGR) from your investment — equity mutual funds, index funds, etc. Note: this is not guaranteed, unlike the loan rate.',
  horizon:           'The number of years over which you want to compare both options. Set it equal to your remaining loan tenure for an apples-to-apples comparison.',
  repayFraction:     'What percentage of your lump sum goes toward loan prepayment. 0% = invest everything. 100% = pay the loan. Slide to explore the in-between.',
  emi:               'Your current monthly EMI on the outstanding loan. This payment stays the same after prepayment — the tenure (or remaining months) reduces instead.',
  maxInterestSaved:  'Interest saved if you put your entire lump sum into loan prepayment. This is the guaranteed component of the prepayment benefit.',
  allFreedEmiGain:   'After your loan closes early from prepayment, you no longer owe the monthly EMI. Investing those freed EMI payments every month at your expected return compounds to this amount — this is the second (and often larger) component of the prepayment benefit.',
  allLoanBenefit:    'Total benefit of putting your entire lump sum into loan prepayment: interest saved + the future value of freed EMI payments reinvested monthly. This is the correct number to compare against investing the lump sum.',
  fullInvestGain:    'Investment gain if you invest the entire lump sum at the assumed CAGR. This is the best-case for the investment path — not guaranteed.',
  breakEvenInvest:   'The minimum annual return your investment must average so that investing the lump sum matches the full loan prepayment benefit (interest saved + freed EMI reinvested at the same rate). Below this, prepayment wins.',
  breakEvenLoan:     'The loan rate at which prepaying (including freed EMI reinvestment) would break even against investing at your assumed return. If your actual loan rate exceeds this, the loan path is the better choice.',
}

function fmt(n) { return formatCompact(Math.round(n)) }
function fmtYM(months) {
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m} mo`
  if (m === 0) return `${y} yr`
  return `${y} yr ${m} mo`
}
function fmtPct(v) { return v == null ? '—' : v.toFixed(1) + '%' }

export default function LVICalculator() {
  const [bulkAmount,       setBulkAmount]       = usePersistedState('lvi.bulkAmount',       DEFAULTS.bulkAmount)
  const [loanBalance,      setLoanBalance]       = usePersistedState('lvi.loanBalance',      DEFAULTS.loanBalance)
  const [loanRate,         setLoanRate]          = usePersistedState('lvi.loanRate',         DEFAULTS.loanRate)
  const [remainingTenure,  setRemainingTenure]   = usePersistedState('lvi.remainingTenure',  DEFAULTS.remainingTenure)
  const [investmentReturn, setInvestmentReturn]  = usePersistedState('lvi.investmentReturn', DEFAULTS.investmentReturn)
  const [horizon,          setHorizon]           = usePersistedState('lvi.horizon',          DEFAULTS.horizon)
  const [repayFraction,    setRepayFraction]     = usePersistedState('lvi.repayFraction',    DEFAULTS.repayFraction)

  const sim = useMemo(() => simulate({
    bulkAmount, loanBalance, loanRate, remainingTenure,
    investmentReturn, horizon, repayFraction,
  }), [bulkAmount, loanBalance, loanRate, remainingTenure, investmentReturn, horizon, repayFraction])

  const hasSplit     = repayFraction > 0 && repayFraction < 100
  const loanWins     = sim.betterOption === 'loan'
  const rateGap      = Math.abs(investmentReturn - loanRate)
  const ratesClose   = rateGap < 1.5
  const hasFreedEmi  = sim.allFreedEmiGain > 0

  return (
    <>
      <section className="intro">
        <p className="eyebrow">CALCULATOR · 05</p>
        <h1>Lump sum: repay loan or invest?</h1>
        <p className="lede">
          Got a windfall? Model exactly how much you save by prepaying your loan versus how much
          you earn by investing it — and find the split that works for you. Every rate, tenure,
          and allocation is yours to move.
        </p>
      </section>

      {/* ── Your situation ── */}
      <section className="section">
        <p className="section-label">Your lump sum &amp; loan</p>
        <div className="card">
          <SliderRow label="Lump sum amount" info={INFO.bulkAmount}
            min={50_000} max={2_00_00_000} step={50_000}
            value={bulkAmount} onChange={setBulkAmount}
            format={fmt}
            editParse={parseRupees} editSerialize={v => formatINRCommas(v)} />

          <SliderRow label="Outstanding loan balance" info={INFO.loanBalance}
            min={1_00_000} max={5_00_00_000} step={1_00_000}
            value={loanBalance} onChange={setLoanBalance}
            format={fmt}
            editParse={parseRupees} editSerialize={v => formatINRCommas(v)} />

          <SliderRow label="Loan interest rate (%)" info={INFO.loanRate}
            min={5} max={20} step={0.05}
            value={loanRate} onChange={setLoanRate}
            format={v => v.toFixed(2) + '%'}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label="Remaining loan tenure (years)" info={INFO.remainingTenure}
            min={1} max={30} step={1}
            value={remainingTenure} onChange={v => setRemainingTenure(Math.round(v))}
            format={v => v + (v === 1 ? ' year' : ' years')}
            editParse={parseNumber} editSerialize={v => String(v)} />
        </div>
      </section>

      {/* ── Investment assumption ── */}
      <section className="section">
        <p className="section-label">Investment assumption</p>
        <div className="card">
          <SliderRow label="Expected return (CAGR %)" info={INFO.investmentReturn}
            min={4} max={25} step={0.5}
            value={investmentReturn} onChange={setInvestmentReturn}
            format={v => v.toFixed(1) + '%'}
            editParse={parseNumber} editSerialize={v => String(v)} />

          <SliderRow label="Comparison horizon (years)" info={INFO.horizon}
            min={1} max={30} step={1}
            value={horizon} onChange={v => setHorizon(Math.round(v))}
            format={v => v + (v === 1 ? ' year' : ' years')}
            editParse={parseNumber} editSerialize={v => String(v)} />
        </div>
      </section>

      {/* ── Allocation split ── */}
      <section className="section">
        <p className="section-label">How to split the lump sum</p>
        <div className="card">
          <SliderRow label="% toward loan repayment" info={INFO.repayFraction}
            min={0} max={100} step={5}
            value={repayFraction} onChange={v => setRepayFraction(Math.round(v))}
            format={v =>
              v === 0   ? '0% — invest everything' :
              v === 100 ? '100% — repay everything' :
              `${v}% loan  ·  ${100 - v}% invest`
            }
            editParse={parseNumber} editSerialize={v => String(v)} />
        </div>

        {hasSplit && (
          <div style={{ marginTop: 10, display: 'flex', gap: 12, fontSize: 13, flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(74,222,159,0.1)', color: 'var(--teal)', border: '1px solid rgba(74,222,159,0.25)' }}>
              {fmt(sim.loanPortion)} → loan
            </span>
            <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(224,160,86,0.1)', color: 'var(--amber)', border: '1px solid rgba(224,160,86,0.25)' }}>
              {fmt(sim.investPortion)} → investment
            </span>
            {sim.canFullyRepay && repayFraction === 100 && (
              <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(74,222,159,0.07)', color: 'var(--text-2)', border: '1px solid rgba(74,222,159,0.15)', fontSize: 12 }}>
                Fully pays off your loan ✓
              </span>
            )}
          </div>
        )}
      </section>

      {/* ── Summary ── */}
      <section className="section">
        <p className="section-label">Summary — all-in comparison</p>
        <div className="summary-grid fire-summary-grid">
          <SummaryCard
            label={<>Current monthly EMI <InfoTooltip text={INFO.emi} /></>}
            value={formatMonthly(sim.emi)} />

          <SummaryCard
            label={<>Interest saved (all → loan) <InfoTooltip text={INFO.maxInterestSaved} /></>}
            value={fmt(sim.maxInterestSaved)}
            tone={loanWins ? 'teal' : undefined} />

          <SummaryCard
            label={<>Freed EMI reinvested <InfoTooltip text={INFO.allFreedEmiGain} /></>}
            value={hasFreedEmi ? fmt(sim.allFreedEmiGain) : '—'}
            tone={hasFreedEmi && loanWins ? 'teal' : undefined} />

          <SummaryCard
            label={<>Total prepay benefit <InfoTooltip text={INFO.allLoanBenefit} /></>}
            value={fmt(sim.allLoanBenefit)}
            tone={loanWins ? 'teal' : undefined} />

          <SummaryCard
            label={<>If all → invest: gain at {investmentReturn}% <InfoTooltip text={INFO.fullInvestGain} /></>}
            value={fmt(sim.fullInvestGain)}
            tone={!loanWins ? 'amber' : undefined} />

          <SummaryCard
            label="Net advantage"
            value={`${fmt(sim.benefitDiff)} → ${loanWins ? 'loan' : 'invest'}`}
            tone={loanWins ? 'teal' : 'amber'} />

          <SummaryCard
            label={<>Min return to beat prepayment <InfoTooltip text={INFO.breakEvenInvest} /></>}
            value={fmtPct(sim.breakEvenInvestRate)} />

          <SummaryCard
            label={<>Loan rate where prepayment wins <InfoTooltip text={INFO.breakEvenLoan} /></>}
            value={fmtPct(sim.breakEvenLoanRate)} />
        </div>

        {/* Freed EMI sub-note */}
        {hasFreedEmi && (
          <div style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(74,222,159,0.05)', border: '1px solid rgba(74,222,159,0.12)',
            fontSize: 12, color: 'var(--text-3)', lineHeight: 1.55,
          }}>
            Loan closes <strong style={{ color: 'var(--text-2)' }}>{fmtYM(sim.maxMonthsSaved)}</strong> early.
            {' '}The freed EMI of <strong style={{ color: 'var(--text-2)' }}>{formatMonthly(sim.emi)}</strong>/mo,
            invested at {investmentReturn}% for those months, grows to{' '}
            <strong style={{ color: 'var(--teal)' }}>{fmt(sim.allFreedEmiGain)}</strong> — added to interest saved of{' '}
            <strong style={{ color: 'var(--teal)' }}>{fmt(sim.maxInterestSaved)}</strong> = total prepay benefit{' '}
            <strong style={{ color: 'var(--teal)' }}>{fmt(sim.allLoanBenefit)}</strong>.
          </div>
        )}

        {/* Recommendation callout */}
        <div style={{
          marginTop: 12, padding: '14px 18px', borderRadius: 10,
          background: loanWins
            ? 'rgba(74,222,159,0.07)'
            : ratesClose ? 'rgba(255,255,255,0.04)' : 'rgba(224,160,86,0.07)',
          border: loanWins
            ? '1px solid rgba(74,222,159,0.2)'
            : ratesClose ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(224,160,86,0.2)',
          fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65,
        }}>
          {ratesClose ? (
            <>
              Your loan rate (<strong style={{ color: 'var(--text)' }}>{loanRate.toFixed(1)}%</strong>) and
              expected return (<strong style={{ color: 'var(--text)' }}>{investmentReturn.toFixed(1)}%</strong>) are close —
              the total prepay benefit (<strong style={{ color: 'var(--teal)' }}>{fmt(sim.allLoanBenefit)}</strong>) and
              invest gain (<strong style={{ color: 'var(--amber)' }}>{fmt(sim.fullInvestGain)}</strong>) are within a thin margin.
              Consider your <strong style={{ color: 'var(--text)' }}>risk tolerance</strong>: prepaying is risk-free;
              investing is market-linked.
            </>
          ) : loanWins ? (
            <>
              Prepay your loan. Total benefit is <strong style={{ color: 'var(--teal)' }}>{fmt(sim.allLoanBenefit)}</strong>{' '}
              ({fmt(sim.maxInterestSaved)} interest saved + {fmt(sim.allFreedEmiGain)} from reinvesting freed EMI) versus{' '}
              <strong style={{ color: 'var(--text)' }}>{fmt(sim.fullInvestGain)}</strong> from investing — a difference of{' '}
              <strong style={{ color: 'var(--teal)' }}>{fmt(sim.benefitDiff)}</strong> in favour of prepayment.
              {sim.breakEvenInvestRate != null && (
                <> Your investments need to average{' '}
                  <strong style={{ color: 'var(--teal)' }}>{fmtPct(sim.breakEvenInvestRate)}</strong> to match this.
                </>
              )}
            </>
          ) : (
            <>
              Invest the lump sum. Investing at {investmentReturn}% earns{' '}
              <strong style={{ color: 'var(--amber)' }}>{fmt(sim.fullInvestGain)}</strong> versus a total prepay benefit of{' '}
              <strong style={{ color: 'var(--text)' }}>{fmt(sim.allLoanBenefit)}</strong>{' '}
              ({fmt(sim.maxInterestSaved)} interest + {fmt(sim.allFreedEmiGain)} freed EMI) —{' '}
              <strong style={{ color: 'var(--amber)' }}>{fmt(sim.benefitDiff)}</strong> more from investing.
              {sim.breakEvenLoanRate != null && (
                <> Your loan rate would need to be{' '}
                  <strong style={{ color: 'var(--amber)' }}>≥{fmtPct(sim.breakEvenLoanRate)}</strong> for prepayment to win.
                </>
              )}
              {' '}Note: investment returns are not guaranteed.
            </>
          )}
        </div>
      </section>

      {/* ── Chart ── */}
      <section className="section">
        <p className="section-label">Cumulative benefit over time — total prepay benefit vs investment gain</p>
        <LVIChart
          yearlyData={sim.yearlyData}
          horizon={horizon}
          loanRate={loanRate}
          investmentReturn={investmentReturn}
          repayFraction={repayFraction}
        />
      </section>

      {/* ── Year-by-year table ── */}
      <section className="section">
        <p className="section-label">Year-by-year breakdown</p>
        <ComparisonTable
          yearlyData={sim.yearlyData}
          loanPortion={sim.loanPortion}
          investPortion={sim.investPortion}
          repayFraction={repayFraction}
          investmentReturn={investmentReturn}
        />
      </section>

      <footer className="site-foot">
        Loan interest saved uses reducing-balance amortisation with your lump sum applied as an
        upfront prepayment; the original EMI is kept constant (tenure reduces). When the loan closes
        early, the freed monthly EMI is modelled as a monthly SIP reinvested at your expected return
        rate — this is included in the total prepay benefit. Investment returns are projected at a
        constant CAGR — actual returns vary. Break-even rates account for freed EMI reinvestment and
        are found by binary search. ₹1L = ₹1,00,000 · ₹1Cr = ₹1,00,00,000.
      </footer>
    </>
  )
}

// ── Year-by-year comparison table ──────────────────────────────────────────────
function ComparisonTable({ yearlyData, loanPortion, investPortion, repayFraction, investmentReturn }) {
  const scrollRef = useRef(null)
  const [showHint, setShowHint] = useState(true)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setShowHint(!(el.scrollTop + el.clientHeight >= el.scrollHeight - 4))
    check()
    el.addEventListener('scroll', check)
    return () => el.removeEventListener('scroll', check)
  }, [yearlyData.length])

  const hasSplit  = repayFraction > 0 && repayFraction < 100
  const hasLoan   = loanPortion > 0
  const hasInvest = investPortion > 0

  return (
    <div className="table-wrap">
      <div className="table-scroll" ref={scrollRef}>
        <table className="swp-table">
          <thead>
            <tr>
              <th className="col-year">Year</th>
              {hasLoan && (
                <>
                  <th style={{ color: 'var(--text-2)' }}>Loan balance</th>
                  <th style={{ color: 'var(--teal)' }}>
                    {hasSplit ? 'Interest saved (split)' : 'Interest saved'}
                  </th>
                </>
              )}
              {hasInvest && (
                <>
                  <th style={{ color: 'var(--amber)' }}>
                    {hasSplit ? 'Portfolio (split)' : 'Portfolio value'}
                  </th>
                  <th style={{ color: 'var(--amber)' }}>
                    {hasSplit ? 'Invest gain (split)' : 'Invest gain'}
                  </th>
                </>
              )}
              {hasSplit && (
                <th style={{ color: 'var(--text-2)' }}>Split net</th>
              )}
              <th style={{ color: 'var(--teal)' }}>
                <span title="Interest saved + freed EMI reinvested">Prepay benefit ↑</span>
              </th>
              <th style={{ color: 'var(--amber)' }}>All-invest gain</th>
            </tr>
          </thead>
          <tbody>
            {yearlyData.map(row => {
              const splitLoanBal = hasLoan
                ? (row.splitLoanClosed ? 0 : row.splitLoanBalance)
                : null

              return (
                <tr key={row.year}
                  style={row.splitLoanClosed && hasLoan ? { background: 'rgba(74,222,159,0.04)' } : {}}>
                  <td className="col-year">
                    Year {row.year}
                    {row.splitLoanClosed && hasLoan && (
                      <span className="pill ok" style={{ marginLeft: 8 }}>loan closed ✓</span>
                    )}
                  </td>

                  {hasLoan && (
                    <>
                      <td style={{ color: splitLoanBal === 0 ? 'var(--teal)' : 'inherit' }}>
                        {splitLoanBal === 0 ? 'Nil ✓' : fmt(splitLoanBal)}
                      </td>
                      <td style={{ color: 'var(--teal)' }}>
                        {row.splitInterestSaved > 0 ? fmt(row.splitInterestSaved) : '—'}
                      </td>
                    </>
                  )}

                  {hasInvest && (
                    <>
                      <td style={{ color: 'var(--amber)' }}>
                        {fmt(investPortion + row.splitInvGain)}
                      </td>
                      <td style={{ color: 'var(--amber)' }}>
                        {row.splitInvGain > 0 ? fmt(row.splitInvGain) : '—'}
                      </td>
                    </>
                  )}

                  {hasSplit && (
                    <td style={{ fontWeight: 500 }}>{fmt(row.splitTotalBenefit)}</td>
                  )}

                  <td style={{ color: 'var(--teal)' }}>
                    <span title={row.yFreedEmiAll > 0 ? `Interest: ${fmt(row.allInterestSaved)} + Freed EMI: ${fmt(row.yFreedEmiAll)}` : undefined}>
                      {fmt(row.allLoanSaved)}
                    </span>
                  </td>
                  <td style={{ color: 'var(--amber)' }}>{fmt(row.allInvestGain)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {showHint && yearlyData.length > 8 && <div className="scroll-hint" aria-hidden="true">↓</div>}
    </div>
  )
}
