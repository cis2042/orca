import { defineMethod } from '../../core'
import { broadcastA2ALink } from '../../../../ipc/terminal-a2a'
import {
  resolveA2ADispatchTarget,
  type A2ALinkEvent
} from '../../../../../shared/terminal-a2a-link'
import { TerminalA2ALink } from './unary-schemas'

export const TERMINAL_A2A_METHODS = [
  defineMethod({
    name: 'terminal.a2aLink',
    params: TerminalA2ALink,
    handler: async (params, ctx) => {
      const id = params.id || `a2a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      let delivered = false
      let targetHandle: string | undefined
      let bytesWritten = 0
      let executionState: 'delivered' | 'failed' | 'simulated' = 'simulated'
      let errorMessage: string | undefined

      const shouldDispatch = params.dispatch !== false && Boolean(params.text)

      if (shouldDispatch && ctx?.runtime) {
        try {
          const listRes = await ctx.runtime.listTerminals(
            params.worktreeId ? `id:${params.worktreeId}` : undefined
          )
          const resolved = resolveA2ADispatchTarget(listRes?.terminals ?? [], {
            to: params.to,
            toIndex: params.toIndex,
            worktreeId: params.worktreeId
          })

          if ('handle' in resolved) {
            targetHandle = resolved.handle
            let messageToSend = params.text ?? ''
            if (params.type === 'message') {
              const header = `[orca-bridge from:${params.from} to:${params.to}]`
              messageToSend = `${header} ${params.text}`
            }

            const sendRes = await ctx.runtime.sendTerminal(targetHandle, {
              text: messageToSend,
              enter: params.type !== 'type',
              ...(params.expectedAgentSession
                ? { expectedAgentSession: params.expectedAgentSession }
                : {})
            })

            delivered = sendRes?.accepted ?? true
            bytesWritten = sendRes?.bytesWritten ?? messageToSend.length
            executionState = delivered ? 'delivered' : 'failed'
          } else {
            errorMessage = resolved.error
            executionState = 'failed'
          }
        } catch (err: unknown) {
          errorMessage = err instanceof Error ? err.message : String(err)
          executionState = 'failed'
        }
      } else if (params.dispatch === false) {
        delivered = params.delivered ?? true
        executionState = (params.executionState as typeof executionState) || 'delivered'
        targetHandle = params.targetHandle
      }

      let worktreeId = params.worktreeId
      if (!worktreeId && ctx?.runtime) {
        try {
          const listRes = await ctx.runtime.listTerminals(undefined)
          const matched = (listRes?.terminals ?? []).find(
            (t) =>
              (targetHandle && t.handle === targetHandle) ||
              (params.toIndex && t.index === params.toIndex) ||
              (params.targetHandle && t.handle === params.targetHandle)
          )
          if (matched?.worktreeId) {
            worktreeId = matched.worktreeId
          }
        } catch {
          // Best effort
        }
      }

      const event: A2ALinkEvent = {
        id,
        from: params.from,
        to: params.to,
        fromIndex: params.fromIndex,
        toIndex: params.toIndex,
        fromLabel: params.fromLabel,
        toLabel: params.toLabel,
        type: params.type ?? 'send',
        text: params.text,
        worktreeId,
        timestamp: params.timestamp ?? Date.now(),
        durationMs: params.durationMs,
        delivered,
        targetHandle,
        bytesWritten,
        executionState,
        error: errorMessage
      }

      broadcastA2ALink(event)
      return {
        ok: true,
        id,
        delivered,
        targetHandle,
        bytesWritten,
        executionState,
        error: errorMessage
      }
    }
  })
]
