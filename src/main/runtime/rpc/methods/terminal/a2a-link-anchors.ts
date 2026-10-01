import type { A2ALinkAnchor } from '../../../../../shared/terminal-a2a-link'
import type { RuntimeTerminalSummary } from '../../../../../shared/runtime-terminal-contracts'

export function toA2ALinkAnchor(terminal: RuntimeTerminalSummary): A2ALinkAnchor {
  return {
    handle: terminal.handle,
    ptyId: terminal.ptyId,
    tabId: terminal.tabId,
    leafId: terminal.leafId,
    worktreeId: terminal.worktreeId,
    title: terminal.title
  }
}

export function resolveA2ALinkAnchors(
  terminals: readonly RuntimeTerminalSummary[],
  handles: { fromHandle?: string; toHandle?: string }
): { fromAnchor?: A2ALinkAnchor; toAnchor?: A2ALinkAnchor } {
  const byHandle = new Map(terminals.map((terminal) => [terminal.handle, terminal]))
  const from = handles.fromHandle ? byHandle.get(handles.fromHandle) : undefined
  const to = handles.toHandle ? byHandle.get(handles.toHandle) : undefined
  return {
    ...(from ? { fromAnchor: toA2ALinkAnchor(from) } : {}),
    ...(to ? { toAnchor: toA2ALinkAnchor(to) } : {})
  }
}
