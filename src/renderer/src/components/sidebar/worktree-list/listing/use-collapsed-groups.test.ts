// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useEffectiveCollapsedGroups } from './use-collapsed-groups'
import { getLineageGroupKey } from '../grouping/group-keys'
import type { WorktreeLineage } from '../../../../../../shared/worktree/lineage-types'
import type { Worktree } from '../../../../../../shared/worktree/types'
import type { Repo } from '../../../../../../shared/repo-types'
import type { AppState } from '@/store/types'

describe('useEffectiveCollapsedGroups lineage collapse policy', () => {
  const repo = {
    id: 'repo-1',
    displayName: 'test-repo',
    path: '/path/test-repo',
    badgeColor: '#00aa00',
    addedAt: 0
  } as unknown as Repo
  const repoMap = new Map<string, Repo>([[repo.id, repo]])

  const parent = {
    id: 'wt-parent',
    instanceId: 'inst-parent',
    repoId: repo.id,
    path: '/path/test-repo',
    branch: 'main',
    isMainWorktree: true
  } as unknown as Worktree

  const child = {
    id: 'wt-child',
    instanceId: 'inst-child',
    repoId: repo.id,
    path: '/path/test-repo-child',
    branch: 'feat/child',
    isMainWorktree: false
  } as unknown as Worktree

  const worktreeMap = new Map<string, Worktree>([
    [parent.id, parent],
    [child.id, child]
  ])

  const worktreeLineageById = {
    [child.id]: {
      worktreeId: child.id,
      worktreeInstanceId: 'inst-child',
      parentWorktreeId: parent.id,
      parentWorktreeInstanceId: 'inst-parent',
      origin: 'cli',
      createdAt: Date.now()
    }
  } as unknown as Record<string, WorktreeLineage>

  const defaultArgs = {
    collapsedGroups: new Set<string>(),
    agentSendTargetWorktreeId: null,
    activeWorktreeId: null,
    groupBy: 'none' as const,
    pinnedDisplayPolicy: 'single-location' as const,
    visibleWorktrees: [parent, child],
    repoMap,
    worktreeMap,
    worktreeLineageById,
    prCache: null,
    workspaceStatuses: [],
    settings: {
      autoCollapseLineageChildren: true
    } as unknown as AppState['settings'],
    projectGroups: [],
    projectGrouping: { projects: [], projectHostSetups: [] },
    folderWorkspaces: [],
    defaultHostId: 'local' as const
  }

  it('defaults lineage groups to collapsed when autoCollapseLineageChildren is enabled', () => {
    const { result } = renderHook(() => useEffectiveCollapsedGroups(defaultArgs))
    const parentKey = getLineageGroupKey(parent.id)
    expect(result.current.has(parentKey)).toBe(true)
  })

  it('expands lineage group when user explicitly toggles it', () => {
    const parentKey = getLineageGroupKey(parent.id)
    const { result } = renderHook(() =>
      useEffectiveCollapsedGroups({
        ...defaultArgs,
        collapsedGroups: new Set([parentKey])
      })
    )
    expect(result.current.has(parentKey)).toBe(false)
  })

  it('automatically reveals lineage ancestors when activeWorktreeId is the child', () => {
    const { result } = renderHook(() =>
      useEffectiveCollapsedGroups({
        ...defaultArgs,
        activeWorktreeId: child.id
      })
    )
    const parentKey = getLineageGroupKey(parent.id)
    expect(result.current.has(parentKey)).toBe(false)
  })
})
