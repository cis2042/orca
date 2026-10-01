import { describe, expect, it } from 'vitest'
import type { A2ALinkEvent } from '../../../../shared/terminal-a2a-link'
import { COMMAND_LINK_DURATION_MS, toBridgeAnimationTrace } from './a2a-command-links'

function link(overrides: Partial<A2ALinkEvent>): A2ALinkEvent {
  return { id: 'l', from: '@1', to: '@2', type: 'message', timestamp: 1, ...overrides }
}

describe('toBridgeAnimationTrace', () => {
  it.each([
    ['message between soldiers', link({ fromLabel: '關興', toLabel: '張苞', text: 'hi' })],
    ['plain send between unnamed terminals', link({ type: 'send', text: 'git status' })],
    ['typed text', link({ type: 'type', text: 'ls' })],
    ['key presses', link({ type: 'keys' })]
  ])('forces the animation for a %s', (_name, trace) => {
    const forced = toBridgeAnimationTrace(trace)
    expect(forced.commandLink).toBe(true)
    expect(forced.durationMs).toBe(COMMAND_LINK_DURATION_MS)
  })

  it('keeps a longer requested duration', () => {
    expect(toBridgeAnimationTrace(link({ durationMs: 20000 })).durationMs).toBe(20000)
  })

  it('keeps every other field of the trace', () => {
    const trace = link({ text: '將令', worktreeId: 'w', targetHandle: 'term_x' })
    expect(toBridgeAnimationTrace(trace)).toMatchObject(trace)
  })
})
