import { useEffect, useRef } from 'react'
import type { TerminalPaneCloseController } from './use-terminal-pane-close-actions'
import {
  registerTerminalPaneGoalHandler,
  type TerminalPaneGoalRequest
} from './terminal-pane-goal-routing'

export function useTerminalPaneGoalRequests(controller: TerminalPaneCloseController): void {
  const {
    managerRef,
    paneTitlesRef,
    persistLayoutSnapshot,
    removePaneTitle,
    removedTitleLeafIdsRef,
    setPaneTitles,
    tabId
  } = controller
  const latest = useRef({ persistLayoutSnapshot, removePaneTitle, setPaneTitles })
  latest.current = { persistLayoutSnapshot, removePaneTitle, setPaneTitles }

  useEffect(() => {
    const applyGoal = ({ leafId, goal }: TerminalPaneGoalRequest): boolean => {
      const pane = managerRef.current?.getPanes().find((candidate) => candidate.leafId === leafId)
      if (!pane) {
        return false
      }
      if (!goal) {
        if (paneTitlesRef.current[pane.id]) {
          latest.current.removePaneTitle(pane.id)
        }
        return true
      }
      latest.current.setPaneTitles((previous) => ({ ...previous, [pane.id]: goal }))
      paneTitlesRef.current = { ...paneTitlesRef.current, [pane.id]: goal }
      removedTitleLeafIdsRef.current.delete(leafId)
      latest.current.persistLayoutSnapshot()
      return true
    }
    return registerTerminalPaneGoalHandler(tabId, applyGoal)
  }, [managerRef, paneTitlesRef, removedTitleLeafIdsRef, tabId])
}
