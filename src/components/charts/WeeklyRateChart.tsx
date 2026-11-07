import { useState } from 'react'
import { ChartDataTable } from '@/components/charts/ChartDataTable'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { columnPath } from '@/components/charts/svg'
import { useChartWidth } from '@/components/charts/useChartWidth'
import { formatDayMonth } from '@/lib/dates'
import { formatRate } from '@/lib/habits'
import type { WeeklyStat } from '@/types/habit'

const HEIGHT = 180
const PAD = { top: 44, right: 8, bottom: 24, left: 40 }
const BAR_MAX = 24

function weekSummary(week: WeeklyStat) {
  return week.scheduled === 0 ? 'Nothing scheduled' : `${week.completed} of ${week.scheduled} done`
}

/** Completion rate per week (Mon–Sun), 0–100% */
export function WeeklyRateChart({ weeks }: { weeks: WeeklyStat[] }) {
  const [ref, width] = useChartWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const innerW = Math.max(width - PAD.left - PAD.right, 1)
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const band = innerW / Math.max(weeks.length, 1)
  const barW = Math.min(BAR_MAX, band * 0.6)
  const y = (rate: number) => PAD.top + innerH * (1 - rate)
  const center = (i: number) => PAD.left + band * i + band / 2
  // Thin out week labels so they never collide (~56px each).
  const labelEvery = Math.ceil(weeks.length / Math.max(Math.floor(innerW / 56), 1))
  const lastWithRate = weeks.findLastIndex((w) => w.rate !== null)

  return (
    <div className="flex flex-col gap-3">
      <div ref={ref} className="relative w-full">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Weekly completion rate, ${weeks.length} weeks`}
          className="block overflow-visible"
        >
          {[0, 0.5, 1].map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} className="stroke-border" />
              <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                {tick * 100}%
              </text>
            </g>
          ))}

          {weeks.map((week, i) => {
            const barH = week.rate === null ? 0 : innerH * week.rate
            const label = `Week of ${formatDayMonth(week.weekStart)}: ${formatRate(week.rate)}, ${weekSummary(week)}`
            return (
              <g
                key={week.weekStart}
                tabIndex={0}
                role="img"
                aria-label={label}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none"
              >
                {/* Hit area: the whole band, not just the painted bar */}
                <rect x={PAD.left + band * i} y={PAD.top} width={band} height={innerH} className="fill-transparent" />
                {barH > 0 ? (
                  <path
                    d={columnPath(center(i) - barW / 2, y(week.rate ?? 0), barW, barH)}
                    className={active === i ? 'fill-primary-hover' : 'fill-primary'}
                  />
                ) : null}
                {i === lastWithRate && active === null ? (
                  <text data-testid="direct-label" x={center(i)} y={y(week.rate ?? 0) - 6} textAnchor="middle" className="fill-foreground text-[12px] font-semibold">
                    {formatRate(week.rate)}
                  </text>
                ) : null}
                {i % labelEvery === 0 ? (
                  <text x={center(i)} y={HEIGHT - 6} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                    {formatDayMonth(week.weekStart)}
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
        {active !== null ? (
          <ChartTooltip
            x={center(active)}
            width={width}
            value={formatRate(weeks[active].rate)}
            label={`Week of ${formatDayMonth(weeks[active].weekStart)} · ${weekSummary(weeks[active])}`}
          />
        ) : null}
      </div>
      <ChartDataTable
        caption="Weekly completion rate"
        columns={['Week of', 'Completion']}
        rows={weeks.map((week) => ({
          key: week.weekStart,
          label: formatDayMonth(week.weekStart),
          value: `${formatRate(week.rate)} (${weekSummary(week)})`,
        }))}
      />
    </div>
  )
}
