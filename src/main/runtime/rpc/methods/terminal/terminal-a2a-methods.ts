import { defineMethod } from '../../core'
import { broadcastA2ALink } from '../../../../ipc/terminal-a2a'
import { TerminalA2ALink } from './unary-schemas'

export const TERMINAL_A2A_METHODS = [
  defineMethod({
    name: 'terminal.a2aLink',
    params: TerminalA2ALink,
    handler: async (params) => {
      const id = params.id || `a2a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      broadcastA2ALink({
        id,
        from: params.from,
        to: params.to,
        fromIndex: params.fromIndex,
        toIndex: params.toIndex,
        fromLabel: params.fromLabel,
        toLabel: params.toLabel,
        type: params.type ?? 'send',
        text: params.text,
        timestamp: params.timestamp ?? Date.now(),
        durationMs: params.durationMs
      })
      return { ok: true, id }
    }
  })
]
