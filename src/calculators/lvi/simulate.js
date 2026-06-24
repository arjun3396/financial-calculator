// Loan vs Investment calculator.
// Given a bulk lump sum, models two scenarios:
//   1. Put some/all into loan prepayment → interest saved
//   2. Put the rest into an investment → portfolio gain
// Computes a year-by-year comparison so the chart can show
// cumulative benefit of each path over time.

function calcEMI(principal, annualRate, tenureMonths) {
  if (annualRate === 0) return principal / tenureMonths
  const r = annualRate / 100 / 12
  return (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1)
}

function runLoan(principal, annualRate, tenureYears, prepayment) {
  if (principal <= 0 || annualRate <= 0 || tenureYears <= 0) {
    return { emi: 0, totalInterest: 0, totalMonths: 0, yearlyRows: [] }
  }
  const tenureMonths = tenureYears * 12
  const r   = annualRate / 100 / 12
  const emi = calcEMI(principal, annualRate, tenureMonths)

  let balance      = Math.max(0, principal - prepayment)
  let totalInterest = 0
  let actualMonths  = 0
  const yearMap     = {}

  for (let m = 1; m <= tenureMonths && balance > 0.5; m++) {
    const interest      = balance * r
    const principalPaid = Math.min(Math.max(0, emi - interest), balance)
    if (principalPaid <= 0) break
    balance       -= principalPaid
    totalInterest += interest
    actualMonths   = m

    const yr = Math.ceil(m / 12)
    if (!yearMap[yr]) yearMap[yr] = { year: yr, interestTotal: 0, balance: 0 }
    yearMap[yr].interestTotal += interest
    yearMap[yr].balance        = Math.max(0, balance)

    if (balance <= 0.5) break
  }

  const yearlyRows = Object.values(yearMap).sort((a, b) => a.year - b.year)
  return { emi, totalInterest, totalMonths: actualMonths, yearlyRows }
}

function fv(amount, annualReturnPct, years) {
  if (amount <= 0 || years <= 0) return 0
  return amount * Math.pow(1 + annualReturnPct / 100, years)
}

