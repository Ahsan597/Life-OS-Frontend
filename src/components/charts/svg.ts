/** Column with 4px rounded top corners, square at the baseline */
export function columnPath(x: number, y: number, width: number, height: number, radius = 4) {
  const r = Math.min(radius, height, width / 2)
  return `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`
}
