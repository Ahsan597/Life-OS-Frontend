import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBackend } from '@/test/fakeBackend'
import { renderApp, setLoggedIn } from '@/test/renderApp'
import { freezeTime } from '@/test/time'

beforeEach(() => {
  freezeTime()
  setLoggedIn()
})

describe('HabitsPage', () => {
  it('lists active habits with their schedule, streak and today status', async () => {
    fakeBackend.seedHabit({ title: 'Read' }, { done: ['2026-10-19'] })
    fakeBackend.seedHabit({ title: 'Gym', frequency: 'custom', targetDays: [1, 3, 5] })
    fakeBackend.seedHabit({ title: 'Old habit', isActive: false })
    renderApp('/habits')

    const list = await screen.findByRole('list', { name: 'Active habits' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Read')
    expect(rows[0]).toHaveTextContent('Every day · Not done today')
    expect(rows[0]).toHaveTextContent('1 day')
    expect(rows[1]).toHaveTextContent('Mon, Wed, Fri') // not scheduled on Tuesday, so no today status
    expect(rows[1]).not.toHaveTextContent('today')
    expect(screen.queryByText('Old habit')).not.toBeInTheDocument()
  })

  it('shows an empty state with no habits', async () => {
    renderApp('/habits')

    expect(await screen.findByText('No active habits')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create a habit' })).toHaveAttribute('href', '/habits/new')
  })

  it('shows archived habits on request and restores one', async () => {
    fakeBackend.seedHabit({ title: 'Read' })
    const old = fakeBackend.seedHabit({ title: 'Old habit', isActive: false })
    const { user } = renderApp('/habits')

    await screen.findByRole('list', { name: 'Active habits' })
    await user.click(screen.getByRole('checkbox', { name: 'Show archived' }))

    const archived = await screen.findByRole('list', { name: 'Archived habits' })
    expect(within(archived).getByText('Old habit')).toBeInTheDocument()
    expect(fakeBackend.requests()).toContain('GET /habits?includeArchived=true')

    await user.click(within(archived).getByRole('button', { name: 'Restore' }))

    await waitFor(() => expect(fakeBackend.habit(old.id)?.isActive).toBe(true))
    expect(fakeBackend.lastBody(`PUT /habits/${old.id}`)).toEqual({ isActive: true })
    const active = await screen.findByRole('list', { name: 'Active habits' })
    expect(await within(active).findByText('Old habit')).toBeInTheDocument()
    expect(screen.getByText('No archived habits.')).toBeInTheDocument()
  })

  it('archives a habit after confirmation', async () => {
    const read = fakeBackend.seedHabit({ title: 'Read' })
    fakeBackend.seedHabit({ title: 'Walk' })
    const { user } = renderApp('/habits')

    await user.click(await screen.findByRole('button', { name: 'Archive Read' }))
    const dialog = await screen.findByRole('dialog', { name: 'Archive “Read”?' })
    expect(dialog).toHaveTextContent('history and streaks are kept')

    await user.click(within(dialog).getByRole('button', { name: 'Archive habit' }))

    await waitFor(() => expect(screen.queryByText('Read')).not.toBeInTheDocument())
    expect(fakeBackend.habit(read.id)?.isActive).toBe(false)
    expect(fakeBackend.count(`DELETE /habits/${read.id}`)).toBe(1)
    expect(screen.getByText('Walk')).toBeInTheDocument()
  })

  it('does nothing when the archive is cancelled', async () => {
    const read = fakeBackend.seedHabit({ title: 'Read' })
    const { user } = renderApp('/habits')

    await user.click(await screen.findByRole('button', { name: 'Archive Read' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(fakeBackend.count(`DELETE /habits/${read.id}`)).toBe(0)
    expect(screen.getByText('Read')).toBeInTheDocument()
  })

  it('links each habit to its detail and edit pages', async () => {
    const read = fakeBackend.seedHabit({ title: 'Read' })
    renderApp('/habits')

    expect(await screen.findByRole('link', { name: /^Read/ })).toHaveAttribute('href', `/habits/${read.id}`)
    expect(screen.getByRole('link', { name: 'Edit Read' })).toHaveAttribute('href', `/habits/${read.id}/edit`)
  })
})

describe('HabitsPage – streak risk', () => {
  it('badges at-risk habits from one shared forecast request', async () => {
    freezeTime()
    const gym = fakeBackend.seedHabit({ title: 'Gym' })
    fakeBackend.seedForecast(gym.id, { currentStreak: 0, riskLevel: 'high', riskScore: 0.8, completionProbability: 0.2 })
    fakeBackend.seedHabit({ title: 'Read' })
    renderApp('/habits')

    expect(await screen.findByRole('button', { name: 'At risk: Gym. Show why' })).toHaveTextContent('At risk')
    expect(screen.queryByRole('button', { name: /Read\. Show why/ })).not.toBeInTheDocument()
    expect(fakeBackend.count('GET /predictions/streak-risk')).toBe(1)
  })
})
