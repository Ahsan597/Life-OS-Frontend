import { QueryClientProvider, useMutation } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSaveCheckIn } from '@/hooks/useCheckIns'
import { useArchiveHabit, useLogHabit } from '@/hooks/useHabits'
import { useSetNotificationRead } from '@/hooks/useNotifications'
import { toastMutationError } from '@/lib/mutationFeedback'
import { createQueryClient } from '@/lib/queryClient'
import { API, fakeBackend } from '@/test/fakeBackend'
import { setLoggedIn } from '@/test/renderApp'
import { server } from '@/test/setup'
import { TODAY, freezeTime } from '@/test/time'

// Toasts aren't rendered here (no <Toaster />); record the calls instead.
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), info: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast }))

function setup() {
  const queryClient = createQueryClient({ queries: { retry: false, staleTime: 0 }, mutations: { retry: false } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

beforeEach(() => {
  freezeTime()
  setLoggedIn()
  toast.mockClear()
  toast.error.mockClear()
  toast.success.mockClear()
  toast.info.mockClear()
})

describe('toastMutationError', () => {
  const apiError = (status: number | null, message = 'Nope') => ({ status, message, details: [], retryAfter: null })

  it('toasts the API error message', () => {
    toastMutationError(apiError(500, 'Server exploded'), undefined)
    expect(toast.error).toHaveBeenCalledWith('Server exploded')
  })

  it('skips 429s, which the API client already toasted', () => {
    toastMutationError(apiError(429), undefined)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('skips mutations whose page shows errors inline', () => {
    toastMutationError(apiError(401), { inlineErrors: true })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('falls back to a generic message for errors that are not ApiErrors', () => {
    toastMutationError(new Error('boom'), undefined)
    expect(toast.error).toHaveBeenCalledWith('Something went wrong. Please try again.')
  })
})

describe('mutation feedback', () => {
  it('toasts every failed mutation, even one with no error handler of its own', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(
      () => useMutation({ mutationFn: () => Promise.reject({ status: 500, message: 'Could not save', details: [] }) }),
      { wrapper },
    )

    act(() => result.current.mutate())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not save'))
  })

  it('still confirms an archive after the dialog that started it unmounts', async () => {
    const habit = fakeBackend.seedHabit({ title: 'Read' })
    const { wrapper } = setup()
    const { result, unmount } = renderHook(() => useArchiveHabit(), { wrapper })

    act(() => result.current.mutate(habit))
    unmount()

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Archived “Read”'))
  })

  it('says whether a check-in was saved or updated', async () => {
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useSaveCheckIn(), { wrapper })
    const payload = { date: TODAY, mood: 4, energy: null, sleepHours: null, stressLevel: null, note: null }

    act(() => result.current.mutate(payload))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Check-in saved'))

    await waitFor(() => expect(queryClient.getQueryData(['checkins', 'day', TODAY])).toBeTruthy())
    act(() => result.current.mutate({ ...payload, mood: 5 }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Check-in updated'))
  })

  it('confirms a habit toggle by name, and toasts and rolls back a failed one', async () => {
    const habit = fakeBackend.seedHabit({ title: 'Stretch' })
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(['habits', 'detail', habit.id], { ...habit, today: { date: TODAY, completed: false } })
    const { result } = renderHook(() => useLogHabit(), { wrapper })

    act(() => result.current.mutate({ habitId: habit.id, date: TODAY, completed: true }))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('“Stretch” marked done', { id: `log-${habit.id}-${TODAY}` }),
    )

    server.use(http.post(`${API}/habits/:id/logs`, () => HttpResponse.json({ error: 'Log failed' }, { status: 500 })))
    act(() => result.current.mutate({ habitId: habit.id, date: TODAY, completed: false }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Log failed'))
  })

  it('confirms marking a notification read, but not when opening it marked it', async () => {
    const notification = fakeBackend.seedNotification({ isRead: false })
    const { wrapper } = setup()
    const { result } = renderHook(() => useSetNotificationRead(), { wrapper })

    act(() => result.current.mutate({ notification, isRead: true, quiet: true }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).not.toHaveBeenCalled()

    act(() => result.current.mutate({ notification: { ...notification, isRead: true }, isRead: false }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Marked as unread'))
  })
})
