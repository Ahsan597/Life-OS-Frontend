import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CalendarHeatmap } from '@/components/habits/CalendarHeatmap'
import { HabitCheckButton } from '@/components/habits/HabitCheckButton'
import { StreakBadge } from '@/components/habits/StreakBadge'
import { WeekdayPicker } from '@/components/habits/WeekdayPicker'
import { buildHeatmap } from '@/lib/habits'
import type { Weekday } from '@/types/habit'

describe('WeekdayPicker', () => {
  function Harness({ initial, onChange }: { initial: Weekday[]; onChange: (days: Weekday[]) => void }) {
    const [days, setDays] = useState(initial)
    return (
      <WeekdayPicker
        value={days}
        onChange={(next) => {
          setDays(next)
          onChange(next)
        }}
      />
    )
  }

  it('lists Monday first and keeps the value sorted Sun (0) – Sat (6)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness initial={[3]} onChange={onChange} />)

    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ])

    await user.click(screen.getByRole('button', { name: 'Sunday' }))
    await user.click(screen.getByRole('button', { name: 'Monday' }))
    expect(onChange).toHaveBeenLastCalledWith([0, 1, 3])
    expect(screen.getByRole('button', { name: 'Sunday' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Wednesday' }))
    expect(onChange).toHaveBeenLastCalledWith([0, 1])
  })
})

describe('HabitCheckButton', () => {
  it('is a checkbox named after the habit', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<HabitCheckButton label="Read" checked={false} onToggle={onToggle} />)

    const box = screen.getByRole('checkbox', { name: 'Read' })
    expect(box).not.toBeChecked()
    await user.click(box)
    expect(onToggle).toHaveBeenCalledOnce()
  })
})

describe('StreakBadge', () => {
  it('names the unit by frequency', () => {
    const { rerender } = render(<StreakBadge frequency="daily" streak={4} />)
    expect(screen.getByText(/4 days/)).toBeInTheDocument()

    rerender(<StreakBadge frequency="weekly" streak={1} />)
    expect(screen.getByText(/1 week/)).toBeInTheDocument()
  })
})

describe('CalendarHeatmap', () => {
  const weeks = buildHeatmap({ frequency: 'daily', targetDays: null }, [
    { id: '1', habitId: '1', date: '2026-10-19', completed: true, note: null, createdAt: '' },
  ], { today: '2026-10-20', start: '2026-10-01', weeks: 2 })

  it('labels each day with its status and marks today', () => {
    render(<CalendarHeatmap weeks={weeks} onToggle={() => {}} />)

    expect(screen.getByRole('button', { name: 'Mon, 19 Oct: Done' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Sun, 18 Oct: Missed' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Today, Tue, 20 Oct: Not done yet' })).toBeInTheDocument()
  })

  it('never offers future days', () => {
    render(<CalendarHeatmap weeks={weeks} onToggle={() => {}} />)

    expect(screen.queryByRole('button', { name: /21 Oct/ })).not.toBeInTheDocument()
    // 14 days shown, 5 of them (Wed–Sun) in the future
    expect(screen.getAllByRole('button')).toHaveLength(9)
  })

  it('reports the clicked day', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<CalendarHeatmap weeks={weeks} onToggle={onToggle} />)

    await user.click(screen.getByRole('button', { name: 'Sun, 18 Oct: Missed' }))
    expect(onToggle).toHaveBeenCalledWith({ date: '2026-10-18', status: 'missed', isToday: false })
  })

  it('is read-only without onToggle', () => {
    render(<CalendarHeatmap weeks={weeks} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Mon, 19 Oct: Done' })).toBeInTheDocument()
  })

  it('has a legend', () => {
    render(<CalendarHeatmap weeks={weeks} />)

    expect(screen.getByRole('list', { name: 'Legend' })).toHaveTextContent(/Done.*Missed.*Not scheduled.*Today/)
  })
})
