// Layout configuration and helpers to place chairs to approximate the provided plan
// Coordinates are in pixels relative to the .seat-map container (centered on floor)

function toRad(deg) { return (deg * Math.PI) / 180 }

function addCircle(placements, cx, cy, r, n, startDeg = -90) {
  for (let i = 0; i < n; i++) {
    const a = startDeg + (360 / n) * i
    const x = cx + r * Math.cos(toRad(a))
    const y = cy + r * Math.sin(toRad(a))
    placements.push({ x, y, rotate: a + 90 })
  }
}

function addArc(placements, cx, cy, r, startDeg, endDeg, n) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1)
    const a = startDeg + (endDeg - startDeg) * t
    const x = cx + r * Math.cos(toRad(a))
    const y = cy + r * Math.sin(toRad(a))
    placements.push({ x, y, rotate: a + 90 })
  }
}

function addRow(placements, x1, y, x2, n, rotateDeg = 0) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1)
    const x = x1 + (x2 - x1) * t
    placements.push({ x, y, rotate: rotateDeg })
  }
}

function addOpposedRowsForTable(placements, cx, cy, width, height, topCount, bottomCount, marginX = 28, rowGap = 36) {
  const x1 = cx - width / 2 + marginX
  const x2 = cx + width / 2 - marginX
  const yTop = cy - height / 2 - rowGap
  const yBottom = cy + height / 2 + rowGap
  // Top row faces down (toward table)
  addRow(placements, x1, yTop, x2, topCount, 180)
  // Bottom row faces up (toward table)
  addRow(placements, x1, yBottom, x2, bottomCount, 0)
}

export function computeHallLayout(count = 60) {
  const placements = []

  // Top-left round table — 6 chairs
  addCircle(placements, 160, 120, 90, 6)

  // Top-center collaborative table — 6 chairs around
  addCircle(placements, 620, 630, 80, 6)

  // Top-right round table — 6 chairs
  addCircle(placements, 1040, 120, 90, 6)

  // Long tables: split each into two parts and seat people opposite (top vs bottom rows)
  // Keep total counts the same by splitting per table
 // Spread tables vertically to avoid overlaps and extend coverage
  addOpposedRowsForTable(placements, 320, 400, 400, 90, 4, 4) // Left upper long table (8 total)
  addOpposedRowsForTable(placements, 320, 840, 420, 90, 3, 4) // Left lower long table (7 total)
  addOpposedRowsForTable(placements, 900, 400, 400, 90, 4, 4) // Right upper long table (8 total)
  addOpposedRowsForTable(placements, 900, 840, 420, 90, 3, 4) // Right lower long table (7 total)

  // Bottom small round tables — 6 chairs each (left and right)
  addCircle(placements, 300, 1100, 85, 6)
  addCircle(placements, 980, 1100, 85, 6)

  // Ensure exact count and stable indexing
  if (placements.length > count) return placements.slice(0, count)
  if (placements.length < count) {
    const startX = 600, startY = 1240
    const dx = 90, dy = 70
    for (let i = placements.length; i < count; i++) {
      const j = i - placements.length
      const x = startX + dx * (j % 4)
      const y = startY + dy * Math.floor(j / 4)
      placements.push({ x, y, rotate: 0 })
    }
  }
  return placements
}

// Minimal furniture to visually anchor round tables
export const furniture = [
  { type: 'round', x: 160, y: 120, size: 130 },
  { type: 'round', x: 1040, y: 120, size: 130 },
  { type: 'round', x: 620, y: 630, size: 110 },
  // Left upper long table split into two parts
  { type: 'rect', x: 320 - 115, y: 400, width: 210, height: 90 },
  { type: 'rect', x: 320 + 115, y: 400, width: 210, height: 90 },
  // Left lower long table split into two parts
  { type: 'rect', x: 320 - 110, y: 840, width: 200, height: 90 },
  { type: 'rect', x: 320 + 110, y: 840, width: 200, height: 90 },
  // Right upper long table split into two parts
  { type: 'rect', x: 900 - 115, y: 400, width: 210, height: 90 },
  { type: 'rect', x: 900 + 115, y: 400, width: 210, height: 90 },
  // Right lower long table split into two parts
  { type: 'rect', x: 900 - 110, y: 840, width: 200, height: 90 },
  { type: 'rect', x: 900 + 110, y: 840, width: 200, height: 90 },
  { type: 'round', x: 300, y: 1100, size: 120 },
  { type: 'round', x: 980, y: 1100, size: 120 },
]