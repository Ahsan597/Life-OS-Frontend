import { useState } from 'react'
import { ChartDataTable } from '@/components/charts/ChartDataTable'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { useChartWidth } from '@/components/charts/useChartWidth'
import { formatRate } from '@/lib/habits'
import { bucketName, metricLabel } from '@/lib/insights'
import type { Metric } from '@/types/checkIn'
import type { Bucket } from '@/types/insights'

const HEIGHT = 200
const PAD = { top: 44, right: 8, bottom: 24, left: 40 }
const BAR_MAX = 48
const RADIUS = 4

/** Column top with 4px rounded corners, square at the baseline */
function columnPath(x: number, y: number, width: number, height: number) {
  const r = Math.min(RADIUS, height, width / 2)
  return `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`
}

function daysLabel(bucket: Bucket) {
  return `${bucket.days} ${bucket.days === 1 ? 'day' : 'days'}`
}

/** Average habit completion (0–100%) for each band of a check-in metric; empty bands draw as outlines */
export function BucketChart({ metric, buckets }: { metric: Metric; buckets: Bucket[] }) {
  const [ref, width] = useChartWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const innerW = Math.max(width - PAD.left - PAD.right, 1)
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const band = innerW / Math.max(buckets.length, 1)
  const barW = Math.min(BAR_MAX, band * 0.6)
  const y = (rate: number) => PAD.top + innerH * (1 - rate)
  const center = (i: number) => PAD.left + band * i + band / 2

  return (
    <div className="flex flex-col gap-3">
      <div ref={ref} className="relative w-full">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Habit completion by ${metricLabel(metric).toLowerCase()}`}
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

          {buckets.map((bucket, i) => {
            const rate = bucket.averageCompletionRate
            const barH = rate === null ? 0 : innerH * rate
            const x = center(i) - barW / 2
            return (
              <g
                key={bucket.label}
                tabIndex={0}
                role="img"
                aria-label={`${bucketName(metric, bucket.label)}: ${rate === null ? 'no data' : formatRate(rate)}, ${daysLabel(bucket)}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none"
              >
                {/* Hit area: the whole band, not just the painted bar */}
                <rect x={PAD.left + band * i} y={PAD.top} width={band} height={innerH} className="fill-transparent" />
                {rate === null ? (
                  <rect
                    data-testid="empty-bucket"
                    x={x}
                    y={PAD.top}
                    width={barW}
                    height={innerH}
                    rx={RADIUS}
                    strokeDasharray="4 4"
                    className="fill-none stroke-border"
                  />
                ) : barH > 0 ? (
                  <path
                    data-testid="bucket-bar"
                    d={columnPath(x, y(rate), barW, barH)}
                    className={active === i ? 'fill-primary-hover' : 'fill-primary'}
                  />
                ) : null}
                {rate !== null && active === null ? (
                  <text x={center(i)} y={y(rate) - 6} textAnchor="middle" className="fill-foreground text-[12px] font-semibold tabular-nums">
                    {formatRate(rate)}
                  </text>
                ) : null}
                <text x={center(i)} y={HEIGHT - 6} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                  {bucket.label}
                </text>
              </g>
            )
          })}
        </svg>
        {active !== null ? (
          <ChartTooltip
            x={center(active)}
            width={width}
            value={buckets[active].averageCompletionRate === null ? 'No data' : formatRate(buckets[active].averageCompletionRate)}
            label={`${bucketName(metric, buckets[active].label)} · ${daysLabel(buckets[active])}`}
          />
        ) : null}
      </div>
      <ChartDataTable
        caption="Average habit completion per band"
        columns={['Band', 'Completion']}
        rows={buckets.map((bucket) => ({
          key: bucket.label,
          label: bucketName(metric, bucket.label),
          value: `${formatRate(bucket.averageCompletionRate)} (${daysLabel(bucket)})`,
        }))}
      />
    </div>
  )
}
