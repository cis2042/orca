import React from 'react'
import { Kanban, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { ScrollToCurrentWorkspaceToolbarButton } from './ScrollToCurrentWorkspaceToolbarButton'
import { SidebarSettingsHelpMenu } from './SidebarSettingsHelpMenu'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { useA2AStore } from '../../store/a2a-traces-store'
import { hasFeatureInteraction } from '../../../../shared/feature-interactions'

const WORKSPACE_BOARD_MOVED_HINT_STORAGE_KEY = 'orca.workspaceBoardMovedHintSeen.v1'
const WORKSPACE_BOARD_MOVED_HINT_DURATION_MS = 12000

type SidebarToolbarProps = {
  workspaceBoardOpen: boolean
  workspaceBoardDragPreviewOpen?: boolean
  onWorkspaceBoardToggle: () => void
}

const SidebarToolbar = React.memo(function SidebarToolbar({
  workspaceBoardOpen,
  workspaceBoardDragPreviewOpen = false,
  onWorkspaceBoardToggle
}: SidebarToolbarProps) {
  // Why: this memo boundary needs its own language subscription, while
  // translate() preserves Orca's pseudo-localization behavior. Without it the
  // toolbar (and the ScrollToCurrentWorkspaceToolbarButton it renders) keeps
  // whatever language was active at boot — English, since the persisted locale
  // is applied asynchronously after the lazy catalog loads.
  useTranslation()
  const [workspaceBoardMovedHintOpen, setWorkspaceBoardMovedHintOpen] = React.useState(false)
  const movedHintEligibleRef = React.useRef<boolean | null>(null)
  const persistedUIReady = useAppStore((state) => state.persistedUIReady)
  const hasUsedWorkspaceBoard = useAppStore((state) =>
    hasFeatureInteraction(state.featureInteractions, 'workspace-board')
  )

  React.useEffect(() => {
    if (!persistedUIReady) {
      return
    }
    // Why: only users who had already opened the old board location should
    // see the relocation hint; first-time users should not become eligible.
    if (movedHintEligibleRef.current === null) {
      movedHintEligibleRef.current = hasUsedWorkspaceBoard
    }
    if (!movedHintEligibleRef.current) {
      return
    }
    try {
      if (window.localStorage.getItem(WORKSPACE_BOARD_MOVED_HINT_STORAGE_KEY) === 'true') {
        return
      }
      window.localStorage.setItem(WORKSPACE_BOARD_MOVED_HINT_STORAGE_KEY, 'true')
    } catch {
      return
    }

    setWorkspaceBoardMovedHintOpen(true)
    const timeoutId = window.setTimeout(() => {
      setWorkspaceBoardMovedHintOpen(false)
    }, WORKSPACE_BOARD_MOVED_HINT_DURATION_MS)
    return () => window.clearTimeout(timeoutId)
  }, [hasUsedWorkspaceBoard, persistedUIReady])

  const handleWorkspaceBoardClick = (): void => {
    setWorkspaceBoardMovedHintOpen(false)
    onWorkspaceBoardToggle()
  }

  return (
    <div className="mt-auto shrink-0">
      <div className="flex items-center justify-between border-t border-worktree-sidebar-border px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-1">
          <SidebarSettingsHelpMenu />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                type="button"
                aria-label="A2A 8-Agent Demo & Hub"
                className="relative text-purple-400 hover:text-purple-300 hover:bg-purple-950/40"
                onClick={() => {
                  useA2AStore.getState().setHubTab('demo')
                  useA2AStore.getState().setHubOpen(true)
                }}
              >
                <Zap className="size-3.5 fill-purple-400/20 text-purple-400 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-cyan-400 ring-2 ring-background animate-ping" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              A2A 8-Agent Demo & Hub
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1">
          <ScrollToCurrentWorkspaceToolbarButton />
          <Tooltip open={workspaceBoardMovedHintOpen ? true : undefined}>
            <TooltipTrigger asChild>
              <Button
                // Why: previewing the board from a card drag lights up the
                // trigger so it's clear the drag is another way to open it.
                variant={
                  workspaceBoardOpen || workspaceBoardDragPreviewOpen ? 'secondary' : 'ghost'
                }
                size="icon-xs"
                type="button"
                aria-label={translate(
                  'auto.components.sidebar.SidebarToolbar.49f62c5665',
                  'Workspace board'
                )}
                aria-pressed={workspaceBoardOpen}
                data-workspace-board-trigger=""
                data-workspace-board-preview={workspaceBoardDragPreviewOpen ? 'true' : undefined}
                onClick={handleWorkspaceBoardClick}
                className="text-muted-foreground"
              >
                <Kanban className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              {workspaceBoardMovedHintOpen
                ? translate(
                    'auto.components.sidebar.SidebarToolbar.87d0064026',
                    'Workspace board moved to the bottom bar'
                  )
                : workspaceBoardOpen
                  ? translate(
                      'auto.components.sidebar.SidebarToolbar.a30e34eb5c',
                      'Close workspace board'
                    )
                  : translate(
                      'auto.components.sidebar.SidebarToolbar.49f62c5665',
                      'Workspace board'
                    )}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
})

export default SidebarToolbar
