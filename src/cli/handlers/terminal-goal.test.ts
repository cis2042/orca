import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RuntimeClient } from '../runtime-client'
import { TERMINAL_HANDLERS } from './terminal'

function clientReturning(goal: string | null) {
  const call = vi.fn().mockResolvedValue({
    result: { goal: { handle: 'term_general', tabId: 'tab-1', leafId: 'leaf-1', goal } }
  })
  return { call, client: { call } as unknown as RuntimeClient }
}

describe('terminal goal CLI', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubEnv('ORCA_TERMINAL_HANDLE', 'term_general')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('sets the goal on the calling terminal pane from positional text', async () => {
    const { call, client } = clientReturning('修好 LINE 通知')
    await TERMINAL_HANDLERS['terminal goal']({
      flags: new Map(),
      rawArgs: ['修好', 'LINE', '通知'],
      client,
      cwd: '/tmp',
      json: true
    })
    expect(call).toHaveBeenCalledWith('terminal.setGoal', {
      terminal: 'term_general',
      goal: '修好 LINE 通知'
    })
  })

  it('lets --terminal and --text override the caller and positional text', async () => {
    const { call, client } = clientReturning('檢查 PR')
    await TERMINAL_HANDLERS['terminal goal']({
      flags: new Map<string, string | true>([
        ['terminal', 'term_soldier'],
        ['text', '檢查 PR']
      ]),
      rawArgs: [],
      client,
      cwd: '/tmp',
      json: true
    })
    expect(call).toHaveBeenCalledWith('terminal.setGoal', {
      terminal: 'term_soldier',
      goal: '檢查 PR'
    })
  })

  it('clears the goal with --clear', async () => {
    const { call, client } = clientReturning(null)
    await TERMINAL_HANDLERS['terminal goal']({
      flags: new Map<string, string | true>([['clear', true]]),
      rawArgs: [],
      client,
      cwd: '/tmp',
      json: true
    })
    expect(call).toHaveBeenCalledWith('terminal.setGoal', { terminal: 'term_general', goal: null })
  })

  it('refuses to guess a pane when not run inside a terminal', async () => {
    vi.stubEnv('ORCA_TERMINAL_HANDLE', '')
    const { call, client } = clientReturning('x')
    await expect(
      TERMINAL_HANDLERS['terminal goal']({
        flags: new Map(),
        rawArgs: ['x'],
        client,
        cwd: '/tmp',
        json: true
      })
    ).rejects.toThrow('Run this inside an Orca terminal')
    expect(call).not.toHaveBeenCalled()
  })

  it('requires goal text unless clearing', async () => {
    const { client } = clientReturning('x')
    await expect(
      TERMINAL_HANDLERS['terminal goal']({
        flags: new Map(),
        rawArgs: [],
        client,
        cwd: '/tmp',
        json: true
      })
    ).rejects.toThrow('Pass the goal text')
  })
})
