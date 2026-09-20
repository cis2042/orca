import { RotateCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import type { PaneProcessExit } from './pty-connection-types'

export function TerminalProcessExitOverlay({
  processExit,
  onRestart,
  onClose
}: {
  processExit: PaneProcessExit
  onRestart: () => void
  onClose: () => void
}): React.JSX.Element {
  const capacityError = processExit.reason === 'git-bash-console-capacity'
  const title = capacityError
    ? translate(
        'auto.components.terminal.pane.TerminalProcessExitOverlay.capacityTitle',
        'Git Bash console limit reached'
      )
    : translate(
        'auto.components.terminal.pane.TerminalProcessExitOverlay.failedTitle',
        'Terminal exited'
      )
  const detail = capacityError
    ? translate(
        'auto.components.terminal.pane.TerminalProcessExitOverlay.capacityDetail',
        'Git Bash reached its 128-console limit. Close unused Git Bash terminals, then restart this terminal.'
      )
    : translate(
        'auto.components.terminal.pane.TerminalProcessExitOverlay.failedDetail',
        'The shell process ended with exit code {{code}}. Its output is preserved.'
      ).replace('{{code}}', String(processExit.exitCode))

  const startupCommand = processExit.startup?.command?.trim()
  const isResumeAction = Boolean(
    startupCommand && (startupCommand.includes('--resume') || startupCommand.includes('resume'))
  )
  const restartButtonText = isResumeAction
    ? translate('auto.components.terminal.pane.TerminalProcessExitOverlay.resume', 'Resume')
    : startupCommand
      ? translate('auto.components.terminal.pane.TerminalProcessExitOverlay.rerun', 'Rerun')
      : translate('auto.components.terminal.pane.TerminalProcessExitOverlay.restart', 'Restart')

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-end justify-center p-4">
      <div
        role="alert"
        className="pointer-events-auto flex w-full max-w-md flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xs"
      >
        <div className="space-y-1">
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{detail}</div>
          {startupCommand && (
            <div className="mt-2 rounded border border-border/60 bg-muted/40 px-2.5 py-1.5 font-mono text-[11px] text-foreground/90 break-all select-text">
              <span className="mr-1.5 text-muted-foreground">$</span>
              {startupCommand}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X />
            {translate('auto.components.terminal.pane.TerminalProcessExitOverlay.close', 'Close')}
          </Button>
          <Button type="button" size="sm" onClick={onRestart}>
            <RotateCw />
            {restartButtonText}
          </Button>
        </div>
      </div>
    </div>
  )
}
