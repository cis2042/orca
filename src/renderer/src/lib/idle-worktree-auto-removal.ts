import type { Worktree } from '../../../shared/worktree/types'

export const IDLE_WORKTREE_AUTO_REMOVAL_DEFAULT_IDLE_MS = 60 * 60 * 1000

export type IdleWorktreeAutoRemovalSnapshot = {
  worktrees: readonly Worktree[]
  activeWorktreeId: string | null
  deletingWorktreeIds: ReadonlySet<string>
  /** Worktrees that still have a live terminal, browser tab, or agent. */
  isActive: (worktreeId: string) => boolean
  /** Worktrees whose removal already failed this session (e.g. uncommitted changes). */
  skippedWorktreeIds: ReadonlySet<string>
  idleMs: number
  now: number
}

/**
 * Pick worktrees that are safe to auto-remove. Removal is never forced, so git
 * still refuses dirty checkouts and unmerged branches are preserved.
 */
export function planIdleWorktreeRemovals(snapshot: IdleWorktreeAutoRemovalSnapshot): Worktree[] {
  return snapshot.worktrees.filter((worktree) => {
    if (worktree.isMainWorktree || worktree.isPinned) {
      return false
    }
    // Why: a workspace owned by another client/runtime is not ours to reap.
    if (worktree.runtimeOwnerEnvironmentId) {
      return false
    }
    if (
      worktree.id === snapshot.activeWorktreeId ||
      snapshot.deletingWorktreeIds.has(worktree.id) ||
      snapshot.skippedWorktreeIds.has(worktree.id)
    ) {
      return false
    }
    const lastTouchedAt = Math.max(worktree.lastActivityAt || 0, worktree.createdAt ?? 0)
    // Why: 0 means activity was never recorded; do not treat unknown age as idle.
    if (lastTouchedAt <= 0 || snapshot.now - lastTouchedAt < snapshot.idleMs) {
      return false
    }
    return !snapshot.isActive(worktree.id)
  })
}
