import React, { useMemo } from 'react'
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Check,
  Folder,
  FolderPlus,
  FolderTree,
  FolderX,
  PanelLeftOpen
} from 'lucide-react'
import { RepoIconGlyph } from '@/components/repo/repo-icon'
import { resolveRepoHeaderColor } from './project-header-color'
import { FilledBellIcon } from './WorktreeCardHelpers'
import { AgentWorkingSpinner } from '@/components/AgentWorkingSpinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { computeProjectRailSummary, EMPTY_PROJECT_GROUPS } from './project-rail-types'
import type { Worktree } from '../../../../shared/worktree/types'
import type { Repo } from '../../../../shared/repo-types'
import type { ProjectGroup } from '../../../../shared/project-group-types'
import type { WorktreeStatus } from '@/lib/worktree-status'

export type ProjectRailItemProps = {
  repo: Repo
  worktrees: readonly Worktree[]
  statuses: Map<string, WorktreeStatus>
  isActiveProject: boolean
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
  onActivate: (repo: Repo) => void
  onExpand: () => void
  onMoveUp?: (repo: Repo) => void
  onMoveDown?: (repo: Repo) => void
  onMoveToTop?: (repo: Repo) => void
  onMoveToBottom?: (repo: Repo) => void
  onMoveToGroup?: (repo: Repo, groupId: string | null) => void
  onCreateGroup?: (repo: Repo) => void
  projectGroups?: readonly ProjectGroup[]
  isDragging?: boolean
  dragOverPosition?: 'before' | 'after' | null
  onDragStart?: (e: React.DragEvent, repo: Repo) => void
  onDragOver?: (e: React.DragEvent, repo: Repo) => void
  onDragLeave?: (e: React.DragEvent, repo: Repo) => void
  onDrop?: (e: React.DragEvent, repo: Repo) => void
}

