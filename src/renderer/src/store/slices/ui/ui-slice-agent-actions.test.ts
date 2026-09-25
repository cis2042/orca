import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../index'

const SIDEBAR_COLLAPSE_MODE_STORAGE_KEY = 'orca.sidebarCollapseMode.v1'

describe('sidebar agent actions', () => {
  let localStorage: Pick<Storage, 'setItem'>

  beforeEach(() => {
    localStorage = { setItem: vi.fn() }
    vi.stubGlobal('window', { localStorage })
    useAppStore.setState({ sidebarOpen: true, sidebarCollapseMode: 'hidden' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('restores rail mode when collapsing a sidebar stuck in hidden mode', () => {
    useAppStore.getState().toggleSidebar()

    expect(useAppStore.getState().sidebarOpen).toBe(false)
    expect(useAppStore.getState().sidebarCollapseMode).toBe('rail')
    expect(localStorage.setItem).toHaveBeenCalledWith(SIDEBAR_COLLAPSE_MODE_STORAGE_KEY, 'rail')
  })
})
