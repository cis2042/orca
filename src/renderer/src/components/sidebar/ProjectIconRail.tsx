import React, { useCallback, useMemo } from 'react'
import { PanelLeftOpen, Settings, Zap } from 'lucide-react'
import { useA2AStore } from '@/store/a2a-traces-store'
import { useAppStore } from '@/store'
import { useAllWorktrees } from '@/store/selectors'
import { useWorktreeActivityStatuses } from './use-worktree-activity-statuses'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { useProjectGroupDialogs } from './worktree-list/rows/use-project-group-dialogs'
import { ProjectGroupNameDialog } from './ProjectGroupNameDialog'
import { ProjectGroupDeleteDialog } from './ProjectGroupDeleteDialog'
import { getProjectGroupHeaderKey } from './worktree-list/grouping/group-keys'
import { ProjectRailItem } from './project-rail-item'
import { ProjectRailGroupHeader, UngroupedDivider } from './project-rail-group-header'
import { EMPTY_PROJECT_GROUPS } from './project-rail-types'
import { useProjectRailReorder } from './use-project-rail-reorder'
import type { Repo } from '../../../../shared/repo-types'

export type { ProjectRailStatus, ProjectRailSummary } from './project-rail-types'
export { computeProjectRailSummary } from './project-rail-types'

