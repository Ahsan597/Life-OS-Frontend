import { beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from '@/store/uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ sidebarCollapsed: false })
  })

  it('starts with the sidebar expanded', () => {
    expect(useUiStore.getState().sidebarCollapsed).toBe(false)
  })

  it('toggleSidebar flips the collapsed state back and forth', () => {
    useUiStore.getState().toggleSidebar()
    expect(useUiStore.getState().sidebarCollapsed).toBe(true)

    useUiStore.getState().toggleSidebar()
    expect(useUiStore.getState().sidebarCollapsed).toBe(false)
  })

  it('persists the choice to localStorage so it survives a reload', () => {
    useUiStore.getState().toggleSidebar()

    const saved = JSON.parse(localStorage.getItem('lifeos-ui') ?? '{}')
    expect(saved.state.sidebarCollapsed).toBe(true)
  })
})
