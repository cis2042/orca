import { describe, expect, it } from 'vitest'
import {
  a2aEventInSession,
  parseTerminalIndex,
  resolveA2ADispatchTarget
} from './terminal-a2a-link'

describe('terminal-a2a-link', () => {
  it('parses terminal targets with @, #, or bare numbers', () => {
    expect(parseTerminalIndex('@2')).toBe(2)
    expect(parseTerminalIndex('#5')).toBe(5)
    expect(parseTerminalIndex('8')).toBe(8)
    expect(parseTerminalIndex('@10')).toBe(10)
    expect(parseTerminalIndex('#100')).toBe(100)
  })

  it('returns undefined for non-numeric targets or empty input', () => {
    expect(parseTerminalIndex('')).toBeUndefined()
    expect(parseTerminalIndex(null)).toBeUndefined()
    expect(parseTerminalIndex(undefined)).toBeUndefined()
    expect(parseTerminalIndex('@worker-1')).toBeUndefined()
    expect(parseTerminalIndex('codex')).toBeUndefined()
    expect(parseTerminalIndex('@0')).toBeUndefined()
  })

  it('refuses an @index that exists in more than one session', () => {
    const terminals = [
      { handle: 'pane-a', index: 2, worktreeId: 'session-a' },
      { handle: 'pane-b', index: 2, worktreeId: 'session-b' }
    ]
    expect(resolveA2ADispatchTarget(terminals, { to: '@2' })).toEqual({
      error:
        'Target "@2" exists in more than one session. A2A commands stay in the current session.'
    })
    expect(resolveA2ADispatchTarget(terminals, { to: '@2', worktreeId: 'session-b' })).toEqual({
      handle: 'pane-b'
    })
    expect(resolveA2ADispatchTarget(terminals, { to: '@2', worktreeId: 'session-a' })).toEqual({
      handle: 'pane-a'
    })
  })

  it('does not search other sessions once a worktree is named', () => {
    const terminals = [
      { handle: 'pane-a', index: 1, title: 'worker', worktreeId: 'session-a' },
      { handle: 'pane-b', index: 2, title: 'worker', worktreeId: 'session-b' }
    ]
    expect(resolveA2ADispatchTarget(terminals, { to: '@2', worktreeId: 'session-a' })).toEqual({
      error: 'No active terminal found for target "@2" in this session.'
    })
    expect(resolveA2ADispatchTarget(terminals, { to: '@worker', worktreeId: 'session-a' })).toEqual(
      {
        handle: 'pane-a'
      }
    )
  })

  it('keeps a unique unscoped target', () => {
    expect(
      resolveA2ADispatchTarget([{ handle: 'only', index: 3, worktreeId: 'session-a' }], {
        to: '@3'
      })
    ).toEqual({ handle: 'only' })
    expect(a2aEventInSession({ worktreeId: 'session-b' }, 'session-a')).toBe(false)
    expect(a2aEventInSession({ worktreeId: 'session-a' }, 'session-a')).toBe(true)
    expect(a2aEventInSession({}, 'session-a')).toBe(false)
    expect(a2aEventInSession({ worktreeId: 'session-a' }, null)).toBe(false)
  })
})
