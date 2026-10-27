import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { API, fakeBackend } from '@/test/fakeBackend'
import { renderApp, setLoggedIn } from '@/test/renderApp'
import { server } from '@/test/setup'
import { freezeTime } from '@/test/time'

beforeEach(() => {
  freezeTime()
  setLoggedIn()
  fakeBackend.clearRequests()
})

describe('NewHabitPage', () => {
  it('creates a daily habit and opens it', async () => {
    const { user } = renderApp('/habits/new')

    expect(screen.getByLabelText('Title')).toHaveFocus()
    expect(screen.getByRole('radio', { name: /Daily/ })).toBeChecked()
    await user.type(screen.getByLabelText('Title'), '  Read  ')
    await user.type(screen.getByLabelText('Description (optional)'), '20 pages')
    await user.click(screen.getByRole('button', { name: 'Create habit' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Read' })).toBeInTheDocument()
    // targetDays is only allowed for custom habits, so it isn't sent at all
    expect(fakeBackend.lastBody('POST /habits')).toEqual({ title: 'Read', description: '20 pages', frequency: 'daily' })
  })

  it('creates a habit for specific days, sending them sorted', async () => {
    const { user } = renderApp('/habits/new')

    await user.type(screen.getByLabelText('Title'), 'Gym')
    await user.click(screen.getByRole('radio', { name: /Specific days/ }))
    const days = screen.getByRole('group', { name: 'On which days?' })
    // Mon, Wed, Fri are preselected; drop Wednesday and add Sunday.
    await user.click(within(days).getByRole('button', { name: 'Wednesday' }))
    await user.click(within(days).getByRole('button', { name: 'Sunday' }))
    await user.click(screen.getByRole('button', { name: 'Create habit' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Gym' })).toBeInTheDocument()
    expect(fakeBackend.lastBody('POST /habits')).toMatchObject({ frequency: 'custom', targetDays: [0, 1, 5] })
    expect(screen.getByText('Mon, Fri, Sun')).toBeInTheDocument()
  })

  it('validates before sending anything', async () => {
    const { user } = renderApp('/habits/new')

    await user.click(screen.getByRole('radio', { name: /Specific days/ }))
    for (const day of ['Monday', 'Wednesday', 'Friday']) await user.click(screen.getByRole('button', { name: day }))
    await user.click(screen.getByRole('button', { name: 'Create habit' }))

    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Pick at least one day')).toBeInTheDocument()
    expect(fakeBackend.requests()).toEqual([])
  })

  it('shows server validation errors on the matching field', async () => {
    server.use(
      http.post(`${API}/habits`, () =>
        HttpResponse.json(
          { error: 'Validation failed', details: [{ field: 'title', message: 'That title is taken' }] },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderApp('/habits/new')

    await user.type(screen.getByLabelText('Title'), 'Read{Enter}')

    expect(await screen.findByText('That title is taken')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows other server errors as an alert', async () => {
    server.use(http.post(`${API}/habits`, () => HttpResponse.json({ error: 'Database unavailable' }, { status: 500 })))
    const { user } = renderApp('/habits/new')

    await user.type(screen.getByLabelText('Title'), 'Read{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable')
  })
})

describe('EditHabitPage', () => {
  it('prefills the form and saves the changes', async () => {
    const habit = fakeBackend.seedHabit({ title: 'Gym', description: 'Legs', frequency: 'custom', targetDays: [1, 3] })
    const { user } = renderApp(`/habits/${habit.id}/edit`)

    expect(await screen.findByLabelText('Title')).toHaveValue('Gym')
    expect(screen.getByLabelText('Description (optional)')).toHaveValue('Legs')
    expect(screen.getByRole('radio', { name: /Specific days/ })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Monday' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Tuesday' })).toHaveAttribute('aria-pressed', 'false')

    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Gym session')
    await user.click(screen.getByRole('radio', { name: /Weekly/ }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Gym session' })).toBeInTheDocument()
    expect(screen.getByText('Once a week')).toBeInTheDocument()
    // Switching away from custom clears the target days
    expect(fakeBackend.lastBody(`PUT /habits/${habit.id}`)).toEqual({
      title: 'Gym session',
      description: 'Legs',
      frequency: 'weekly',
      targetDays: null,
    })
    expect(fakeBackend.habit(habit.id)?.targetDays).toBeNull()
  })

  it('shows "not found" for a habit that does not exist', async () => {
    renderApp('/habits/999/edit')

    expect(await screen.findByText('Habit not found')).toBeInTheDocument()
  })
})
