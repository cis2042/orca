import type { AgentSessionWriteAim } from './agent-session-pty-write-admission'

export type A2ALinkType = 'send' | 'message' | 'type' | 'keys'

export type A2ALinkEvent = {
  id: string
  from: string
  to: string
  fromIndex?: number
  toIndex?: number
  fromLabel?: string
  toLabel?: string
  type: A2ALinkType
  text?: string
  timestamp: number
  durationMs?: number
  dispatch?: boolean
  delivered?: boolean
  targetHandle?: string
  bytesWritten?: number
  executionState?: 'delivered' | 'executing' | 'failed' | 'simulated'
  error?: string
  /** Set when this dispatch must stay on the session it was aimed at. */
  expectedAgentSession?: AgentSessionWriteAim
  /** Worktree session this link belongs to. Indexes repeat in every session. */
  worktreeId?: string
}

export function a2aEventInSession(
  event: { worktreeId?: string },
  worktreeId?: string | null
): boolean {
  return Boolean(worktreeId && event.worktreeId && event.worktreeId === worktreeId)
}

/** A beam or message is visible unless the execution explicitly failed. */
export function a2aTransmissionLanded(event: {
  delivered?: boolean
  executionState?: string
  error?: string
}): boolean {
  if (event.executionState === 'failed' || Boolean(event.error)) {
    return false
  }
  return true
}

export type A2ATerminalCandidate = {
  handle: string
  index?: number | null
  title?: string | null
  preview?: string | null
  branch?: string | null
  worktreeId?: string | null
}

/**
 * Pick the terminal an A2A command may write to.
 * The same @index exists in every session, so an unscoped list must not guess.
 */
export function resolveA2ADispatchTarget(
  terminals: readonly A2ATerminalCandidate[],
  args: { to: string; toIndex?: number; worktreeId?: string }
): { handle: string } | { error: string } {
  const scoped = args.worktreeId
    ? terminals.filter((terminal) => terminal.worktreeId === args.worktreeId)
    : terminals
  const targetIndex = args.toIndex ?? parseTerminalIndex(args.to)
  const byHandle = scoped.filter((terminal) => terminal.handle === args.to)
  if (byHandle.length === 1) {
    return { handle: byHandle[0].handle }
  }
  if (byHandle.length > 1) {
    return { error: `Target "${args.to}" matches more than one session.` }
  }

  if (targetIndex !== undefined) {
    const byIndex = scoped.filter(
      (terminal, idx) =>
        terminal.index === targetIndex || (!terminal.index && idx + 1 === targetIndex)
    )
    if (byIndex.length === 1) {
      return { handle: byIndex[0].handle }
    }
    if (byIndex.length > 1) {
      return {
        error: `Target "@${targetIndex}" exists in more than one session. A2A commands stay in the current session.`
      }
    }
    return {
      error: args.worktreeId
        ? `No active terminal found for target "${args.to}" in this session.`
        : `No active terminal found for target "${args.to}".`
    }
  }

  if (args.to.startsWith('@')) {
    const label = args.to.slice(1).toLowerCase()
    const byLabel = scoped.filter(
      (terminal) =>
        terminal.title?.toLowerCase() === label ||
        terminal.preview?.toLowerCase().includes(label) ||
        terminal.branch?.toLowerCase() === label
    )
    if (byLabel.length === 1) {
      return { handle: byLabel[0].handle }
    }
    if (byLabel.length > 1) {
      return {
        error: `Target "${args.to}" exists in more than one session. A2A commands stay in the current session.`
      }
    }
  }

  return {
    error: args.worktreeId
      ? `No active terminal found for target "${args.to}" in this session.`
      : `No active terminal found for target "${args.to}".`
  }
}

/**
 * Extracts numeric terminal index from targets like '@2', '#5', '2', or 'terminal-2'.
 */
export function parseTerminalIndex(target: string | undefined | null): number | undefined {
  if (!target) {
    return undefined
  }
  const trimmed = target.trim()
  const match = trimmed.match(/^(?:[@#])?(\d+)$/)
  if (match) {
    const num = Number.parseInt(match[1], 10)
    return Number.isFinite(num) && num > 0 ? num : undefined
  }
  return undefined
}
