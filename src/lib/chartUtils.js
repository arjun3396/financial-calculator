export function niceCeil(n) {
  if (n <= 0) return 1
  const exp = Math.floor(Math.log10(n))
  const f = n / Math.pow(10, exp)
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 3 ? 3 : f <= 5 ? 5 : f <= 6 ? 6 : 10
  return nf * Math.pow(10, exp)
}

export function smoothPath(pts) {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2
    const t = 0.18
    d += ` C ${p1[0] + (p2[0] - p0[0]) * t} ${p1[1] + (p2[1] - p0[1]) * t},`
      + ` ${p2[0] - (p3[0] - p1[0]) * t} ${p2[1] - (p3[1] - p1[1]) * t},`
      + ` ${p2[0]} ${p2[1]}`
  }
  return d
}

export function niceXTicks(years) {
  const rawStep = years / 6
  const step = [1, 2, 5, 10, 20, 25, 50].find(s => s >= rawStep) || rawStep
  const ticks = []
  for (let y = 0; y < years; y += step) ticks.push(Math.round(y))
  ticks.push(years)
  return ticks
}
