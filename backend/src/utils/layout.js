function toRad(deg) { return (deg * Math.PI) / 180 }
function addCircle(placements, cx, cy, r, n, startDeg) {
  for (let i = 0; i < n; i++) {
    const a = (startDeg ?? -90) + (360 / n) * i
    const x = cx + r * Math.cos(toRad(a))
    const y = cy + r * Math.sin(toRad(a))
    placements.push({ x, y, rotate: a + 90 })
  }
}
function addRow(placements, x1, y, x2, n, rotateDeg) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1)
    const x = x1 + (x2 - x1) * t
    placements.push({ x, y, rotate: rotateDeg ?? 0 })
  }
}
function addOpposedRowsForTable(placements, cx, cy, width, height, topCount, bottomCount, marginX, rowGap) {
  const mx = marginX ?? 28
  const rg = rowGap ?? 36
  const x1 = cx - width / 2 + mx
  const x2 = cx + width / 2 - mx
  const yTop = cy - height / 2 - rg
  const yBottom = cy + height / 2 + rg
  addRow(placements, x1, yTop, x2, topCount, 180)
  addRow(placements, x1, yBottom, x2, bottomCount, 0)
}
function computeHallLayout(count) {
  const n = count || 60
  const placements = []
  addCircle(placements, 160, 120, 90, 6)
  addCircle(placements, 620, 630, 80, 6)
  addCircle(placements, 1040, 120, 90, 6)
  addOpposedRowsForTable(placements, 320, 400, 400, 90, 4, 4)
  addOpposedRowsForTable(placements, 320, 840, 420, 90, 3, 4)
  addOpposedRowsForTable(placements, 900, 400, 400, 90, 4, 4)
  addOpposedRowsForTable(placements, 900, 840, 420, 90, 3, 4)
  addCircle(placements, 300, 1100, 85, 6)
  addCircle(placements, 980, 1100, 85, 6)
  if (placements.length > n) return placements.slice(0, n)
  if (placements.length < n) {
    const startX = 600, startY = 1240
    const dx = 90, dy = 70
    for (let i = placements.length; i < n; i++) {
      const j = i - placements.length
      const x = startX + dx * (j % 4)
      const y = startY + dy * Math.floor(j / 4)
      placements.push({ x, y, rotate: 0 })
    }
  }
  return placements
}
function seatsAdjacent(idA, idB, count) {
  const placements = computeHallLayout(count || 60)
  const a = placements[(Number(idA) || 0) - 1]
  const b = placements[(Number(idB) || 0) - 1]
  if (!a || !b) return false
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  return dist <= 130
}
module.exports = { computeHallLayout, seatsAdjacent }