import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { splitIntoRuns } from '@/components/charts/runs'
import { TrendLineChart } from '@/components/charts/TrendLineChart'
import { WeeklyRateChart } from '@/components/charts/WeeklyRateChart'

const format = (v: number) => `${v} / 5`

describe('splitIntoRuns', () => {
  it('breaks the series at every missing day', () => {
    const runs = splitIntoRuns([
      { date: 'd1', value: 3 },
      { date: 'd2', value: 4 },
      { date: 'd3', value: null },
      { date: 'd4', value: 2 },
      { date: 'd5', value: null },
      { date: 'd6', value: 5 },
      { date: 'd7', value: 1 },
    ])

    expect(runs.map((run) => run.map((p) => p.index))).toEqual([[0, 1], [3], [5, 6]])
  })

  it('returns no runs when every day is missing', () => {
    expect(splitIntoRuns([{ date: 'd1', value: null }])).toEqual([])
  })
})

describe('TrendLineChart', () => {
  const points = [
    { date: '2026-10-14', value: 2 },
    { date: '2026-10-15', value: 3 },
    { date: '2026-10-16', value: null },
    { date: '2026-10-17', value: 4 },
    { date: '2026-10-18', value: null },
    { date: '2026-10-19', value: 4 },
    { date: '2026-10-20', value: 5 },
  ]

  it('draws missing days as gaps: separate lines, and a dot for a lone day', () => {
    render(<TrendLineChart label="Mood" points={points} domain={[1, 5]} format={format} />)

    expect(screen.getAllByTestId('trend-line')).toHaveLength(2)
    expect(screen.getAllByTestId('trend-dot')).toHaveLength(1)
  })

  it('lists only the days with data in the table view', async () => {
    const user = userEvent.setup()
    render(<TrendLineChart label="Mood" points={points} domain={[1, 5]} format={format} />)

    await user.click(screen.getByText('Show data'))
    const rows = within(screen.getByRole('table', { name: 'Mood per day' })).getAllByRole('row')

    expect(rows).toHaveLength(1 + 5) // header + days with a value
    expect(rows[1]).toHaveTextContent('Wed, 14 Oct2 / 5')
  })

  it('reads values with the arrow keys, including empty days', async () => {
    const user = userEvent.setup()
    render(<TrendLineChart label="Mood" points={points} domain={[1, 5]} format={format} />)

    await user.tab() // focuses the chart
    await user.keyboard('{ArrowRight}') // starts from the latest day
    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('5 / 5Tue, 20 Oct')

    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('No check-inSun, 18 Oct')

    await user.tab() // leaving the chart hides the readout
    expect(screen.queryByTestId('chart-tooltip')).not.toBeInTheDocument()
  })

  it('shows the readout for the nearest day under the pointer', () => {
    render(<TrendLineChart label="Mood" points={points} domain={[1, 5]} format={format} />)
    const svg = screen.getByRole('img', { name: /Mood per day/ })

    // jsdom has no layout, so the chart is 640px wide from x = 0; day 0 sits at the left padding.
    fireEvent.pointerMove(svg, { clientX: 32 })
    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('2 / 5Wed, 14 Oct')

    fireEvent.pointerLeave(svg)
    expect(screen.queryByTestId('chart-tooltip')).not.toBeInTheDocument()
  })
})

describe('WeeklyRateChart', () => {
  const weeks = [
    { weekStart: '2026-10-05', scheduled: 7, completed: 7, rate: 1 },
    { weekStart: '2026-10-12', scheduled: 0, completed: 0, rate: null },
    { weekStart: '2026-10-19', scheduled: 1, completed: 0, rate: 0 },
  ]

  it('gives every week an accessible description, even with nothing scheduled', () => {
    render(<WeeklyRateChart weeks={weeks} />)

    expect(screen.getByRole('img', { name: 'Week of 5 Oct: 100%, 7 of 7 done' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Week of 12 Oct: —, Nothing scheduled' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Week of 19 Oct: 0%, 0 of 1 done' })).toBeInTheDocument()
  })

  it('labels the latest week directly and shows a tooltip on focus', async () => {
    const user = userEvent.setup()
    render(<WeeklyRateChart weeks={weeks.slice(0, 1)} />)

    // Direct label on the latest bar
    expect(screen.getByTestId('direct-label')).toHaveTextContent('100%')

    await user.tab()
    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('100%Week of 5 Oct · 7 of 7 done')
  })

  it('has a table view of every week', async () => {
    const user = userEvent.setup()
    render(<WeeklyRateChart weeks={weeks} />)

    await user.click(screen.getByText('Show data'))
    const table = screen.getByRole('table', { name: 'Weekly completion rate' })

    expect(within(table).getAllByRole('row')).toHaveLength(4)
    expect(table).toHaveTextContent('12 Oct— (Nothing scheduled)')
  })
})
