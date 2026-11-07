import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

let shouldThrow = true

function Flaky() {
  if (shouldThrow) throw new Error('boom')
  return <p>All good</p>
}

beforeEach(() => {
  shouldThrow = true
  // React logs caught render errors; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => vi.restoreAllMocks())

describe('ErrorBoundary', () => {
  it('shows a recovery screen instead of a blank page', () => {
    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })

  it('renders the page again after "Try again" once the cause is gone', async () => {
    const user = userEvent.setup()
    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    )

    shouldThrow = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('resets when its key changes (a new route)', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [route, setRoute] = useState('a')
      return (
        <>
          <button onClick={() => setRoute('b')}>Go</button>
          <ErrorBoundary key={route}>
            <Flaky />
          </ErrorBoundary>
        </>
      )
    }
    render(<Harness />)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    shouldThrow = false
    await user.click(screen.getByRole('button', { name: 'Go' }))

    expect(screen.getByText('All good')).toBeInTheDocument()
  })
})
