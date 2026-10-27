import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { ChartDataTable } from '@/components/charts/ChartDataTable'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { useChartWidth } from '@/components/charts/useChartWidth'
import { splitIntoRuns, type TrendPoint } from '@/components/charts/runs'
import { formatDayMonth, formatWeekdayDayMonth } from '@/lib/dates'

const HEIGHT = 168
const PAD = { top: 48, right: 12, bottom: 24, left: 32 }

interface TrendLineChartProps {
  /** Names the chart, e.g. "Mood" */
  label: string
  /** One entry per day, oldest first */
  points: TrendPoint[]
  domain: [number, number]
  format: (value: number) => string
}

export function TrendLineChart({ label, points, domain, format }: TrendLineChartProps) {
  const [ref, width] = useChartWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const innerW = Math.max(width - PAD.left - PAD.right, 1)
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const [min, max] = domain
  const x = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (innerW * i) / (points.length - 1))
  const y = (v: number) => PAD.top + innerH * (1 - (v - min) / (max - min))
  const ticks = [min, (min + max) / 2, max]
  const runs = splitIntoRuns(points)
  const labelIndexes = points.length > 1 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [0]

  function nearestIndex(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - box.left
    const step = points.length > 1 ? innerW / (points.length - 1) : innerW
    return Math.min(points.length - 1, Math.max(0, Math.round((px - PAD.left) / step)))
  }

  function handleKey(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const delta = event.key === 'ArrowRight' ? 1 : -1
    setActive((current) => Math.min(points.length - 1, Math.max(0, (current ?? points.length - 1) + delta)))
  }

  const activePoint = active === null ? null : points[active]

  return (
    <div className="flex flex-col gap-3">
      <div ref={ref} className="relative w-full">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`${label} per day, ${formatDayMonth(points[0]?.date ?? '')} to ${formatDayMonth(points.at(-1)?.date ?? '')}. Use the arrow keys to read values.`}
          tabIndex={0}
          onPointerMove={(event) => setActive(nearestIndex(event))}
          onPointerLeave={() => setActive(null)}
          onKeyDown={handleKey}
          onBlur={() => setActive(null)}
          className="block touch-pan-y overflow-visible rounded-md outline-none focus-visible:ring-3 focus-visible:ring-focus-ring"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} className="stroke-border" />
              <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                {tick}
              </text>
            </g>
          ))}

          {labelIndexes.map((i, n) => (
            <text
              key={i}
              x={x(i)}
              y={HEIGHT - 6}
              textAnchor={n === 0 ? 'start' : n === labelIndexes.length - 1 ? 'end' : 'middle'}
              className="fill-muted-foreground text-[11px]"
            >
              {formatDayMonth(points[i].date)}
            </text>
          ))}

          {activePoint ? (
            <line x1={x(active!)} x2={x(active!)} y1={PAD.top} y2={PAD.top + innerH} className="stroke-muted-foreground/50" />
          ) : null}

          {runs.map((run) =>
            run.length === 1 ? (
              // A lone day between gaps has no neighbour to connect to: show it as a dot.
              <circle
                key={run[0].index}
                data-testid="trend-dot"
                cx={x(run[0].index)}
                cy={y(run[0].value)}
                r={4}
                className="fill-primary stroke-card"
                strokeWidth={2}
              />
            ) : (
              <polyline
                key={run[0].index}
                data-testid="trend-line"
                points={run.map((p) => `${x(p.index)},${y(p.value)}`).join(' ')}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                className="stroke-primary"
              />
            ),
          )}

          {activePoint?.value != null ? (
            <circle cx={x(active!)} cy={y(activePoint.value)} r={5} className="fill-primary stroke-card" strokeWidth={2} />
          ) : null}
        </svg>
        {activePoint ? (
          <ChartTooltip
            x={x(active!)}
            width={width}
            value={activePoint.value === null ? 'No check-in' : format(activePoint.value)}
            label={formatWeekdayDayMonth(activePoint.date)}
          />
        ) : null}
      </div>
      <ChartDataTable
        caption={`${label} per day`}
        columns={['Date', label]}
        rows={points
          .filter((point) => point.value !== null)
          .map((point) => ({
            key: point.date,
            label: formatWeekdayDayMonth(point.date),
            value: format(point.value!),
          }))}
      />
    </div>
  )
}
