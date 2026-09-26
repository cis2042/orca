/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { AgentStatusEntry } from '../../../../shared/agent-status-types'
import type { TerminalTab } from '../../../../shared/terminal-tab-types'
import { useAppStore } from '../../store'
import { useShuGeneralPaneAura } from './use-shu-general-pane-aura'

describe('useShuGeneralPaneAura', () => {
  it('identifies general aura and reflects working vs idle status', () => {
    useAppStore.setState({
      tabsByWorktree: {
        wt1: [
          {
            id: 'tab-general',
            worktreeId: 'wt1',
            title: '關羽 將軍',
            customTitle: null,
            shellOverride: null,
            launchAgent: null
          } as unknown as TerminalTab
        ]
      },
      ptyIdsByTabId: {
        'tab-general': ['pty-1']
      },
      agentStatusByPaneKey: {},
      runtimePaneTitlesByTabId: {}
    })

    const { result, rerender } = renderHook(() => useShuGeneralPaneAura('wt1', 'tab-general'))
    expect(result.current.generalAura?.general).toBe('關羽')
    expect(result.current.isWorking).toBe(false)

    // When the agent enters working status
    useAppStore.setState({
      agentStatusByPaneKey: {
        'tab-general:0': {
          paneKey: 'tab-general:0',
          state: 'working',
          updatedAt: Date.now(),
          stateStartedAt: Date.now(),
          prompt: 'Refactoring...'
        } as unknown as AgentStatusEntry
      }
    })
    rerender()
    expect(result.current.isWorking).toBe(true)

    // When the agent completes and enters done status
    useAppStore.setState({
      agentStatusByPaneKey: {
        'tab-general:0': {
          paneKey: 'tab-general:0',
          state: 'done',
          updatedAt: Date.now(),
          stateStartedAt: Date.now(),
          prompt: 'Refactoring...'
        } as unknown as AgentStatusEntry
      }
    })
    rerender()
    expect(result.current.isWorking).toBe(false)
  })

  it('returns null generalAura and false isWorking for non-general tabs', () => {
    useAppStore.setState({
      tabsByWorktree: {
        wt1: [
          {
            id: 'tab-normal',
            worktreeId: 'wt1',
            title: 'worker-normal',
            customTitle: null,
            shellOverride: null,
            launchAgent: null
          } as unknown as TerminalTab
        ]
      },
      ptyIdsByTabId: {
        'tab-normal': ['pty-1']
      },
      agentStatusByPaneKey: {}
    })

    const { result } = renderHook(() => useShuGeneralPaneAura('wt1', 'tab-normal'))
    expect(result.current.generalAura).toBeNull()
    expect(result.current.isWorking).toBe(false)
  })
})
