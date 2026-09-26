import type { Worktree } from '../../../../shared/worktree/types'
import type { WorktreeStatus } from '@/lib/worktree-status'
import type { ProjectGroup } from '../../../../shared/project-group-types'

export type ProjectRailStatus = 'running' | 'completed' | 'idle'

export type ProjectRailSummary = {
  status: ProjectRailStatus
  runningCount: number
  unreadCount: number
  totalCount: number
}

export const EMPTY_PROJECT_GROUPS: readonly ProjectGroup[] = Object.freeze([])

export function computeProjectRailSummary(
  worktrees: readonly Worktree[],
  statuses: Map<string, WorktreeStatus>
): ProjectRailSummary {
  let runningCount = 0
  let unreadCount = 0

  for (const w of worktrees) {
    const s = statuses.get(w.id)
    if (s === 'working' || s === 'monitoring' || s === 'permission') {
      runningCount++
    }
    if (w.isUnread || s === 'done') {
      unreadCount++
    }
  }

  let status: ProjectRailStatus = 'idle'
  if (runningCount > 0) {
    status = 'running'
  } else if (unreadCount > 0) {
    status = 'completed'
  } else {
    status = 'idle'
  }

  return {
    status,
    runningCount,
    unreadCount,
    totalCount: worktrees.length
  }
}
