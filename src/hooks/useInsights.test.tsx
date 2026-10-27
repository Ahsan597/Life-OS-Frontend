import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSaveCheckIn } from '@/hooks/useCheckIns'
import { useCreateHabit, useLogHabit } from '@/hooks/useHabits'
import { insightKeys } from '@/hooks/useInsights'
import { fakeBackend } from '@/test/fakeBackend'
import { setLoggedIn } from '@/test/renderApp'
import { TODAY, freezeTime } from '@/test/time'

const CORRELATIONS = insightKeys.correlations('2026-07-22', '2026-10-19')
const PENDING = insightKeys.recommendations('pending')

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  // Cached but unobserved, so invalidation marks them stale without refetching.
  queryClient.setQueryData(CORRELATIONS, { highlights: [] })
  queryClient.setQueryData(PENDING, [])
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const isStale = () => [CORRELATIONS, PENDING].map((key) => queryClient.getQueryState(key)?.isInvalidated)
  return { wrapper, isStale }
}

beforeEach(() => {
  freezeTime()
  setLoggedIn()
})

describe('insights cache refresh', () => {
  it('invalidates correlations and recommendations after a habit log', async () => {
    const habit = fakeBackend.seedHabit()
    const { wrapper, isStale } = setup()
    const { result } = renderHook(() => useLogHabit(), { wrapper })

    act(() => result.current.mutate({ habitId: habit.id, date: TODAY, completed: true }))

    await waitFor(() => expect(isStale()).toEqual([true, true]))
  })

  it('invalidates them after a check-in', async () => {
    const { wrapper, isStale } = setup()
    const { result } = renderHook(() => useSaveCheckIn(), { wrapper })

    act(() =>
      result.current.mutate({ date: TODAY, mood: 4, energy: null, sleepHours: null, stressLevel: null, note: null }),
    )

    await waitFor(() => expect(isStale()).toEqual([true, true]))
  })

  it('invalidates them after creating a habit', async () => {
    const { wrapper, isStale } = setup()
    const { result } = renderHook(() => useCreateHabit(), { wrapper })

    act(() => result.current.mutate({ title: 'Stretch', description: null, frequency: 'daily' }))

    await waitFor(() => expect(isStale()).toEqual([true, true]))
  })
})
