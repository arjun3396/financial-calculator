// Loan vs Investment calculator.
// Given a bulk lump sum, models two scenarios:
//   1. Put some/all into loan prepayment → interest saved + freed EMI reinvested
//   2. Put the rest into an investment → portfolio gain
// When a loan closes early, the monthly EMI that's no longer owed is reinvested
// as a monthly SIP — this "freed EMI gain" is included in the total loan benefit.

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

// SIP future value of freed monthly EMI payments invested after early loan closure.
// Payments run from month (accelMonths+1) to min(baseMonths, horizonMonths),
// then the accumulated corpus compounds to horizonMonths.
function calcFreedEmiGain(emi, annualReturn, accelMonths, baseMonths, horizonMonths) {
  const freeFrom = accelMonths + 1
  const freeTo   = Math.min(baseMonths, horizonMonths)
  const n        = Math.max(0, freeTo - freeFrom + 1)
  if (n <= 0 || emi <= 0) return 0
  if (annualReturn <= 0) return emi * n
  const r       = annualReturn / 100 / 12
  const fvAtEnd = emi * ((Math.pow(1 + r, n) - 1) / r)  // SIP FV at month freeTo
  const extra   = Math.max(0, horizonMonths - freeTo)
  return fvAtEnd * Math.pow(1 + r, extra)                 // compound to horizonMonths
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
  const repayRatio    = Math.max(0, Math.min(100, repayFraction)) / 100
  const maxPrepay     = Math.min(bulkAmount, loanBalance)
  const loanPortion   = Math.min(bulkAmount * repayRatio, loanBalance)
  const investPortion = bulkAmount - bulkAmount * repayRatio

  // Three loan scenarios: no prepay, split prepay, full prepay
  const baseLoan     = runLoan(loanBalance, loanRate, remainingTenure, 0)
  const splitLoan    = runLoan(loanBalance, loanRate, remainingTenure, loanPortion)
  const fullPrepLoan = runLoan(loanBalance, loanRate, remainingTenure, maxPrepay)

  const horizonMonths = horizon * 12

  // Interest saved for each scenario
  const interestSaved    = Math.max(0, baseLoan.totalInterest - splitLoan.totalInterest)
  const monthsSaved      = Math.max(0, baseLoan.totalMonths  - splitLoan.totalMonths)
  const maxInterestSaved = Math.max(0, baseLoan.totalInterest - fullPrepLoan.totalInterest)
  const maxMonthsSaved   = Math.max(0, baseLoan.totalMonths  - fullPrepLoan.totalMonths)

  // Freed EMI reinvestment: SIP of monthly EMI from early closure to original loan end
  const allFreedEmiGain   = calcFreedEmiGain(baseLoan.emi, investmentReturn, fullPrepLoan.totalMonths, baseLoan.totalMonths, horizonMonths)
  const splitFreedEmiGain = calcFreedEmiGain(baseLoan.emi, investmentReturn, splitLoan.totalMonths,    baseLoan.totalMonths, horizonMonths)

  // Total loan path benefits (interest saved + freed EMI reinvested)
  const allLoanBenefit     = maxInterestSaved + allFreedEmiGain
  const splitPrepayBenefit = interestSaved + splitFreedEmiGain

  // Investment gains
  const investGain     = fv(investPortion, investmentReturn, horizon) - investPortion
  const fullInvestGain = fv(bulkAmount,    investmentReturn, horizon) - bulkAmount

  // Split total benefit
  const totalBenefit = splitPrepayBenefit + investGain

  // Better option (apples-to-apples: full loan benefit vs full invest gain)
  const betterOption = allLoanBenefit >= fullInvestGain ? 'loan' : 'invest'
  const benefitDiff  = Math.abs(allLoanBenefit - fullInvestGain)

  // Effective annualised return from interest saved only (guaranteed component)
  let effectiveLoanReturn = null
  if (maxPrepay > 0 && remainingTenure > 0 && maxInterestSaved > 0) {
    effectiveLoanReturn = (Math.pow(1 + maxInterestSaved / maxPrepay, 1 / remainingTenure) - 1) * 100
  }

  // Break-even invest rate: find r where FV(bulk,r,H)-bulk = maxInterestSaved + freedEmiGain(r)
  // Both sides use the same rate r, so binary search is needed.
  let breakEvenInvestRate = null
  {
    const highInvest = fv(bulkAmount, 60, horizon) - bulkAmount
    const highLoan   = maxInterestSaved + calcFreedEmiGain(baseLoan.emi, 60, fullPrepLoan.totalMonths, baseLoan.totalMonths, horizonMonths)
    if (allLoanBenefit > 0 && horizon > 0 && bulkAmount > 0 && highInvest > highLoan) {
      let lo = 0.01, hi = 60
      for (let i = 0; i < 64; i++) {
        const mid        = (lo + hi) / 2
        const investSide = fv(bulkAmount, mid, horizon) - bulkAmount
        const loanSide   = maxInterestSaved + calcFreedEmiGain(baseLoan.emi, mid, fullPrepLoan.totalMonths, baseLoan.totalMonths, horizonMonths)
        if (investSide < loanSide) lo = mid; else hi = mid
      }
      breakEvenInvestRate = (lo + hi) / 2
    }
  }

  // Break-even loan rate: find lr where interestSaved(lr) + freedEmiGain(investmentReturn, lr) = fullInvestGain
  let breakEvenLoanRate = null
  if (fullInvestGain > 0 && loanBalance > 0 && remainingTenure > 0) {
    let lo = 0.01, hi = 60
    for (let i = 0; i < 64; i++) {
      const mid        = (lo + hi) / 2
      const bBase      = runLoan(loanBalance, mid, remainingTenure, 0)
      const bPrep      = runLoan(loanBalance, mid, remainingTenure, maxPrepay)
      const saved      = Math.max(0, bBase.totalInterest - bPrep.totalInterest)
      const freed      = calcFreedEmiGain(bBase.emi, investmentReturn, bPrep.totalMonths, bBase.totalMonths, horizonMonths)
      const loanBenefit = saved + freed
      if (loanBenefit < fullInvestGain) lo = mid; else hi = mid
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

    const allInterestSaved   = Math.max(0, Math.round(cumBase - cumFull))
    const splitInterestSaved = Math.max(0, Math.round(cumBase - cumSplit))
    const allInvestGain      = Math.round(fv(bulkAmount,    investmentReturn, y) - bulkAmount)
    const splitInvGain       = Math.round(fv(investPortion, investmentReturn, y) - investPortion)

    // Freed EMI gains accumulated to year y
    const yFreedEmiAll   = Math.round(calcFreedEmiGain(baseLoan.emi, investmentReturn, fullPrepLoan.totalMonths, baseLoan.totalMonths, y * 12))
    const yFreedEmiSplit = Math.round(calcFreedEmiGain(baseLoan.emi, investmentReturn, splitLoan.totalMonths,    baseLoan.totalMonths, y * 12))

    // Combined loan path benefit at year y
    const allLoanSaved   = allInterestSaved + yFreedEmiAll
    const splitLoanSaved = splitInterestSaved + yFreedEmiSplit

    const accelClosed = y > Math.ceil(splitLoan.totalMonths / 12)
    const baseClosed  = y > Math.ceil(baseLoan.totalMonths  / 12)

    yearlyData.push({
      year: y,
      allLoanSaved,           // total loan benefit (interest + freed EMI)
      allInterestSaved,       // interest component only
      yFreedEmiAll,           // freed EMI component only
      allInvestGain,
      splitLoanSaved,         // split loan total benefit
      splitInterestSaved,
      yFreedEmiSplit,
      splitInvGain,
      splitTotalBenefit: splitLoanSaved + splitInvGain,
      baseLoanBalance:  baseClosed  ? 0 : Math.round(baseRow?.balance  ?? 0),
      splitLoanBalance: accelClosed ? 0 : Math.round(splitRow?.balance ?? 0),
      splitLoanClosed: accelClosed,
      baseLoanClosed:  baseClosed,
    })
  }

  return {
    emi:                Math.round(baseLoan.emi),
    loanPortion:        Math.round(loanPortion),
    investPortion:      Math.round(investPortion),
    interestSaved:      Math.round(interestSaved),
    monthsSaved,
    maxInterestSaved:   Math.round(maxInterestSaved),
    maxMonthsSaved,
    allFreedEmiGain:    Math.round(allFreedEmiGain),
    allLoanBenefit:     Math.round(allLoanBenefit),
    splitFreedEmiGain:  Math.round(splitFreedEmiGain),
    splitPrepayBenefit: Math.round(splitPrepayBenefit),
    investGain:         Math.round(investGain),
    fullInvestGain:     Math.round(fullInvestGain),
    totalBenefit:       Math.round(totalBenefit),
    betterOption,
    benefitDiff:        Math.round(benefitDiff),
    effectiveLoanReturn,
    breakEvenInvestRate,
    breakEvenLoanRate,
    yearlyData,
    canFullyRepay: bulkAmount >= loanBalance,
    baseLoan,
    splitLoan,
  }
}
