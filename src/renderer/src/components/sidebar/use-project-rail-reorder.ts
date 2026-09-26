import { useCallback, useState } from 'react'
import { useAppStore } from '@/store'
import type { Repo } from '../../../../shared/repo-types'
import type { ProjectGroup } from '../../../../shared/project-group-types'

export type UseProjectRailReorderParams = {
  repos: readonly Repo[]
  sortedProjectGroups: readonly ProjectGroup[]
}

export function useProjectRailReorder({ repos, sortedProjectGroups }: UseProjectRailReorderParams) {
  const reorderRepos = useAppStore((s) => s.reorderRepos)
  const moveProjectToGroup = useAppStore((s) => s.moveProjectToGroup)
  const updateProjectGroup = useAppStore((s) => s.updateProjectGroup)

  const [draggingRepoId, setDraggingRepoId] = useState<string | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<{
    repoId: string
    position: 'before' | 'after'
  } | null>(null)
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null)

  const handleMoveUp = useCallback(
    (repo: Repo) => {
      const idx = repos.findIndex((r) => r.id === repo.id)
      if (idx <= 0) {
        return
      }
      const next = [...repos]
      const temp = next[idx]
      next[idx] = next[idx - 1]
      next[idx - 1] = temp
      void reorderRepos(next.map((r) => r.id))
    },
    [repos, reorderRepos]
  )

  const handleMoveDown = useCallback(
    (repo: Repo) => {
      const idx = repos.findIndex((r) => r.id === repo.id)
      if (idx === -1 || idx >= repos.length - 1) {
        return
      }
      const next = [...repos]
      const temp = next[idx]
      next[idx] = next[idx + 1]
      next[idx + 1] = temp
      void reorderRepos(next.map((r) => r.id))
    },
    [repos, reorderRepos]
  )

  const handleMoveToTop = useCallback(
    (repo: Repo) => {
      const filtered = repos.filter((r) => r.id !== repo.id)
      void reorderRepos([repo.id, ...filtered.map((r) => r.id)])
    },
    [repos, reorderRepos]
  )

  const handleMoveToBottom = useCallback(
    (repo: Repo) => {
      const filtered = repos.filter((r) => r.id !== repo.id)
      void reorderRepos([...filtered.map((r) => r.id), repo.id])
    },
    [repos, reorderRepos]
  )

  const handleMoveToGroup = useCallback(
    (repo: Repo, groupId: string | null) => {
      void moveProjectToGroup(repo.id, groupId)
    },
    [moveProjectToGroup]
  )

  const handleDragStart = useCallback((e: React.DragEvent, repo: Repo) => {
    e.dataTransfer?.setData('text/plain', repo.id)
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
    }
    setDraggingRepoId(repo.id)
  }, [])

  const handleDragOverItem = useCallback(
    (e: React.DragEvent, repo: Repo) => {
      e.preventDefault()
      e.stopPropagation()
      if (!draggingRepoId || draggingRepoId === repo.id) {
        return
      }

      const rect = e.currentTarget.getBoundingClientRect()
      const isBefore = e.clientY - rect.top < rect.height / 2
      setDragOverTarget({ repoId: repo.id, position: isBefore ? 'before' : 'after' })
    },
    [draggingRepoId]
  )

  const handleDragLeaveItem = useCallback(
    (_e: React.DragEvent, repo: Repo) => {
      if (dragOverTarget?.repoId === repo.id) {
        setDragOverTarget(null)
      }
    },
    [dragOverTarget]
  )

  const handleDropOnItem = useCallback(
    (e: React.DragEvent, targetRepo: Repo) => {
      e.preventDefault()
      e.stopPropagation()
      if (!draggingRepoId || draggingRepoId === targetRepo.id) {
        setDraggingRepoId(null)
        setDragOverTarget(null)
        return
      }

      const sourceRepo = repos.find((r) => r.id === draggingRepoId)
      if (!sourceRepo) {
        setDraggingRepoId(null)
        setDragOverTarget(null)
        return
      }

      const position = dragOverTarget?.position ?? 'after'
      const remaining = repos.filter((r) => r.id !== draggingRepoId)
      const targetIndex = remaining.findIndex((r) => r.id === targetRepo.id)
      if (targetIndex !== -1) {
        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
        remaining.splice(insertIndex, 0, sourceRepo)

        if (sourceRepo.projectGroupId !== targetRepo.projectGroupId) {
          void moveProjectToGroup(sourceRepo.id, targetRepo.projectGroupId ?? null)
        }

        void reorderRepos(remaining.map((r) => r.id))
      }

      setDraggingRepoId(null)
      setDragOverTarget(null)
    },
    [draggingRepoId, dragOverTarget, repos, moveProjectToGroup, reorderRepos]
  )

  const handleDragOverGroupHeader = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverGroupId(groupId)
  }, [])

  const handleDragLeaveGroupHeader = useCallback(
    (_e: React.DragEvent, groupId: string) => {
      if (dragOverGroupId === groupId) {
        setDragOverGroupId(null)
      }
    },
    [dragOverGroupId]
  )

  const handleDropOnGroupHeader = useCallback(
    (e: React.DragEvent, group: ProjectGroup) => {
      e.preventDefault()
      e.stopPropagation()
      if (!draggingRepoId) {
        setDraggingRepoId(null)
        setDragOverGroupId(null)
        return
      }

      const sourceRepo = repos.find((r) => r.id === draggingRepoId)
      if (!sourceRepo) {
        setDraggingRepoId(null)
        setDragOverGroupId(null)
        return
      }

      if (sourceRepo.projectGroupId !== group.id) {
        void moveProjectToGroup(sourceRepo.id, group.id)
      }

      const remaining = repos.filter((r) => r.id !== draggingRepoId)
      const firstGroupItemIndex = remaining.findIndex((r) => r.projectGroupId === group.id)
      if (firstGroupItemIndex !== -1) {
        remaining.splice(firstGroupItemIndex, 0, sourceRepo)
      } else {
        remaining.unshift(sourceRepo)
      }

      void reorderRepos(remaining.map((r) => r.id))
      setDraggingRepoId(null)
      setDragOverGroupId(null)
    },
    [draggingRepoId, repos, moveProjectToGroup, reorderRepos]
  )

  const handleMoveGroupUp = useCallback(
    (group: ProjectGroup) => {
      const idx = sortedProjectGroups.findIndex((g) => g.id === group.id)
      if (idx <= 0) {
        return
      }
      const prevGroup = sortedProjectGroups[idx - 1]
      const t1 = group.tabOrder ?? idx
      const t2 = prevGroup.tabOrder ?? idx - 1
      const newT1 = t1 === t2 ? idx - 1 : t2
      const newT2 = t1 === t2 ? idx : t1
      void updateProjectGroup(group.id, { tabOrder: newT1 })
      void updateProjectGroup(prevGroup.id, { tabOrder: newT2 })
    },
    [sortedProjectGroups, updateProjectGroup]
  )

  const handleMoveGroupDown = useCallback(
    (group: ProjectGroup) => {
      const idx = sortedProjectGroups.findIndex((g) => g.id === group.id)
      if (idx === -1 || idx >= sortedProjectGroups.length - 1) {
        return
      }
      const nextGroup = sortedProjectGroups[idx + 1]
      const t1 = group.tabOrder ?? idx
      const t2 = nextGroup.tabOrder ?? idx + 1
      const newT1 = t1 === t2 ? idx + 1 : t2
      const newT2 = t1 === t2 ? idx : t1
      void updateProjectGroup(group.id, { tabOrder: newT1 })
      void updateProjectGroup(nextGroup.id, { tabOrder: newT2 })
    },
    [sortedProjectGroups, updateProjectGroup]
  )

  return {
    draggingRepoId,
    dragOverTarget,
    dragOverGroupId,
    handleMoveUp,
    handleMoveDown,
    handleMoveToTop,
    handleMoveToBottom,
    handleMoveToGroup,
    handleDragStart,
    handleDragOverItem,
    handleDragLeaveItem,
    handleDropOnItem,
    handleDragOverGroupHeader,
    handleDragLeaveGroupHeader,
    handleDropOnGroupHeader,
    handleMoveGroupUp,
    handleMoveGroupDown
  }
}