export function simulate({
  bulkAmount,
  loanBalance,
  loanRate,
  remainingTenure,
  investmentReturn,
  horizon,
  repayFraction,
}) {
  const repayRatio  = Math.max(0, Math.min(100, repayFraction)) / 100
  const maxPrepay   = Math.min(bulkAmount, loanBalance)
  const loanPortion = Math.min(bulkAmount * repayRatio, loanBalance)
  const investPortion = bulkAmount - bulkAmount * repayRatio

  // Three loan scenarios: no prepay, split prepay, full prepay
  const baseLoan     = runLoan(loanBalance, loanRate, remainingTenure, 0)
  const splitLoan    = runLoan(loanBalance, loanRate, remainingTenure, loanPortion)
  const fullPrepLoan = runLoan(loanBalance, loanRate, remainingTenure, maxPrepay)

  // Interest saved for each scenario
  const interestSaved    = Math.max(0, baseLoan.totalInterest - splitLoan.totalInterest)
  const monthsSaved      = Math.max(0, baseLoan.totalMonths  - splitLoan.totalMonths)
  const maxInterestSaved = Math.max(0, baseLoan.totalInterest - fullPrepLoan.totalInterest)

  // Investment gains
  const investGain     = fv(investPortion, investmentReturn, horizon) - investPortion
  const fullInvestGain = fv(bulkAmount,    investmentReturn, horizon) - bulkAmount

  // Net benefit for split
  const totalBenefit = interestSaved + investGain

  // Better option (pure comparison, all-in each)
  const betterOption  = maxInterestSaved >= fullInvestGain ? 'loan' : 'invest'
  const benefitDiff   = Math.abs(maxInterestSaved - fullInvestGain)

  // Effective annualised return from full prepay: solves P*(1+r)^T = P + saved
  let effectiveLoanReturn = null
  if (maxPrepay > 0 && remainingTenure > 0 && maxInterestSaved > 0) {
    effectiveLoanReturn = (Math.pow(1 + maxInterestSaved / maxPrepay, 1 / remainingTenure) - 1) * 100
  }

  // Minimum investment return so that FV(bulkAmount, horizon) >= bulkAmount + maxInterestSaved
  let breakEvenInvestRate = null
  if (maxInterestSaved > 0 && horizon > 0 && bulkAmount > 0) {
    breakEvenInvestRate = (Math.pow((bulkAmount + maxInterestSaved) / bulkAmount, 1 / horizon) - 1) * 100
  }

  // Loan rate at which interest saved equals fullInvestGain (binary search)
  let breakEvenLoanRate = null
  if (fullInvestGain > 0 && loanBalance > 0 && remainingTenure > 0) {
    let lo = 0.01, hi = 60
    for (let i = 0; i < 64; i++) {
      const mid   = (lo + hi) / 2
      const bBase = runLoan(loanBalance, mid, remainingTenure, 0)
      const bPrep = runLoan(loanBalance, mid, remainingTenure, maxPrepay)
      const saved = Math.max(0, bBase.totalInterest - bPrep.totalInterest)
      if (saved < fullInvestGain) lo = mid; else hi = mid
    }
    breakEvenLoanRate = (lo + hi) / 2
  }

  // Year-by-year data for chart and table
  const yearlyData = []
  let cumBase = 0, cumSplit = 0, cumFull = 0

  for (let y = 1; y <= horizon; y++) {
    const baseRow  = baseLoan.yearlyRows.find(r => r.year === y)
    const splitRow = splitLoan.yearlyRows.find(r => r.year === y)
    const fullRow  = fullPrepLoan.yearlyRows.find(r => r.year === y)

    cumBase  += baseRow?.interestTotal  ?? 0
    cumSplit += splitRow?.interestTotal ?? 0
    cumFull  += fullRow?.interestTotal  ?? 0

    const allLoanSaved  = Math.max(0, Math.round(cumBase - cumFull))
    const splitLoanSaved = Math.max(0, Math.round(cumBase - cumSplit))
    const allInvestGain  = Math.round(fv(bulkAmount,     investmentReturn, y) - bulkAmount)
    const splitInvGain   = Math.round(fv(investPortion,  investmentReturn, y) - investPortion)

    // Loan balance for this year (null if loan is already closed)
    const accelClosed = y > Math.ceil(splitLoan.totalMonths / 12)
    const baseClosed  = y > Math.ceil(baseLoan.totalMonths  / 12)

    yearlyData.push({
      year: y,
      allLoanSaved,
      allInvestGain,
      splitLoanSaved,
      splitInvGain,
      splitTotalBenefit: splitLoanSaved + splitInvGain,
      baseLoanBalance:  baseClosed  ? 0 : Math.round(baseRow?.balance  ?? 0),
      splitLoanBalance: accelClosed ? 0 : Math.round(splitRow?.balance ?? 0),
      splitLoanClosed: accelClosed,
      baseLoanClosed:  baseClosed,
    })
  }

  return {
    emi:            Math.round(baseLoan.emi),
    loanPortion:    Math.round(loanPortion),
    investPortion:  Math.round(investPortion),
    interestSaved:  Math.round(interestSaved),
    monthsSaved,
    maxInterestSaved: Math.round(maxInterestSaved),
    investGain:     Math.round(investGain),
    fullInvestGain: Math.round(fullInvestGain),
    totalBenefit:   Math.round(totalBenefit),
    betterOption,
    benefitDiff:    Math.round(benefitDiff),
    effectiveLoanReturn,
    breakEvenInvestRate,
    breakEvenLoanRate,
    yearlyData,
    canFullyRepay: bulkAmount >= loanBalance,
    baseLoan,
    splitLoan,
  }
}
