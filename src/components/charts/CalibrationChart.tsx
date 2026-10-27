import { useState } from 'react'
import { ChartDataTable } from '@/components/charts/ChartDataTable'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { useChartWidth } from '@/components/charts/useChartWidth'
import { formatPercent } from '@/lib/predictions'
import type { CalibrationBucket } from '@/types/predictions'

const HEIGHT = 200
const PAD = { top: 44, right: 8, bottom: 24, left: 40 }
const BAR_MAX = 28
const GAP = 3
const RADIUS = 4

/** Column top with 4px rounded corners, square at the baseline */
function columnPath(x: number, y: number, width: number, height: number) {
  const r = Math.min(RADIUS, height, width / 2)
  return `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`
}

function predictionsLabel(n: number) {
  return `${n} ${n === 1 ? 'forecast' : 'forecasts'}`
}

/**
 * Predicted risk next to the actual miss rate for each risk band; the closer the pair,
 * the better calibrated the forecasts. Bands with no forecasts are left out.
 */
export function CalibrationChart({ buckets }: { buckets: CalibrationBucket[] }) {
  const [ref, width] = useChartWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const shown = buckets.filter((b) => b.predictions > 0)

  const innerW = Math.max(width - PAD.left - PAD.right, 1)
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const band = innerW / Math.max(shown.length, 1)
  const barW = Math.min(BAR_MAX, (band * 0.7 - GAP) / 2)
  const y = (rate: number) => PAD.top + innerH * (1 - rate)
  const center = (i: number) => PAD.left + band * i + band / 2

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-[12px] text-muted-foreground" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary/35" />
          Predicted risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary" />
          Actual miss rate
        </span>
      </div>
      <div ref={ref} className="relative w-full">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Predicted risk compared with actual miss rate, by risk band"
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

          {shown.map((bucket, i) => {
            const predicted = bucket.averagePredictedRisk ?? 0
            const actual = bucket.observedMissRate ?? 0
            return (
              <g
                key={bucket.bucket}
                tabIndex={0}
                role="img"
                data-testid="calibration-group"
                aria-label={`Risk band ${bucket.bucket}: predicted ${formatPercent(bucket.averagePredictedRisk)}, actually missed ${formatPercent(bucket.observedMissRate)}, ${predictionsLabel(bucket.predictions)}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none"
              >
                <rect x={PAD.left + band * i} y={PAD.top} width={band} height={innerH} className="fill-transparent" />
                {predicted > 0 ? (
                  <path d={columnPath(center(i) - barW - GAP / 2, y(predicted), barW, innerH * predicted)} className="fill-primary/35" />
                ) : null}
                {actual > 0 ? (
                  <path
                    d={columnPath(center(i) + GAP / 2, y(actual), barW, innerH * actual)}
                    className={active === i ? 'fill-primary-hover' : 'fill-primary'}
                  />
                ) : null}
                <text x={center(i)} y={HEIGHT - 6} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                  {bucket.bucket}
                </text>
              </g>
            )
          })}
        </svg>
        {active !== null ? (
          <ChartTooltip
            x={center(active)}
            width={width}
            value={`${formatPercent(shown[active].averagePredictedRisk)} predicted · ${formatPercent(shown[active].observedMissRate)} missed`}
            label={`Risk ${shown[active].bucket} · ${predictionsLabel(shown[active].predictions)}`}
          />
        ) : null}
      </div>
      <ChartDataTable
        caption="Calibration: predicted risk and actual miss rate per risk band"
        columns={['Risk band', 'Predicted / actual']}
        rows={shown.map((bucket) => ({
          key: bucket.bucket,
          label: bucket.bucket,
          value: `${formatPercent(bucket.averagePredictedRisk)} / ${formatPercent(bucket.observedMissRate)} (${predictionsLabel(bucket.predictions)})`,
        }))}
      />
    </div>
  )
}
