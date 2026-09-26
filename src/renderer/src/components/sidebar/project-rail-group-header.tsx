import React from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type { ProjectGroup } from '../../../../shared/project-group-types'

export type ProjectRailGroupHeaderProps = {
  group: ProjectGroup
  projectCount: number
  isCollapsed: boolean
  isFirstGroup: boolean
  isLastGroup: boolean
  isDragOver: boolean
  onToggleCollapse: () => void
  onMoveGroupUp?: () => void
  onMoveGroupDown?: () => void
  onRenameGroup?: () => void
  onDeleteGroup?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
}

export const ProjectRailGroupHeader = React.memo(function ProjectRailGroupHeader({
  group,
  projectCount,
  isCollapsed,
  isFirstGroup,
  isLastGroup,
  isDragOver,
  onToggleCollapse,
  onMoveGroupUp,
  onMoveGroupDown,
  onRenameGroup,
  onDeleteGroup,
  onDragOver,
  onDragLeave,
  onDrop
}: ProjectRailGroupHeaderProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'group/gh relative flex w-full flex-col items-center py-1 cursor-pointer transition-colors',
            isDragOver && 'bg-primary/10 rounded-md ring-1 ring-primary/60'
          )}
          onClick={onToggleCollapse}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          data-project-rail-group={group.id}
          data-project-rail-group-collapsed={isCollapsed}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex w-full items-center justify-center px-2 py-0.5">
                <div className="h-px flex-1 bg-worktree-sidebar-border/60 transition-colors group-hover/gh:bg-muted-foreground/40" />
                <span
                  className={cn(
                    'mx-1 size-2 rounded-full shrink-0 transition-transform group-hover/gh:scale-125',
                    isCollapsed && 'ring-1 ring-ring'
                  )}
                  style={{ backgroundColor: group.color ?? '#6366f1' }}
                />
                <div className="h-px flex-1 bg-worktree-sidebar-border/60 transition-colors group-hover/gh:bg-muted-foreground/40" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="flex flex-col gap-0.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: group.color ?? '#6366f1' }}
                />
                <span>{group.name}</span>
                {isCollapsed && (
                  <span className="text-[10px] font-normal text-muted-foreground">
                    ({translate('auto.components.sidebar.ProjectIconRail.collapsed', '已折疊')})
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {translate(
                  'auto.components.sidebar.ProjectIconRail.groupProjectCount',
                  '{{count}} 個專案 · 點擊{{action}}，右鍵設定',
                  {
                    count: projectCount,
                    action: isCollapsed
                      ? translate('auto.components.sidebar.ProjectIconRail.actionExpand', '展開')
                      : translate('auto.components.sidebar.ProjectIconRail.actionCollapse', '折疊')
                  }
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground truncate">
          {group.name}
        </div>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onToggleCollapse} className="gap-2 text-xs">
          {isCollapsed ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
          {isCollapsed
            ? translate('auto.components.sidebar.ProjectIconRail.expandGroup', '展開分組')
            : translate('auto.components.sidebar.ProjectIconRail.collapseGroup', '折疊分組')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={isFirstGroup} onClick={onMoveGroupUp} className="gap-2 text-xs">
          <ArrowUp className="size-3.5" />
          {translate('auto.components.sidebar.ProjectIconRail.moveGroupUp', '分組上移')}
        </ContextMenuItem>
        <ContextMenuItem disabled={isLastGroup} onClick={onMoveGroupDown} className="gap-2 text-xs">
          <ArrowDown className="size-3.5" />
          {translate('auto.components.sidebar.ProjectIconRail.moveGroupDown', '分組下移')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        {onRenameGroup && (
          <ContextMenuItem onClick={onRenameGroup} className="gap-2 text-xs">
            {translate('auto.components.sidebar.ProjectIconRail.renameGroup', '重新命名分組')}
          </ContextMenuItem>
        )}
        {onDeleteGroup && (
          <ContextMenuItem
            onClick={onDeleteGroup}
            className="gap-2 text-xs text-destructive focus:text-destructive"
          >
            {translate('auto.components.sidebar.ProjectIconRail.deleteGroup', '刪除分組')}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
})

export function UngroupedDivider({ count }: { count: number }): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex w-full items-center justify-center px-2 py-1 cursor-default">
          <div className="h-px flex-1 bg-worktree-sidebar-border/40" />
          <span className="mx-1 text-[9px] uppercase tracking-wider text-muted-foreground/60 font-medium select-none">
            ·
          </span>
          <div className="h-px flex-1 bg-worktree-sidebar-border/40" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12} className="text-xs">
        <span className="font-medium">
          {translate('auto.components.sidebar.ProjectIconRail.ungroupedProjects', '未分組專案')}
        </span>
        <span className="text-muted-foreground ml-1.5 text-[10px]">
          ({count} {translate('auto.components.sidebar.ProjectIconRail.projectsUnit', '個專案')})
        </span>
      </TooltipContent>
    </Tooltip>
  )
}
