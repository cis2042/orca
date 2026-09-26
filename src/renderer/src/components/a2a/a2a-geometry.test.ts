// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import type { A2ALinkEvent } from '../../../../shared/terminal-a2a-link'
import { findTerminalElement, resolveLinkGeometries } from './a2a-geometry'

function setRect(element: HTMLElement, left: number, top: number): void {
  element.getBoundingClientRect = () => ({
    left,
    top,
    width: 120,
    height: 40,
    right: left + 120,
    bottom: top + 40,
    x: left,
    y: top,
    toJSON: () => {}
  })
}

function appendTab(index: number, worktreeId: string, left: number): void {
  const tab = document.createElement('div')
  tab.setAttribute('data-a2a-geometry-fixture', '')
  tab.setAttribute('data-tab-id', `${worktreeId}-${index}`)
  tab.setAttribute('data-worktree-id', worktreeId)
  tab.setAttribute('data-terminal-index', String(index))
  tab.setAttribute('data-tab-title', `Agent ${index}`)
  setRect(tab, left, 20)
  document.body.append(tab)
}

function link(worktreeId: string): A2ALinkEvent {
  return {
    id: `link-${worktreeId}`,
    from: '@1',
    to: '@2',
    fromIndex: 1,
    toIndex: 2,
    type: 'send',
    timestamp: 1,
    worktreeId
  }
}

describe('a2a session geometry', () => {
  afterEach(() => {
    document.querySelectorAll('[data-a2a-geometry-fixture]').forEach((element) => element.remove())
  })

  it('draws a beam only inside the session that owns the link', () => {
    appendTab(1, 'session-a', 10)
    appendTab(2, 'session-a', 200)
    appendTab(1, 'session-b', 400)
    appendTab(2, 'session-b', 600)

    const [current, other] = resolveLinkGeometries(
      [link('session-a'), link('session-b')],
      'session-a'
    )
    expect(current.pathD).not.toBe('')
    expect(other.pathD).toBe('')
    expect(findTerminalElement(2, '@2', 'session-b')?.getAttribute('data-worktree-id')).toBe(
      'session-b'
    )
  })

  it('generates a graceful in-session fallback beam even when terminal panes are not rendered', () => {
    appendTab(1, 'session-c', 50)
    appendTab(2, 'session-c', 250)
    const [result] = resolveLinkGeometries([link('session-c')], 'session-c')
    expect(result.pathD).not.toBe('')
    expect(result.p1).not.toBeNull()
    expect(result.p2).not.toBeNull()
  })
})
