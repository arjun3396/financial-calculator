// EMI amortization simulation.
// Runs two parallel scenarios — base (no prepayments) and accelerated (with prepayments) —
// so the UI can show savings in interest and time.
//
// Prepayment types that stack:
//   extraMonthly     — fixed extra amount every month (reduces principal directly)
//   extraEMIsPerYear — N extra full-EMI-equivalents per year, spread as monthly top-up
//   annualLumpsum    — large payment once per year starting from lumpsumStartYear
//   oneTimeBulk      — single large payment at bulkAtMonth

export function calculateEMI(principal, annualRate, tenureMonths) {
  if (annualRate === 0) return principal / tenureMonths
  const r = annualRate / 100 / 12
  return (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1)
}

function runAmortization({
  principal, r, emi, tenureMonths,
  extraMonthly, annualLumpsum, lumpsumStartYear, oneTimeBulk, bulkAtMonth,
}) {
  let balance      = principal
  let totalInterest = 0
  let totalPrepaid  = 0
  const monthlyRows = []

  for (let m = 1; m <= tenureMonths && balance > 0.5; m++) {
    const year = Math.ceil(m / 12)

    // Standard EMI split
    const interest = balance * r
    const principalPaid = Math.min(emi - interest, balance)
    if (principalPaid <= 0) break   // rate so high EMI can't cover interest
    balance -= principalPaid
    totalInterest += interest

    // Prepayments
    let prepay = extraMonthly
    if (oneTimeBulk > 0 && m === bulkAtMonth)                                prepay += oneTimeBulk
    if (annualLumpsum > 0 && m % 12 === 0 && year >= lumpsumStartYear)       prepay += annualLumpsum
    prepay = Math.min(prepay, balance)
    balance -= prepay
    totalPrepaid += prepay

    monthlyRows.push({
      month: m,
      year,
      emi: emi,
      interest,
      principalPaid,
      prepay,
      balance: Math.max(0, balance),
      cumulativeInterest: totalInterest,
    })

    if (balance <= 0.5) { balance = 0; break }
  }

  // Aggregate into year-level rows
  const yearMap = {}
  for (const r of monthlyRows) {
    if (!yearMap[r.year]) yearMap[r.year] = { year: r.year, emiTotal: 0, prepayTotal: 0, principalTotal: 0, interestTotal: 0, balance: 0 }
    const y = yearMap[r.year]
    y.emiTotal      += r.emi
    y.prepayTotal   += r.prepay
    y.principalTotal += r.principalPaid
    y.interestTotal  += r.interest
    y.balance        = r.balance
  }
  const yearlyRows = Object.values(yearMap)

  // Build balance trajectory (year-level, plus year 0)
  const trajectory = [{ year: 0, balance: principal }]
  for (const yr of yearlyRows) trajectory.push({ year: yr.year, balance: yr.balance })

  return {
    monthlyRows,
    yearlyRows,
    trajectory,
    totalInterest: Math.round(totalInterest),
    totalPrepaid:  Math.round(totalPrepaid),
    totalMonths:   monthlyRows.length,
    closedEarly:   monthlyRows.length < tenureMonths,
  }
}

export function simulate({
  principal,
  annualRate,
  tenureYears,
  extraMonthly      = 0,
  extraEMIsPerYear  = 0,
  annualLumpsum     = 0,
  lumpsumStartYear  = 1,
  oneTimeBulk       = 0,
  bulkAtMonth       = 12,
}) {
  const tenureMonths = tenureYears * 12
  const r   = annualRate / 100 / 12
  const emi = calculateEMI(principal, annualRate, tenureMonths)

  // "extra EMIs per year" spreads N full EMIs over 12 months as a monthly top-up
  const effectiveExtraMonthly = extraMonthly + (emi * extraEMIsPerYear / 12)

  const base = runAmortization({
    principal, r, emi, tenureMonths,
    extraMonthly: 0, annualLumpsum: 0, lumpsumStartYear: 1, oneTimeBulk: 0, bulkAtMonth: 0,
  })

  const accel = runAmortization({
    principal, r, emi, tenureMonths,
    extraMonthly: effectiveExtraMonthly,
    annualLumpsum, lumpsumStartYear,
    oneTimeBulk, bulkAtMonth,
  })

  const interestSaved  = base.totalInterest - accel.totalInterest
  const monthsSaved    = base.totalMonths   - accel.totalMonths
  const totalPrepaid   = accel.totalPrepaid

  return {
    emi,
    effectiveExtraMonthly,
    base,
    accel,
    interestSaved,
    monthsSaved,
    totalPrepaid,
    tenureMonths,
  }
}
