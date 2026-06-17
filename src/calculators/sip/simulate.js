// SIP month-by-month simulation.
// Each month: corpus grows at (1 + annualReturn)^(1/12) - 1, then the SIP is added.
// SIP steps up by sipStepUpPercent every stepUpEveryNYears years.
// Periodic lumpsum is injected at the start of every lumpsumEveryNYears-th year.
export function simulate({
  initialLumpsum,
  monthlySIP,
  annualReturn,
  years,
  sipStepUpPercent,
  stepUpEveryNYears,
  periodicLumpsum,
  lumpsumEveryNYears,
}) {
  const rMonthly    = Math.pow(1 + annualReturn / 100, 1 / 12) - 1
  const stepUpFactor = 1 + sipStepUpPercent / 100

  let corpus         = initialLumpsum
  let currentSIP     = monthlySIP
  let totalInvested  = initialLumpsum
  const rows         = []

  for (let y = 1; y <= years; y++) {
    // Step-up SIP at the start of year (y-1) % N === 0 and y > 1
    const isStepUp = sipStepUpPercent > 0 && y > 1 && (y - 1) % stepUpEveryNYears === 0
    if (isStepUp) currentSIP *= stepUpFactor

    // Periodic lumpsum injected at the start of years N, 2N, 3N...
    const hasLumpsum = periodicLumpsum > 0 && y % lumpsumEveryNYears === 0
    let yearInvested = 0

    if (hasLumpsum) {
      corpus       += periodicLumpsum
      yearInvested += periodicLumpsum
    }

    // Monthly: grow corpus, then add SIP
    for (let m = 0; m < 12; m++) {
      corpus       = corpus * (1 + rMonthly) + currentSIP
      yearInvested += currentSIP
    }

    totalInvested += yearInvested

    rows.push({
      year:          y,
      monthlySIP:    currentSIP,
      investedYear:  yearInvested,
      totalInvested,
      corpusEnd:     corpus,
      gain:          corpus - totalInvested,
      isStepUp,
      hasLumpsum,
    })
  }

  const trajectory = [
    { year: 0, corpus: initialLumpsum, invested: initialLumpsum },
    ...rows.map(r => ({ year: r.year, corpus: r.corpusEnd, invested: r.totalInvested })),
  ]

  return {
    rows,
    trajectory,
    finalCorpus:   rows.at(-1).corpusEnd,
    totalInvested: rows.at(-1).totalInvested,
    totalGain:     rows.at(-1).corpusEnd - rows.at(-1).totalInvested,
  }
}

// Binary-search for the minimum monthly SIP (rounded up to nearest ₹500) needed
// to reach goalCorpus in `years`, given all other parameters fixed.
export function findRequiredSIP({
  initialLumpsum,
  annualReturn,
  years,
  sipStepUpPercent,
  stepUpEveryNYears,
  periodicLumpsum,
  lumpsumEveryNYears,
  goalCorpus,
}) {
  const base = simulate({ initialLumpsum, monthlySIP: 0, annualReturn, years, sipStepUpPercent, stepUpEveryNYears, periodicLumpsum, lumpsumEveryNYears })
  if (base.finalCorpus >= goalCorpus) return 0

  let lo = 0, hi = 10_00_000 // ₹10L/mo ceiling
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    const { finalCorpus } = simulate({ initialLumpsum, monthlySIP: mid, annualReturn, years, sipStepUpPercent, stepUpEveryNYears, periodicLumpsum, lumpsumEveryNYears })
    if (finalCorpus >= goalCorpus) hi = mid; else lo = mid
  }
  return Math.ceil(hi / 500) * 500
}
