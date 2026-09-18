import { describe, expect, it, vi } from 'vitest'
import {
  broadcastA2ALink,
  registerTerminalA2AHandlers,
  TERMINAL_A2A_LINK_CHANNEL
} from './terminal-a2a'
import type { A2ALinkEvent } from '../../shared/terminal-a2a-link'

describe('terminal-a2a IPC', () => {
  it('broadcasts A2A link event to all non-destroyed windows', () => {
    const sendMock1 = vi.fn()
    const sendMock2 = vi.fn()
    const mockWindow1 = {
      isDestroyed: () => false,
      webContents: { send: sendMock1 }
    } as any
    const mockWindow2 = {
      isDestroyed: () => true,
      webContents: { send: sendMock2 }
    } as any

    const testEvent: A2ALinkEvent = {
      id: 'test-1',
      from: '@2',
      to: '@5',
      fromIndex: 2,
      toIndex: 5,
      type: 'send',
      text: 'npm test',
      timestamp: Date.now()
    }

    broadcastA2ALink(testEvent, {
      getWindows: () => [mockWindow1, mockWindow2]
    })

    expect(sendMock1).toHaveBeenCalledWith(TERMINAL_A2A_LINK_CHANNEL, testEvent)
    expect(sendMock2).not.toHaveBeenCalled()
  })

  it('registers ipc handler and invokes broadcast on call', async () => {
    const handleMock = vi.fn()
    const mockIpc = { handle: handleMock } as any
    const sendMock = vi.fn()
    const mockWindow = {
      isDestroyed: () => false,
      webContents: { send: sendMock }
    } as any

    registerTerminalA2AHandlers({
      ipc: mockIpc,
      getWindows: () => [mockWindow]
    })

    expect(handleMock).toHaveBeenCalledWith(TERMINAL_A2A_LINK_CHANNEL, expect.any(Function))
    const handler = handleMock.mock.calls[0][1]

    const testEvent: A2ALinkEvent = {
      id: 'test-2',
      from: '@2',
      to: '@8',
      fromIndex: 2,
      toIndex: 8,
      type: 'message',
      text: 'review please',
      timestamp: Date.now()
    }

    const res = await handler({}, testEvent)
    expect(res).toEqual({ ok: true })
    expect(sendMock).toHaveBeenCalledWith(TERMINAL_A2A_LINK_CHANNEL, testEvent)
  })
})
