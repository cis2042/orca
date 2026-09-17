import type { RuntimeTerminalListResult } from '../shared/runtime-types'
import { RuntimeClientError, type RuntimeClient } from './runtime-client'

/**
 * Resolves a terminal target which can be a runtime handle, an index like '@1' or '#1',
 * or a label like '@codex'.
 */
export async function resolveTerminalTarget(
  target: string,
  worktree: string | undefined,
  client: RuntimeClient
): Promise<string> {
  const indexMatch = /^[@#]?(\d+)$/.exec(target.trim())
  const isLabelTarget = target.startsWith('@')
  if (!indexMatch && !isLabelTarget) {
    return target
  }

  const listRes = await client.call<RuntimeTerminalListResult>(
    'terminal.list',
    worktree ? { worktree } : undefined
  )
  const terminals = listRes.result.terminals

  if (indexMatch) {
    const targetIdx = Number.parseInt(indexMatch[1], 10)
    const matched = terminals.find(
      (t, idx) => t.index === targetIdx || (!t.index && idx + 1 === targetIdx)
    )
    if (!matched) {
      throw new RuntimeClientError(
        'selector_not_found',
        `No terminal found with index ${targetIdx} (target "${target}")`
      )
    }
    return matched.handle
  }

  const rawLabel = target.slice(1).trim()
  const matched = terminals.find(
    (t) => t.label === rawLabel || t.title === rawLabel || t.title === target
  )
  if (!matched) {
    throw new RuntimeClientError(
      'selector_not_found',
      `No terminal found with label "${rawLabel}" (target "${target}")`
    )
  }
  return matched.handle
}
