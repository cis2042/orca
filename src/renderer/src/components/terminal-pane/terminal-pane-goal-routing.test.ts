import { afterEach, describe, expect, it, vi } from 'vitest'

const setTabLayout = vi.fn()
const state = {
  terminalLayoutsByTabId: {} as Record<string, { titlesByLeafId?: Record<string, string> }>,
  setTabLayout
}

vi.mock('@/store', () => ({ useAppStore: { getState: () => state } }))

const {
  registerTerminalPaneGoalHandler,
  resetTerminalPaneGoalRoutingForTests,
  routeTerminalPaneGoal
} = await import('./terminal-pane-goal-routing')

describe('terminal pane goal routing', () => {
  afterEach(() => {
    resetTerminalPaneGoalRoutingForTests()
    setTabLayout.mockReset()
    state.terminalLayoutsByTabId = {}
  })

  it('applies a goal straight to the mounted pane', () => {
    const handler = vi.fn().mockReturnValue(true)
    registerTerminalPaneGoalHandler('tab-1', handler)
    routeTerminalPaneGoal({ tabId: 'tab-1', leafId: 'leaf-1', goal: '修好通知' })
    expect(handler).toHaveBeenCalledWith({ tabId: 'tab-1', leafId: 'leaf-1', goal: '修好通知' })
    expect(setTabLayout).not.toHaveBeenCalled()
  })

  it('stores the goal for an unmounted tab and replays it when the pane mounts', () => {
    state.terminalLayoutsByTabId = { 'tab-2': { titlesByLeafId: { other: 'keep' } } }
    routeTerminalPaneGoal({ tabId: 'tab-2', leafId: 'leaf-2', goal: '開 PR' })
    expect(setTabLayout).toHaveBeenCalledWith('tab-2', {
      titlesByLeafId: { other: 'keep', 'leaf-2': '開 PR' }
    })

    const handler = vi.fn().mockReturnValue(true)
    registerTerminalPaneGoalHandler('tab-2', handler)
    expect(handler).toHaveBeenCalledWith({ tabId: 'tab-2', leafId: 'leaf-2', goal: '開 PR' })

    const later = vi.fn().mockReturnValue(true)
    registerTerminalPaneGoalHandler('tab-2', later)
    expect(later).not.toHaveBeenCalled()
  })

  it('keeps the goal queued while the mounted pane does not have that leaf yet', () => {
    const notYet = vi.fn().mockReturnValue(false)
    registerTerminalPaneGoalHandler('tab-3', notYet)
    routeTerminalPaneGoal({ tabId: 'tab-3', leafId: 'leaf-new', goal: '拆分後的目標' })

    const ready = vi.fn().mockReturnValue(true)
    registerTerminalPaneGoalHandler('tab-3', ready)
    expect(ready).toHaveBeenCalledWith({ tabId: 'tab-3', leafId: 'leaf-new', goal: '拆分後的目標' })
  })

  it('clears a stored goal for an unmounted tab', () => {
    state.terminalLayoutsByTabId = { 'tab-4': { titlesByLeafId: { 'leaf-4': '舊目標' } } }
    routeTerminalPaneGoal({ tabId: 'tab-4', leafId: 'leaf-4', goal: null })
    expect(setTabLayout).toHaveBeenCalledWith('tab-4', { titlesByLeafId: {} })
  })
})
