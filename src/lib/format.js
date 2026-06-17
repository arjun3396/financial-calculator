export const RUPEE = '₹'

export function formatINRCommas(n) {
  const x = Math.round(n)
  const sign = x < 0 ? '-' : ''
  const s = String(Math.abs(x))
  if (s.length <= 3) return sign + s
  const last3 = s.slice(-3)
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return sign + rest + ',' + last3
}

export function formatCompact(n) {
  const abs = Math.abs(n)
  if (abs >= 1e7) {
    const cr = n / 1e7
    const v = Math.abs(cr) >= 10 ? Math.round(cr) : Math.round(cr * 10) / 10
    return RUPEE + (v % 1 === 0 ? String(v) : v.toFixed(1)) + 'Cr'
  }
  if (abs >= 1e5) {
    const l = n / 1e5
    const v = Math.abs(l) >= 10 ? Math.round(l) : Math.round(l * 10) / 10
    return RUPEE + (v % 1 === 0 ? String(v) : v.toFixed(1)) + 'L'
  }
  if (abs >= 1000) return RUPEE + Math.round(n / 1000) + 'K'
  return RUPEE + Math.round(n)
}

export function formatRupees(n) {
  return RUPEE + formatINRCommas(n)
}

export function formatMonthly(n) {
  return RUPEE + formatINRCommas(n) + '/mo'
}

// Parses typed input: "2cr" → 20000000, "1.5lakh" → 150000, "2,10,000" → 210000
export function parseRupees(str) {
  if (str == null) return null
  let s = String(str).trim().toLowerCase().replace(/[₹,\s]/g, '').replace('/mo', '')
  if (s === '') return null
  let mult = 1
  if (/(cr|crore|crores)$/.test(s))            { mult = 1e7; s = s.replace(/(cr|crore|crores)$/, '') }
  else if (/(l|lakh|lakhs|lac|lacs)$/.test(s)) { mult = 1e5; s = s.replace(/(l|lakh|lakhs|lac|lacs)$/, '') }
  else if (/k$/.test(s))                        { mult = 1e3; s = s.replace(/k$/, '') }
  const n = parseFloat(s)
  if (Number.isNaN(n)) return null
  return Math.max(0, Math.round(n * mult))
}

export function parseNumber(str) {
  if (str == null) return null
  const s = String(str).replace(/[^0-9.\-]/g, '')
  if (s === '' || s === '-' || s === '.') return null
  const n = parseFloat(s)
  return Number.isNaN(n) ? null : n
}
