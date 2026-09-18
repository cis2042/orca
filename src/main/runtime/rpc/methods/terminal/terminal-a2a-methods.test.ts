import { describe, expect, it, vi } from 'vitest'
import { TERMINAL_A2A_METHODS } from './terminal-a2a-methods'
import * as terminalA2aIpc from '../../../../ipc/terminal-a2a'

describe('TERMINAL_A2A_METHODS', () => {
  it('defines terminal.a2aLink and broadcasts link event', async () => {
    const broadcastSpy = vi.spyOn(terminalA2aIpc, 'broadcastA2ALink').mockImplementation(() => {})
    const method = TERMINAL_A2A_METHODS.find((m) => m.name === 'terminal.a2aLink')
    expect(method).toBeDefined()

    const handler = (method as any).handler
    const res = await handler({
      from: '@2',
      to: '@5',
      fromIndex: 2,
      toIndex: 5,
      fromLabel: 'worker',
      toLabel: 'tester',
      type: 'send',
      text: 'npm test',
      timestamp: 123456789
    })

    expect(res.ok).toBe(true)
    expect(res.id).toMatch(/^a2a-/)
    expect(broadcastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '@2',
        to: '@5',
        fromIndex: 2,
        toIndex: 5,
        type: 'send',
        text: 'npm test'
      })
    )

    broadcastSpy.mockRestore()
  })
})
