// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import type { A2ALinkAnchor, A2ALinkEvent } from '../../../../shared/terminal-a2a-link'
import { resolveLinkGeometries } from './a2a-geometry'
import { isLinkInScope } from './a2a-terminal-elements'

function setRect(element: HTMLElement, left: number, top: number): void {
  element.getBoundingClientRect = () => ({
    left,
    top,
    width: 200,
    height: 100,
    right: left + 200,
    bottom: top + 100,
    x: left,
    y: top,
    toJSON: () => {}
  })
}

function appendPane(ptyId: string, tabId: string, left: number, top: number): HTMLElement {
  const pane = document.createElement('div')
  pane.setAttribute('data-anchor-fixture', '')
  pane.setAttribute('data-terminal-tab-id', tabId)
  pane.setAttribute('data-pty-id', ptyId)
  setRect(pane, left, top)
  document.body.append(pane)
  return pane
}

function anchor(handle: string, ptyId: string, tabId: string, worktreeId: string): A2ALinkAnchor {
  return { handle, ptyId, tabId, leafId: `${tabId}-leaf`, worktreeId, title: null }
}

function link(overrides: Partial<A2ALinkEvent>): A2ALinkEvent {
  return {
    id: 'link',
    from: 'term_general',
    to: '@3',
    type: 'message',
    timestamp: 1,
    worktreeId: 'camp',
    ...overrides
  }
}

describe('a2a anchor geometry', () => {
  afterEach(() => {
    document.querySelectorAll('[data-anchor-fixture]').forEach((element) => element.remove())
  })

  it('places both ends on the exact panes named by their pty ids, even inside one split tab', () => {
    appendPane('pty-general', 'tab-camp', 0, 0)
    appendPane('pty-soldier', 'tab-camp', 400, 300)

    const [geometry] = resolveLinkGeometries(
      [
        link({
          fromAnchor: anchor('term_general', 'pty-general', 'tab-camp', 'camp'),
          toAnchor: anchor('term_soldier', 'pty-soldier', 'tab-camp', 'camp')
        })
      ],
      'camp'
    )

    expect(geometry.p1).toEqual({ x: 100, y: 50 })
    expect(geometry.p2).toEqual({ x: 500, y: 350 })
    expect(geometry.pathD).not.toBe('')
  })

  it('does not guess by index when an anchored end is not on screen', () => {
    appendPane('pty-general', 'tab-camp', 0, 0)

    const [geometry] = resolveLinkGeometries(
      [
        link({
          fromAnchor: anchor('term_general', 'pty-general', 'tab-camp', 'camp'),
          toAnchor: anchor('term_far', 'pty-far', 'tab-far', 'other-camp')
        })
      ],
      'camp'
    )

    expect(geometry.p2).toBeNull()
    expect(geometry.pathD).toBe('')
  })

  it('always draws command links, entering from the edge when the other camp is off screen', () => {
    appendPane('pty-general', 'tab-camp', 600, 200)

    const [geometry] = resolveLinkGeometries(
      [
        link({
          worktreeId: 'other-camp',
          commandLink: true,
          fromAnchor: anchor('term_xushu', 'pty-xushu', 'tab-xushu', 'other-camp'),
          toAnchor: anchor('term_general', 'pty-general', 'tab-camp', 'camp')
        })
      ],
      'camp'
    )

    expect(geometry.p1?.x).toBe(18)
    expect(geometry.p2).toEqual({ x: 700, y: 250 })
    expect(geometry.pathD).not.toBe('')
  })

  it('keeps a link in scope when either anchored end lives in the active workspace', () => {
    const crossCamp = link({
      worktreeId: 'other-camp',
      toAnchor: anchor('term_general', 'pty-general', 'tab-camp', 'camp')
    })
    expect(isLinkInScope(crossCamp, 'camp')).toBe(true)
    expect(isLinkInScope(link({ worktreeId: 'other-camp' }), 'camp')).toBe(false)
    expect(isLinkInScope(link({ worktreeId: 'other-camp', commandLink: true }), 'camp')).toBe(true)
  })
})
