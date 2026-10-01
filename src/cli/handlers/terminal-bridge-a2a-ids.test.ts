import { afterEach, describe, expect, it, vi } from 'vitest'
import { callerTerminalHandle, toA2AWorktreeId } from './terminal-bridge-ops'

describe('A2A trace identifiers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('keeps worktree ids and drops selectors the renderer cannot match', () => {
    expect(toA2AWorktreeId('id:repo::/w/camp')).toBe('repo::/w/camp')
    expect(toA2AWorktreeId('repo::/w/camp')).toBe('repo::/w/camp')
    expect(toA2AWorktreeId('path:/w/camp')).toBeUndefined()
    expect(toA2AWorktreeId('name:camp')).toBeUndefined()
    expect(toA2AWorktreeId('branch:main')).toBeUndefined()
    expect(toA2AWorktreeId(undefined)).toBeUndefined()
  })

  it('reports the calling terminal handle only when the CLI runs inside a terminal', () => {
    vi.stubEnv('ORCA_TERMINAL_HANDLE', 'term_general')
    expect(callerTerminalHandle()).toBe('term_general')
    vi.stubEnv('ORCA_TERMINAL_HANDLE', '')
    expect(callerTerminalHandle()).toBeUndefined()
  })
})
