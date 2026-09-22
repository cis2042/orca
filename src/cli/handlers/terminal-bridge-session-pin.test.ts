import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RuntimeTerminalListResult, RuntimeTerminalSummary } from '../../shared/runtime-types'
import type { RuntimeClient } from '../runtime-client'
import { BRIDGE_HANDLERS } from './terminal-bridge'
import { forgetBridgeSessionPins } from './terminal-bridge-session-pin'

// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the bridge tests only need RuntimeClient.call.
const toMockClient = (call: unknown) => ({ call }) as unknown as RuntimeClient

const AIM = { sessionId: 'session-alpha-1', runtimeFence: 4 }
const NEXT_AIM = { sessionId: 'session-beta-2', runtimeFence: 9 }

function listFor(handle: string): RuntimeTerminalListResult {
  const terminal: RuntimeTerminalSummary = {
    handle,
    ptyId: 'pty-1',
    worktreeId: 'wt-1',
    worktreePath: '/workspaces/proj',
    branch: 'main',
    tabId: 'tab-1',
    leafId: 'leaf-1',
    title: 'Worker',
    connected: true,
    writable: true,
    lastOutputAt: null,
    preview: '',
    index: 2,
    target: '@2',
    label: 'Worker'
  }
  return { terminals: [terminal], totalCount: 1, truncated: false }
}

function sendCalls(call: ReturnType<typeof vi.fn>): unknown[] {
  return call.mock.calls.filter((entry) => entry[0] === 'terminal.send').map((entry) => entry[1])
}

describe('bridge session aim', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv, ORCA_TERMINAL_HANDLE: 'term_sender', ORCA_TERMINAL_INDEX: '1' }
    forgetBridgeSessionPins()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    forgetBridgeSessionPins()
    vi.restoreAllMocks()
  })

  async function message(call: RuntimeClient['call'], reaim = false): Promise<void> {
    const flags = new Map<string, string | boolean>([['no-read-guard', true]])
    if (reaim) {
      flags.set('reaim', true)
    }
    await BRIDGE_HANDLERS['bridge message']({
      flags,
      client: toMockClient(call),
      cwd: '/workspaces/proj',
      json: false,
      rawArgs: ['@2', 'status']
    })
  }

  it('pins the first paste and sends that session on the next one', async () => {
    const call = vi.fn().mockImplementation((method: string) => {
      if (method === 'terminal.list') {
        return Promise.resolve({ id: '1', ok: true, result: listFor('term_worker') })
      }
      if (method === 'terminal.send') {
        return Promise.resolve({
          id: '2',
          ok: true,
          result: { send: { accepted: true, bytesWritten: 8, agentSessionAim: AIM } }
        })
      }
      if (method === 'terminal.a2aLink') {
        return Promise.resolve({ id: '3', ok: true, result: { ok: true, id: 'a2a-1' } })
      }
      return Promise.reject(new Error(`unexpected method: ${method}`))
    })

    await message(call)
    await message(call)

    const sends = sendCalls(call)
    expect(sends[0]).not.toHaveProperty('expectedAgentSession')
    expect(sends[1]).toMatchObject({
      terminal: 'term_worker',
      expectedAgentSession: AIM
    })
    expect(call).toHaveBeenCalledWith(
      'terminal.a2aLink',
      expect.objectContaining({ dispatch: false, to: '@2' })
    )
  })

  it('stops when the target index now points at a different terminal', async () => {
    let handle = 'term_worker'
    const call = vi.fn().mockImplementation((method: string) => {
      if (method === 'terminal.list') {
        return Promise.resolve({ id: '1', ok: true, result: listFor(handle) })
      }
      if (method === 'terminal.send') {
        return Promise.resolve({
          id: '2',
          ok: true,
          result: { send: { accepted: true, bytesWritten: 8, agentSessionAim: AIM } }
        })
      }
      if (method === 'terminal.a2aLink') {
        return Promise.resolve({ id: '3', ok: true, result: { ok: true, id: 'a2a-1' } })
      }
      return Promise.reject(new Error(`unexpected method: ${method}`))
    })

    await message(call)
    handle = 'term_other'
    await expect(message(call)).rejects.toThrow(/Session changed on @2/)
    expect(sendCalls(call)).toHaveLength(1)
  })

  it('keeps the old aim when the host refuses a switched session', async () => {
    let refuse = false
    const call = vi.fn().mockImplementation((method: string) => {
      if (method === 'terminal.list') {
        return Promise.resolve({ id: '1', ok: true, result: listFor('term_worker') })
      }
      if (method === 'terminal.send') {
        if (refuse) {
          return Promise.resolve({
            id: '2',
            ok: true,
            result: {
              send: {
                accepted: false,
                bytesWritten: 0,
                agentSessionRefusal: {
                  code: 'agent_session_checkpoint_stale',
                  sessionId: AIM.sessionId,
                  ownerRuntimeKind: null,
                  handoffStage: null,
                  ownerPid: null,
                  runtimeFence: 9
                }
              }
            }
          })
        }
        return Promise.resolve({
          id: '2',
          ok: true,
          result: { send: { accepted: true, bytesWritten: 8, agentSessionAim: AIM } }
        })
      }
      if (method === 'terminal.a2aLink') {
        return Promise.resolve({ id: '3', ok: true, result: { ok: true, id: 'a2a-1' } })
      }
      return Promise.reject(new Error(`unexpected method: ${method}`))
    })

    await message(call)
    refuse = true
    await expect(message(call)).rejects.toThrow(/Session changed on @2/)
    refuse = false
    await message(call)
    const sends = sendCalls(call)
    expect(sends[1]).toMatchObject({ expectedAgentSession: AIM })
    expect(sends[2]).toMatchObject({ expectedAgentSession: AIM })
  })

  it('re-aims only when asked', async () => {
    let sendCount = 0
    const call = vi.fn().mockImplementation((method: string) => {
      if (method === 'terminal.list') {
        return Promise.resolve({ id: '1', ok: true, result: listFor('term_worker') })
      }
      if (method === 'terminal.send') {
        sendCount += 1
        const aim = sendCount === 1 ? AIM : NEXT_AIM
        return Promise.resolve({
          id: '2',
          ok: true,
          result: { send: { accepted: true, bytesWritten: 8, agentSessionAim: aim } }
        })
      }
      if (method === 'terminal.a2aLink') {
        return Promise.resolve({ id: '3', ok: true, result: { ok: true, id: 'a2a-1' } })
      }
      return Promise.reject(new Error(`unexpected method: ${method}`))
    })

    await message(call)
    await message(call, true)
    await message(call)

    const sends = sendCalls(call)
    expect(sends[1]).not.toHaveProperty('expectedAgentSession')
    expect(sends[2]).toMatchObject({ expectedAgentSession: NEXT_AIM })
  })
})