export const ProjectRailItem = React.memo(function ProjectRailItem({
  repo,
  worktrees,
  statuses,
  isActiveProject,
  isFirstInGroup = false,
  isLastInGroup = false,
  onActivate,
  onExpand,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
  onMoveToBottom,
  onMoveToGroup,
  onCreateGroup,
  projectGroups = EMPTY_PROJECT_GROUPS,
  isDragging = false,
  dragOverPosition = null,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop
}: ProjectRailItemProps) {
  const summary = useMemo(
    () => computeProjectRailSummary(worktrees, statuses),
    [worktrees, statuses]
  )

  const statusLabel = useMemo(() => {
    if (summary.status === 'running') {
      return translate(
        'auto.components.sidebar.ProjectIconRail.running',
        'Running ({{count}} active)',
        { count: summary.runningCount }
      )
    }
    if (summary.status === 'completed') {
      return translate(
        'auto.components.sidebar.ProjectIconRail.completed',
        'Completed ({{count}} unread)',
        { count: summary.unreadCount }
      )
    }
    return translate('auto.components.sidebar.ProjectIconRail.idle', 'Idle')
  }, [summary])

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="relative flex items-center justify-center w-full"
          draggable={Boolean(onDragStart)}
          onDragStart={(e) => onDragStart?.(e, repo)}
          onDragOver={(e) => onDragOver?.(e, repo)}
          onDragLeave={(e) => onDragLeave?.(e, repo)}
          onDrop={(e) => onDrop?.(e, repo)}
        >
          {dragOverPosition === 'before' && (
            <div className="pointer-events-none absolute -top-1 left-1.5 right-1.5 z-30 h-0.5 rounded-full bg-primary shadow-xs ring-1 ring-primary/50" />
          )}
          {dragOverPosition === 'after' && (
            <div className="pointer-events-none absolute -bottom-1 left-1.5 right-1.5 z-30 h-0.5 rounded-full bg-primary shadow-xs ring-1 ring-primary/50" />
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onActivate(repo)}
                onDoubleClick={onExpand}
                className={cn(
                  'group relative flex size-9 shrink-0 items-center justify-center rounded-lg transition-all',
                  'hover:bg-worktree-sidebar-accent hover:text-worktree-sidebar-accent-foreground',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  isActiveProject
                    ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground ring-1 ring-worktree-sidebar-ring/60'
                    : 'text-muted-foreground',
                  isDragging && 'opacity-40 scale-95'
                )}
                aria-label={`${repo.displayName} - ${statusLabel}`}
                data-project-rail-item={repo.id}
                data-project-rail-status={summary.status}
              >
                {repo.repoIcon ? (
                  <RepoIconGlyph
                    repoIcon={repo.repoIcon}
                    color={resolveRepoHeaderColor(repo.badgeColor)}
                    className="size-5"
                    iconClassName="size-4"
                  />
                ) : (
                  <Folder
                    className="size-4"
                    style={{ color: resolveRepoHeaderColor(repo.badgeColor) }}
                  />
                )}

                {/* Status Badge in bottom-right corner */}
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center pointer-events-none"
                  data-project-rail-badge={summary.status}
                >
                  {summary.status === 'running' ? (
                    <span className="relative flex size-2.5 items-center justify-center">
                      <AgentWorkingSpinner className="size-2.5" />
                    </span>
                  ) : summary.status === 'completed' ? (
                    <FilledBellIcon className="size-3 text-workspace-status-progress drop-shadow-xs" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-muted-foreground/40 ring-1 ring-worktree-sidebar" />
                  )}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="flex flex-col gap-0.5 text-xs">
              <div className="font-semibold text-foreground">{repo.displayName}</div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {summary.status === 'running' ? (
                  <span className="size-1.5 rounded-full bg-workspace-status-review" />
                ) : summary.status === 'completed' ? (
                  <FilledBellIcon className="size-2.5 text-workspace-status-progress" />
                ) : (
                  <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                )}
                <span>{statusLabel}</span>
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground/70">
                {translate(
                  'auto.components.sidebar.ProjectIconRail.workspacesCount',
                  '{{count}} workspace(s)',
                  { count: summary.totalCount }
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground truncate">
          {repo.displayName}
        </div>
        <ContextMenuSeparator />
        <ContextMenuItem
          disabled={isFirstInGroup}
          onClick={() => onMoveUp?.(repo)}
          className="gap-2 text-xs"
        >
          <ArrowUp className="size-3.5" />
          {translate('auto.components.sidebar.ProjectIconRail.moveUp', '上移')}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={isLastInGroup}
          onClick={() => onMoveDown?.(repo)}
          className="gap-2 text-xs"
        >
          <ArrowDown className="size-3.5" />
          {translate('auto.components.sidebar.ProjectIconRail.moveDown', '下移')}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={isFirstInGroup}
          onClick={() => onMoveToTop?.(repo)}
          className="gap-2 text-xs"
        >
          <ArrowUpToLine className="size-3.5" />
          {translate('auto.components.sidebar.ProjectIconRail.moveToTop', '移至頂端')}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={isLastInGroup}
          onClick={() => onMoveToBottom?.(repo)}
          className="gap-2 text-xs"
        >
          <ArrowDownToLine className="size-3.5" />
          {translate('auto.components.sidebar.ProjectIconRail.moveToBottom', '移至底端')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2 text-xs">
            <FolderTree className="size-3.5" />
            {translate('auto.components.sidebar.ProjectIconRail.moveToGroup', '移至分組')}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {projectGroups.length > 0 && (
              <>
                {projectGroups.map((g) => {
                  const isCurrent = repo.projectGroupId === g.id
                  return (
                    <ContextMenuItem
                      key={g.id}
                      onClick={() => onMoveToGroup?.(repo, g.id)}
                      className="gap-2 text-xs"
                    >
                      {isCurrent ? (
                        <Check className="size-3.5 text-primary shrink-0" />
                      ) : (
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: g.color ?? 'var(--muted-foreground)' }}
                        />
                      )}
                      <span className="truncate">{g.name}</span>
                    </ContextMenuItem>
                  )
                })}
                {repo.projectGroupId && (
                  <>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => onMoveToGroup?.(repo, null)}
                      className="gap-2 text-xs text-muted-foreground"
                    >
                      <FolderX className="size-3.5" />
                      {translate(
                        'auto.components.sidebar.ProjectIconRail.removeFromGroup',
                        '移出分組 (未分組)'
                      )}
                    </ContextMenuItem>
                  </>
                )}
                <ContextMenuSeparator />
              </>
            )}
            <ContextMenuItem onClick={() => onCreateGroup?.(repo)} className="gap-2 text-xs">
              <FolderPlus className="size-3.5" />
              {translate('auto.components.sidebar.ProjectIconRail.newGroup', '新建分組...')}
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onExpand} className="gap-2 text-xs">
          <PanelLeftOpen className="size-3.5" />
          {translate('auto.components.sidebar.ProjectIconRail.expandSidebar', '展開側欄')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})
