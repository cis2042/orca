import type { A2ALinkEvent } from '../../../../shared/terminal-a2a-link'

export const COMMAND_LINK_DURATION_MS = 9000

export function toBridgeAnimationTrace(trace: A2ALinkEvent): A2ALinkEvent {
  return {
    ...trace,
    commandLink: true,
    durationMs: Math.max(trace.durationMs ?? 0, COMMAND_LINK_DURATION_MS)
  }
}
