import { useAppStore } from '../../store'
import { resolveShuGeneralPaneAura, type ShuGeneralPaneAura } from '../a2a/shu-general-pane-aura'
import { resolveTerminalTabActivityStatus } from '../tab-bar/terminal-tab-activity-status'

export function useShuGeneralPaneAura(
  worktreeId: string,
  tabId: string
): {
  generalAura: ShuGeneralPaneAura | null
  isWorking: boolean
} {
  const generalAura = useAppStore((state) => {
    const tab = state.tabsByWorktree[worktreeId]?.find((t) => t.id === tabId)
    const runtimeTitles = state.runtimePaneTitlesByTabId?.[tabId]
    return resolveShuGeneralPaneAura(
      tab?.customTitle,
      tab?.defaultTitle,
      tab?.title,
      tab?.quickCommandLabel,
      tab?.generatedTitle,
      ...(runtimeTitles ? Object.values(runtimeTitles) : [])
    )
  })
  const isWorking = useAppStore((state) => {
    if (!generalAura) {
      return false
    }
    const tab = state.tabsByWorktree[worktreeId]?.find((t) => t.id === tabId)
    if (!tab) {
      return false
    }
    const status = resolveTerminalTabActivityStatus({
      tab,
      agentStatusByPaneKey: state.agentStatusByPaneKey,
      agentStatusEpoch: state.agentStatusEpoch,
      runtimePaneTitlesByTabId: state.runtimePaneTitlesByTabId,
      ptyIdsByTabId: state.ptyIdsByTabId,
      terminalLayout: state.terminalLayoutsByTabId?.[tabId]
    })
    return status === 'working' || status === 'monitoring'
  })

  return { generalAura, isWorking }
}
