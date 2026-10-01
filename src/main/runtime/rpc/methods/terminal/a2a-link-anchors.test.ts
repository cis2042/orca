import { describe, expect, it } from 'vitest'
import type { RuntimeTerminalSummary } from '../../../../../shared/runtime-terminal-contracts'
import { resolveA2ALinkAnchors } from './a2a-link-anchors'

function terminal(handle: string, worktreeId: string, title: string): RuntimeTerminalSummary {
  return {
    handle,
    ptyId: `pty-${handle}`,
    worktreeId,
    worktreePath: `/w/${worktreeId}`,
    branch: 'main',
    tabId: `tab-${handle}`,
    leafId: `leaf-${handle}`,
    title,
    connected: true,
    writable: true,
    lastOutputAt: null,
    preview: ''
  }
}

describe('resolveA2ALinkAnchors', () => {
  it('places sender and receiver by handle across workspaces', () => {
    const anchors = resolveA2ALinkAnchors(
      [terminal('term_xushu', 'hq', '徐庶'), terminal('term_guanyu', 'front', '關羽')],
      { fromHandle: 'term_xushu', toHandle: 'term_guanyu' }
    )
    expect(anchors.fromAnchor).toEqual({
      handle: 'term_xushu',
      ptyId: 'pty-term_xushu',
      tabId: 'tab-term_xushu',
      leafId: 'leaf-term_xushu',
      worktreeId: 'hq',
      title: '徐庶'
    })
    expect(anchors.toAnchor?.worktreeId).toBe('front')
  })

  it('omits ends it cannot find', () => {
    expect(resolveA2ALinkAnchors([], { fromHandle: 'term_gone' })).toEqual({})
  })
})
