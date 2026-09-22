import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { getAgentStatusEpochNow } from '@/lib/agent-status-epoch-clock'
import { getWorktreeIdsWithLiveAgent, isInactiveWorkspace } from '@/lib/worktree-activity-state'
import {
  IDLE_WORKTREE_AUTO_REMOVAL_DEFAULT_IDLE_MS,
  planIdleWorktreeRemovals
} from '@/lib/idle-worktree-auto-removal'
import {
  getVisibleWorktreeBrowserActivityTabs,
  getVisibleWorktreeTerminalActivityTabs
} from './sidebar/visible-worktree-activity-inputs'
import { toWorktreeRemovalTarget } from '../../../shared/worktree/removal'
import { isGitRepoKind } from '../../../shared/repo-kind'
import { projectGroupIdFromRepoId } from '../../../shared/folder-workspace-worktree'

const SWEEP_INTERVAL_MS = 5 * 60 * 1000

// Why: module-level so a remount does not retry a checkout git already refused.
const skippedWorktreeIds = new Set<string>()
let sweepInFlight = false

async function sweepIdleWorktrees(idleMs: number): Promise<void> {
  if (sweepInFlight) {
    return
  }
  sweepInFlight = true
  try {
    const state = useAppStore.getState()
    const tabsByWorktree = getVisibleWorktreeTerminalActivityTabs(state.tabsByWorktree)
    const browserTabsByWorktree = getVisibleWorktreeBrowserActivityTabs(state.browserTabsByWorktree)
    const liveAgentWorktrees = getWorktreeIdsWithLiveAgent(
      state.agentStatusByPaneKey,
      tabsByWorktree,
      getAgentStatusEpochNow(state.agentStatusEpoch)
    )
    const deletingWorktreeIds = new Set(
      Object.entries(state.deleteStateByWorktreeId)
        .filter(([, deleteState]) => deleteState.isDeleting)
        .map(([key]) => key)
    )
    const candidates = planIdleWorktreeRemovals({
      // Why: folder workspaces are not git worktrees; removing one is not a checkout cleanup.
      worktrees: state.repos
        .filter((repo) => isGitRepoKind(repo) && !projectGroupIdFromRepoId(repo.id))
        .flatMap((repo) => state.worktreesByRepo[repo.id] ?? []),
      activeWorktreeId: state.activeWorktreeId,
      deletingWorktreeIds,
      isActive: (worktreeId) =>
        !isInactiveWorkspace(
          worktreeId,
          tabsByWorktree,
          state.ptyIdsByTabId,
          browserTabsByWorktree,
          liveAgentWorktrees
        ),
      skippedWorktreeIds,
      idleMs,
      now: Date.now()
    })
    for (const worktree of candidates) {
      // Why: never force — git keeps dirty checkouts and unmerged branches survive removal.
      const result = await useAppStore
        .getState()
        .removeWorktree(toWorktreeRemovalTarget(worktree), false, {
          suppressPreservedBranchToast: true
        })
      if (!result.ok) {
        skippedWorktreeIds.add(worktree.id)
        // Why: an automatic attempt should not leave a user-facing delete error on the row.
        useAppStore.getState().clearWorktreeDeleteState(worktree.id, worktree.hostId)
      }
    }
  } catch (err) {
    console.warn('Idle worktree auto-removal failed:', err)
  } finally {
    sweepInFlight = false
  }
}

export function IdleWorktreeAutoRemovalGate(): null {
  const enabled = useAppStore((s) => s.settings?.autoRemoveIdleWorkspaces !== false)
  const idleMs = useAppStore(
    (s) => s.settings?.autoRemoveIdleWorkspacesIdleMs ?? IDLE_WORKTREE_AUTO_REMOVAL_DEFAULT_IDLE_MS
  )
  const workspaceSessionReady = useAppStore((s) => s.workspaceSessionReady)

  useEffect(() => {
    if (!enabled || !workspaceSessionReady) {
      return
    }
    const run = (): void => void sweepIdleWorktrees(idleMs)
    // Why: give restored terminals and agents a moment to report before the first sweep.
    const first = setTimeout(run, 60 * 1000)
    const interval = setInterval(run, SWEEP_INTERVAL_MS)
    return () => {
      clearTimeout(first)
      clearInterval(interval)
    }
  }, [enabled, idleMs, workspaceSessionReady])

  return null
}
