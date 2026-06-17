// Month-by-month SWP simulation.
// Each month: corpus grows at (1+cagr)^(1/12) - 1, then the SWP is withdrawn.
// SWP steps up by stepUpPercent every stepUpEveryNYears years.
export function simulate({ initialCorpus, cagr, startMonthlySWP, stepUpEveryNYears, stepUpPercent, years }) {
  const rMonthly = Math.pow(1 + cagr / 100, 1 / 12) - 1
  const stepUpFactor = 1 + stepUpPercent / 100

  let corpus = initialCorpus
  let monthlySWP = startMonthlySWP
  let totalWithdrawn = 0
  let busted = false
  let bustedYear = null
  const rows = []

  for (let y = 1; y <= years; y++) {
    const isStepUp = y > 1 && (y - 1) % stepUpEveryNYears === 0
    if (isStepUp) monthlySWP *= stepUpFactor

    let yearWithdrawn = 0
    for (let m = 0; m < 12; m++) {
      corpus *= (1 + rMonthly)
      const withdrawal = Math.min(corpus, monthlySWP)
      corpus -= withdrawal
      yearWithdrawn += withdrawal
      totalWithdrawn += withdrawal
      if (corpus === 0 && !busted) { busted = true; bustedYear = y }
    }

    rows.push({ year: y, monthlySWP, withdrawnYear: yearWithdrawn, corpusEnd: corpus, isStepUp, busted: busted && corpus === 0 })
  }

  const trajectory = [{ year: 0, corpus: initialCorpus }, ...rows.map(r => ({ year: r.year, corpus: r.corpusEnd }))]
  return { rows, trajectory, finalCorpus: rows.at(-1).corpusEnd, totalWithdrawn, busted, bustedYear }
}

// Binary-search the highest starting monthly SWP (rounded to ₹1000) that still
// leaves finalCorpus >= targetCorpus after `years`.
export function findMaxStartingSWP({ initialCorpus, cagr, stepUpEveryNYears, stepUpPercent, years, targetCorpus }) {
  const base = simulate({ initialCorpus, cagr, startMonthlySWP: 0, stepUpEveryNYears, stepUpPercent, years })
  if (base.finalCorpus < targetCorpus) return null

  let lo = 0, hi = 10_000_000
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    const { finalCorpus } = simulate({ initialCorpus, cagr, startMonthlySWP: mid, stepUpEveryNYears, stepUpPercent, years })
    if (finalCorpus >= targetCorpus) lo = mid; else hi = mid
  }
  return Math.floor(lo / 1000) * 1000
}
