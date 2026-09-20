import { useMemo } from 'react'
import type { AppState } from '@/store/types'
import type { ProjectGroup } from '../../../../../../shared/project-group-types'
import type { Repo } from '../../../../../../shared/repo-types'
import type { WorkspaceStatusDefinition, Worktree } from '../../../../../../shared/worktree/types'
import type { WorktreeLineage } from '../../../../../../shared/worktree/lineage-types'
import { PINNED_GROUP_KEY, getLineageGroupKey } from '../grouping/group-keys'
import type { PinnedWorktreeDisplayPolicy, WorktreeGroupBy } from '../grouping/row-types'
import type { ProjectGroupingModel } from '../grouping/project-grouping'
import { getGroupKeysForWorktree } from '../grouping/worktree-group-keys'
import { getFolderWorkspaceRevealGroupKeys } from '../navigation/folder-reveal'
import type { FolderWorkspace } from '../../../../../../shared/folder-workspace-types'
import type { ExecutionHostId } from '../../../../../../shared/execution-host'
import { isPinnedSectionWorktree } from '../../pinned-section-worktrees'
import { getWorktreeLineageAncestors } from '../../worktree-lineage-projection'

// While the agent send picker targets a workspace, force open every section that hides it.
export function useEffectiveCollapsedGroups(args: {
  collapsedGroups: Set<string>
  agentSendTargetWorktreeId: string | null
  activeWorktreeId?: string | null
  groupBy: WorktreeGroupBy
  pinnedDisplayPolicy: PinnedWorktreeDisplayPolicy
  visibleWorktrees: readonly Worktree[]
  repoMap: Map<string, Repo>
  worktreeMap: Map<string, Worktree>
  worktreeLineageById: Record<string, WorktreeLineage>
  prCache: AppState['prCache'] | null
  workspaceStatuses: readonly WorkspaceStatusDefinition[]
  settings: AppState['settings']
  projectGroups: readonly ProjectGroup[]
  projectGrouping: ProjectGroupingModel
  folderWorkspaces: readonly FolderWorkspace[]
  defaultHostId: ExecutionHostId
}): Set<string> {
  const {
    collapsedGroups,
    agentSendTargetWorktreeId,
    activeWorktreeId,
    groupBy,
    pinnedDisplayPolicy,
    visibleWorktrees,
    repoMap,
    worktreeMap,
    worktreeLineageById,
    prCache,
    workspaceStatuses,
    settings,
    projectGroups,
    projectGrouping,
    folderWorkspaces,
    defaultHostId
  } = args
  return useMemo(() => {
    const next = new Set(collapsedGroups)

    // 1. Lineage child workspaces default to collapsed to prevent sidebar clutter.
    // Every parent with lineage children is collapsed by default unless explicitly expanded by the user
    // (where user clicking the lineage toggle registers the parentKey in collapsedGroups to request expansion).
    if (settings?.autoCollapseLineageChildren) {
      const lineages = worktreeLineageById ? Object.values(worktreeLineageById) : []
      for (const lineage of lineages) {
        if (lineage?.parentWorktreeId) {
          const parentKey = getLineageGroupKey(lineage.parentWorktreeId)
          if (collapsedGroups.has(parentKey)) {
            // Explicit user toggle requests expansion
            next.delete(parentKey)
          } else {
            // Default: keep collapsed
            next.add(parentKey)
          }
        }
      }
    }

    const revealTargetId = agentSendTargetWorktreeId ?? activeWorktreeId
    if (!revealTargetId) {
      return next
    }
    const targetWorktree = worktreeMap.get(revealTargetId)
    if (!targetWorktree) {
      const folderKeys = getFolderWorkspaceRevealGroupKeys(
        revealTargetId,
        folderWorkspaces,
        projectGroups,
        { groupBy, workspaceStatuses, defaultHostId }
      )
      if (folderKeys.length === 0) {
        return next
      }
      for (const groupKey of folderKeys) {
        next.delete(groupKey)
      }
      return next
    }
    if (
      pinnedDisplayPolicy === 'single-location' &&
      isPinnedSectionWorktree(targetWorktree, visibleWorktrees, worktreeLineageById, worktreeMap)
    ) {
      next.delete(PINNED_GROUP_KEY)
    } else {
      for (const groupKey of getGroupKeysForWorktree(
        groupBy,
        targetWorktree,
        repoMap,
        prCache,
        workspaceStatuses,
        settings,
        projectGroups,
        projectGrouping
      )) {
        next.delete(groupKey)
      }
    }

    for (const parent of getWorktreeLineageAncestors(
      targetWorktree,
      worktreeLineageById,
      worktreeMap
    )) {
      next.delete(getLineageGroupKey(parent.id))
    }
    return next
  }, [
    activeWorktreeId,
    agentSendTargetWorktreeId,
    collapsedGroups,
    groupBy,
    pinnedDisplayPolicy,
    visibleWorktrees,
    prCache,
    projectGroups,
    projectGrouping,
    repoMap,
    settings,
    workspaceStatuses,
    worktreeLineageById,
    worktreeMap,
    folderWorkspaces,
    defaultHostId
  ])
}
