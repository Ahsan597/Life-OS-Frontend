export interface TrendPoint {
  date: string
  /** null = no data that day: drawn as a gap, never as zero */
  value: number | null
}

/** Runs of consecutive days with data; each becomes its own line so gaps stay visible */
export function splitIntoRuns(points: TrendPoint[]) {
  const runs: { index: number; value: number }[][] = []
  let run: { index: number; value: number }[] = []
  points.forEach((point, index) => {
    if (point.value === null) {
      if (run.length) runs.push(run)
      run = []
    } else {
      run.push({ index, value: point.value })
    }
  })
  if (run.length) runs.push(run)
  return runs
}
