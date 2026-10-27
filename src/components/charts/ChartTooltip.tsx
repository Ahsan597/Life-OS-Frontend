import type { ReactNode } from 'react'

/** Floating readout above a chart position; value first, label second */
export function ChartTooltip({ x, width, value, label }: { x: number; width: number; value: ReactNode; label: ReactNode }) {
  // Keep the box inside the chart near the edges.
  const align = x < 60 ? 'translate-x-0' : x > width - 60 ? '-translate-x-full' : '-translate-x-1/2'
  return (
    <div
      // The focused mark already carries the same text as its accessible name.
      aria-hidden="true"
      data-testid="chart-tooltip"
      className={`pointer-events-none absolute top-0 z-10 flex flex-col rounded-lg border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md ${align}`}
      style={{ left: x }}
    >
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-[12px] text-muted-foreground">{label}</span>
    </div>
  )
}
