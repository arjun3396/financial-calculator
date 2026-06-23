// FIRE simulation: accumulation phase + distribution phase.
//
// Accumulation: monthly compounding at preReturnRate, with step-up savings.
// FIRE Number: inflation-adjusted annual expenses at FIRE age / SWR.
// Distribution: monthly compounding at postReturnRate, inflation-growing withdrawals.
// Coast FIRE: first year where corpus alone (no new contributions) will reach fireNumber by fireAge.

export function simulate({
  currentAge,
  fireAge,
  currentCorpus,
  monthlyExpenses,
  inflationRate,
  swr,
  monthlySavings,
  savingsStepUp,
  preReturnRate,
  postReturnRate,
  lifeExpectancy,
}) {
  const yearsToFIRE  = Math.max(1, fireAge - currentAge)
  const postFIREYears = Math.max(0, lifeExpectancy - fireAge)

  // Expenses are inflation-adjusted to the moment of FIRE
  const annualExpensesAtFIRE = monthlyExpenses * 12 * Math.pow(1 + inflationRate / 100, yearsToFIRE)
  const fireNumber = annualExpensesAtFIRE / (swr / 100)

  // ── Accumulation ──────────────────────────────────────────────
  const rMonthlyPre = Math.pow(1 + preReturnRate / 100, 1 / 12) - 1
  const stepFactor  = 1 + savingsStepUp / 100

  let corpus         = currentCorpus
  let currentSavings = monthlySavings
  let totalSaved     = currentCorpus

  const accRows = []
  let actualFIREAge  = currentCorpus >= fireNumber ? currentAge : null
  let coastFIREAge   = null

  for (let y = 1; y <= yearsToFIRE; y++) {
    const age = currentAge + y
    if (savingsStepUp > 0 && y > 1) currentSavings *= stepFactor

    let yearSaved = 0
    for (let m = 0; m < 12; m++) {
      corpus     = corpus * (1 + rMonthlyPre) + currentSavings
      yearSaved += currentSavings
    }
    totalSaved += yearSaved

    // Coast FIRE: can we stop contributing now and still reach fireNumber?
    if (coastFIREAge === null) {
      const yearsLeft     = yearsToFIRE - y
      const coastProjected = corpus * Math.pow(1 + preReturnRate / 100, yearsLeft)
      if (coastProjected >= fireNumber) coastFIREAge = age
    }

    if (actualFIREAge === null && corpus >= fireNumber) actualFIREAge = age

    accRows.push({
      year:              y,
      age,
      monthlySavings:    currentSavings,
      savedYear:         yearSaved,
      totalSaved,
      corpus,
      fireTarget:        fireNumber,
      gap:               Math.max(0, fireNumber - corpus),
      progressPercent:   Math.min(100, (corpus / fireNumber) * 100),
      isFIRE:            corpus >= fireNumber,
    })
  }

  const corpusAtFIRE = accRows.at(-1)?.corpus ?? currentCorpus

  // ── Distribution ──────────────────────────────────────────────
  const rMonthlyPost = Math.pow(1 + postReturnRate / 100, 1 / 12) - 1
  let distCorpus     = corpusAtFIRE
  let annualExp      = annualExpensesAtFIRE

  const distRows = []
  let portfolioSurvivalAge = lifeExpectancy

  for (let y = 1; y <= postFIREYears; y++) {
    const age              = fireAge + y
    const monthlyWithdrawal = annualExp / 12
    let busted             = false

    for (let m = 0; m < 12; m++) {
      distCorpus = distCorpus * (1 + rMonthlyPost) - monthlyWithdrawal
      if (distCorpus <= 0) { distCorpus = 0; busted = true; break }
    }

    annualExp *= 1 + inflationRate / 100

    distRows.push({
      year:             y,
      age,
      monthlyWithdrawal,
      annualWithdrawal: monthlyWithdrawal * 12,
      corpus:           distCorpus,
      busted,
    })

    if (busted) { portfolioSurvivalAge = age - 1; break }
  }

  // ── Trajectory for chart ──────────────────────────────────────
  const trajectory = [
    { age: currentAge, corpus: currentCorpus, phase: 'accumulation', invested: currentCorpus },
    ...accRows.map(r => ({
      age:   r.age,
      corpus: r.corpus,
      phase: 'accumulation',
      invested: r.totalSaved,
    })),
  ]
  distRows.forEach(r => {
    trajectory.push({ age: r.age, corpus: r.corpus, phase: 'distribution', invested: 0 })
  })

  return {
    fireNumber,
    annualExpensesAtFIRE,
    yearsToFIRE,
    actualFIREAge,
    coastFIREAge,
    portfolioSurvivalAge,
    corpusAtFIRE,
    totalSaved,
    accRows,
    distRows,
    trajectory,
  }
}

// Binary-search for the minimum monthly savings to reach fireNumber by fireAge.
export function findRequiredSavings({
  currentAge, fireAge, currentCorpus,
  monthlyExpenses, inflationRate, swr,
  savingsStepUp, preReturnRate, postReturnRate,
  lifeExpectancy, fireNumber,
}) {
  const base = simulate({
    currentAge, fireAge, currentCorpus,
    monthlyExpenses, inflationRate, swr,
    monthlySavings: 0, savingsStepUp,
    preReturnRate, postReturnRate, lifeExpectancy,
  })
  if (base.corpusAtFIRE >= fireNumber) return 0

  let lo = 0, hi = 50_00_000
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2
    const { corpusAtFIRE } = simulate({
      currentAge, fireAge, currentCorpus,
      monthlyExpenses, inflationRate, swr,
      monthlySavings: mid, savingsStepUp,
      preReturnRate, postReturnRate, lifeExpectancy,
    })
    if (corpusAtFIRE >= fireNumber) hi = mid; else lo = mid
  }
  return Math.ceil(hi / 500) * 500
}