export function ProjectIconRail(): React.JSX.Element {
  const repos = useAppStore((s) => s.repos)
  const rawProjectGroups = useAppStore((s) => s.projectGroups)
  const projectGroups = rawProjectGroups ?? EMPTY_PROJECT_GROUPS
  const collapsedGroups = useAppStore((s) => s.collapsedGroups)
  const toggleCollapsedGroup = useAppStore((s) => s.toggleCollapsedGroup)

  const allWorktrees = useAllWorktrees()
  const activeWorktreeId = useAppStore((s) => s.activeWorktreeId)
  const setActiveWorktree = useAppStore((s) => s.setActiveWorktree)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const openSettingsPage = useAppStore((s) => s.openSettingsPage)

  const allWorktreeIds = useMemo(() => allWorktrees.map((w) => w.id), [allWorktrees])
  const statuses = useWorktreeActivityStatuses(allWorktreeIds)

  const repoMap = useMemo(() => new Map(repos.map((r) => [r.id, r])), [repos])
  const dialogs = useProjectGroupDialogs({ repos, repoMap, projectGroups })

  const worktreesByRepoId = useMemo(() => {
    const map = new Map<string, typeof allWorktrees>()
    for (const w of allWorktrees) {
      const list = map.get(w.repoId) ?? []
      list.push(w)
      map.set(w.repoId, list)
    }
    return map
  }, [allWorktrees])

  const activeRepoId = useMemo(() => {
    if (!activeWorktreeId) {
      return null
    }
    const current = allWorktrees.find((w) => w.id === activeWorktreeId)
    return current?.repoId ?? null
  }, [activeWorktreeId, allWorktrees])

  // Sort groups by tabOrder
  const sortedProjectGroups = useMemo(() => {
    return [...projectGroups].sort(
      (a, b) => a.tabOrder - b.tabOrder || a.name.localeCompare(b.name)
    )
  }, [projectGroups])

  // Drag and drop & reordering state and handlers
  const reorder = useProjectRailReorder({
    repos,
    sortedProjectGroups
  })

  // Partition repos into groups vs ungrouped
  const reposByGroupId = useMemo(() => {
    const groupMap = new Map(projectGroups.map((g) => [g.id, g]))
    const grouped = new Map<string, Repo[]>()
    for (const g of projectGroups) {
      grouped.set(g.id, [])
    }
    const ungrouped: Repo[] = []
    for (const repo of repos) {
      if (repo.projectGroupId && groupMap.has(repo.projectGroupId)) {
        grouped.get(repo.projectGroupId)!.push(repo)
      } else {
        ungrouped.push(repo)
      }
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => (a.projectGroupOrder ?? 0) - (b.projectGroupOrder ?? 0))
    }
    return { grouped, ungrouped }
  }, [repos, projectGroups])

  const handleActivateProject = useCallback(
    (repo: Repo) => {
      const projectWorktrees = worktreesByRepoId.get(repo.id) ?? []
      const isAlreadyActive = projectWorktrees.some((w) => w.id === activeWorktreeId)
      if (isAlreadyActive) {
        setSidebarOpen(true)
        return
      }

      if (projectWorktrees.length > 0) {
        const target =
          projectWorktrees.find((w) => {
            const s = statuses.get(w.id)
            return s === 'working' || s === 'monitoring' || s === 'permission'
          }) ??
          projectWorktrees.find((w) => w.isUnread) ??
          projectWorktrees.find((w) => w.isMainWorktree) ??
          projectWorktrees[0]

        if (target) {
          setActiveWorktree(target.id)
        }
      }
    },
    [worktreesByRepoId, activeWorktreeId, statuses, setActiveWorktree, setSidebarOpen]
  )

  const handleExpand = useCallback(() => {
    setSidebarOpen(true)
  }, [setSidebarOpen])

  const hasGroups = sortedProjectGroups.length > 0

  return (
    <div
      data-project-icon-rail="true"
      className="flex h-full w-12 flex-col items-center justify-between py-2 bg-worktree-sidebar select-none"
    >
      {/* Group Dialogs */}
      <ProjectGroupNameDialog
        open={dialogs.nameDialog !== null}
        title={
          dialogs.nameDialog?.type === 'rename'
            ? translate('auto.components.sidebar.WorktreeList.f9dc6cc5d3', 'Rename Project Group')
            : translate('auto.components.sidebar.WorktreeList.13757c053c', 'New Project Group')
        }
        description={
          dialogs.nameDialog?.type === 'rename'
            ? translate(
                'auto.components.sidebar.WorktreeList.bc1460beb3',
                'Update the group name shown in the sidebar.'
              )
            : translate(
                'auto.components.sidebar.WorktreeList.d880ea0744',
                'Create a group and move this project into it.'
              )
        }
        initialName={
          dialogs.nameDialog?.type === 'rename'
            ? dialogs.nameDialog.currentName
            : dialogs.nameDialog
              ? `${dialogs.nameDialog.repo.displayName} group`
              : ''
        }
        confirmLabel={dialogs.nameDialog?.type === 'rename' ? 'Rename' : 'Create'}
        onOpenChange={(open) => {
          if (!open) {
            dialogs.setNameDialog(null)
          }
        }}
        onSubmit={async (name) => {
          await dialogs.handleSubmitProjectGroupName(name)
        }}
      />

      <ProjectGroupDeleteDialog
        open={dialogs.deleteDialog !== null}
        groupName={dialogs.deleteDialog?.groupName ?? ''}
        projectCount={dialogs.deleteProjectCount}
        projectNames={dialogs.deleteProjectNames}
        removeContainedProjects={dialogs.removeContainedProjects}
        onRemoveContainedProjectsChange={(removeContainedProjects) => {
          dialogs.setDeleteDialog((prev) => (prev ? { ...prev, removeContainedProjects } : null))
        }}
        onOpenChange={(open) => {
          if (!open) {
            dialogs.setDeleteDialog(null)
          }
        }}
        onConfirm={async () => {
          await dialogs.handleConfirmDeleteProjectGroup()
        }}
      />

      {/* Top Header: Expand Sidebar Button */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleExpand}
              aria-label={translate(
                'auto.components.sidebar.ProjectIconRail.expand',
                'Expand sidebar'
              )}
              className="text-muted-foreground hover:text-foreground"
            >
              <PanelLeftOpen className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            {translate('auto.components.sidebar.ProjectIconRail.expand', 'Expand sidebar')}
          </TooltipContent>
        </Tooltip>
        <div className="h-px w-6 bg-worktree-sidebar-border" />
      </div>

      {/* Middle: Scrollable Project Icons List (Grouped or Flat) */}
      <div className="flex flex-1 min-h-0 w-full flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden py-1.5 scrollbar-sleek">
        {hasGroups ? (
          <>
            {/* Grouped Projects */}
            {sortedProjectGroups.map((group, groupIdx) => {
              const groupRepos = reposByGroupId.grouped.get(group.id) ?? []
              const groupKey = getProjectGroupHeaderKey(group.id)
              const isCollapsed = collapsedGroups?.has(groupKey) ?? false

              return (
                <div key={group.id} className="flex flex-col items-center w-full gap-1.5">
                  <ProjectRailGroupHeader
                    group={group}
                    projectCount={groupRepos.length}
                    isCollapsed={isCollapsed}
                    isFirstGroup={groupIdx === 0}
                    isLastGroup={groupIdx === sortedProjectGroups.length - 1}
                    isDragOver={reorder.dragOverGroupId === group.id}
                    onToggleCollapse={() => toggleCollapsedGroup?.(groupKey)}
                    onMoveGroupUp={() => reorder.handleMoveGroupUp(group)}
                    onMoveGroupDown={() => reorder.handleMoveGroupDown(group)}
                    onRenameGroup={() => dialogs.handleRenameProjectGroup(group.id, group.name)}
                    onDeleteGroup={() => dialogs.handleDeleteProjectGroup(group.id, group.name)}
                    onDragOver={(e) => reorder.handleDragOverGroupHeader(e, group.id)}
                    onDragLeave={(e) => reorder.handleDragLeaveGroupHeader(e, group.id)}
                    onDrop={(e) => reorder.handleDropOnGroupHeader(e, group)}
                  />

                  {!isCollapsed &&
                    groupRepos.map((repo, repoIdx) => (
                      <ProjectRailItem
                        key={repo.id}
                        repo={repo}
                        worktrees={worktreesByRepoId.get(repo.id) ?? []}
                        statuses={statuses}
                        isActiveProject={repo.id === activeRepoId}
                        isFirstInGroup={repoIdx === 0}
                        isLastInGroup={repoIdx === groupRepos.length - 1}
                        onActivate={handleActivateProject}
                        onExpand={handleExpand}
                        onMoveUp={reorder.handleMoveUp}
                        onMoveDown={reorder.handleMoveDown}
                        onMoveToTop={reorder.handleMoveToTop}
                        onMoveToBottom={reorder.handleMoveToBottom}
                        onMoveToGroup={reorder.handleMoveToGroup}
                        onCreateGroup={dialogs.handleCreateGroupFromRepo}
                        projectGroups={sortedProjectGroups}
                        isDragging={reorder.draggingRepoId === repo.id}
                        dragOverPosition={
                          reorder.dragOverTarget?.repoId === repo.id
                            ? reorder.dragOverTarget.position
                            : null
                        }
                        onDragStart={reorder.handleDragStart}
                        onDragOver={reorder.handleDragOverItem}
                        onDragLeave={reorder.handleDragLeaveItem}
                        onDrop={reorder.handleDropOnItem}
                      />
                    ))}
                </div>
              )
            })}

            {/* Ungrouped Projects */}
            {reposByGroupId.ungrouped.length > 0 && (
              <div className="flex flex-col items-center w-full gap-1.5">
                <UngroupedDivider count={reposByGroupId.ungrouped.length} />
                {reposByGroupId.ungrouped.map((repo, repoIdx) => (
                  <ProjectRailItem
                    key={repo.id}
                    repo={repo}
                    worktrees={worktreesByRepoId.get(repo.id) ?? []}
                    statuses={statuses}
                    isActiveProject={repo.id === activeRepoId}
                    isFirstInGroup={repoIdx === 0}
                    isLastInGroup={repoIdx === reposByGroupId.ungrouped.length - 1}
                    onActivate={handleActivateProject}
                    onExpand={handleExpand}
                    onMoveUp={reorder.handleMoveUp}
                    onMoveDown={reorder.handleMoveDown}
                    onMoveToTop={reorder.handleMoveToTop}
                    onMoveToBottom={reorder.handleMoveToBottom}
                    onMoveToGroup={reorder.handleMoveToGroup}
                    onCreateGroup={dialogs.handleCreateGroupFromRepo}
                    projectGroups={sortedProjectGroups}
                    isDragging={reorder.draggingRepoId === repo.id}
                    dragOverPosition={
                      reorder.dragOverTarget?.repoId === repo.id
                        ? reorder.dragOverTarget.position
                        : null
                    }
                    onDragStart={reorder.handleDragStart}
                    onDragOver={reorder.handleDragOverItem}
                    onDragLeave={reorder.handleDragLeaveItem}
                    onDrop={reorder.handleDropOnItem}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          /* Flat list when no groups defined yet */
          repos.map((repo, repoIdx) => (
            <ProjectRailItem
              key={repo.id}
              repo={repo}
              worktrees={worktreesByRepoId.get(repo.id) ?? []}
              statuses={statuses}
              isActiveProject={repo.id === activeRepoId}
              isFirstInGroup={repoIdx === 0}
              isLastInGroup={repoIdx === repos.length - 1}
              onActivate={handleActivateProject}
              onExpand={handleExpand}
              onMoveUp={reorder.handleMoveUp}
              onMoveDown={reorder.handleMoveDown}
              onMoveToTop={reorder.handleMoveToTop}
              onMoveToBottom={reorder.handleMoveToBottom}
              onMoveToGroup={reorder.handleMoveToGroup}
              onCreateGroup={dialogs.handleCreateGroupFromRepo}
              projectGroups={sortedProjectGroups}
              isDragging={reorder.draggingRepoId === repo.id}
              dragOverPosition={
                reorder.dragOverTarget?.repoId === repo.id ? reorder.dragOverTarget.position : null
              }
              onDragStart={reorder.handleDragStart}
              onDragOver={reorder.handleDragOverItem}
              onDragLeave={reorder.handleDragLeaveItem}
              onDrop={reorder.handleDropOnItem}
            />
          ))
        )}
      </div>

      {/* Bottom Footer: A2A Demo & Settings Buttons */}
      <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                useA2AStore.getState().setHubTab('demo')
                useA2AStore.getState().setHubOpen(true)
              }}
              aria-label="A2A 8-Agent Mesh Demo"
              className="text-violet-400 hover:text-violet-200 hover:bg-violet-950/40 relative group"
            >
              <Zap className="size-3.5 animate-pulse text-cyan-400" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            <span>A2A 8-Agent Demo &amp; Hub</span>
          </TooltipContent>
        </Tooltip>
        <div className="h-px w-6 bg-worktree-sidebar-border" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => openSettingsPage()}
              aria-label={translate('auto.components.sidebar.ProjectIconRail.settings', 'Settings')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            {translate('auto.components.sidebar.ProjectIconRail.settings', 'Settings')}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
