import { describe, expect, it } from 'vitest'
import type { A2ALinkEvent } from '../../../../shared/terminal-a2a-link'
import { isCommandLink, isCommandRoleTitle } from './a2a-command-links'

const noTabTitles = (): string[] => []

function link(overrides: Partial<A2ALinkEvent>): A2ALinkEvent {
  return { id: 'l', from: '@1', to: '@2', type: 'message', timestamp: 1, ...overrides }
}

function anchorTitled(title: string | null, tabId = 'tab'): A2ALinkEvent['fromAnchor'] {
  return { handle: 'h', ptyId: 'p', tabId, leafId: 'leaf', worktreeId: 'w', title }
}

describe('command role titles', () => {
  it.each(['徐庶', '關羽', '馬超 xHuman 將軍', '趙雲將軍席交接', '總參軍', 'Zhao Yun'])(
    'treats %s as a commanding role',
    (title) => {
      expect(isCommandRoleTitle(title)).toBe(true)
    }
  )

  it.each(['✳ 關興', '張苞', '⠋ Respond to greeting', null])(
    'treats %s as a soldier or unknown',
    (title) => {
      expect(isCommandRoleTitle(title)).toBe(false)
    }
  )
})

describe('isCommandLink', () => {
  it('flags strategist to general, general to soldier, and soldier to general', () => {
    expect(
      isCommandLink(
        link({ fromAnchor: anchorTitled('徐庶'), toAnchor: anchorTitled('關羽') }),
        noTabTitles
      )
    ).toBe(true)
    expect(
      isCommandLink(
        link({ fromAnchor: anchorTitled('關羽'), toAnchor: anchorTitled('✳ 關興') }),
        noTabTitles
      )
    ).toBe(true)
    expect(
      isCommandLink(
        link({ fromAnchor: anchorTitled('張苞'), toAnchor: anchorTitled('張飛') }),
        noTabTitles
      )
    ).toBe(true)
  })

  it('uses the stable tab title when an agent has overwritten the pane title', () => {
    const lookup = (_worktreeId: string, tabId: string) => (tabId === 'general-tab' ? ['馬超'] : [])
    expect(
      isCommandLink(
        link({
          fromAnchor: anchorTitled('⠋ Respond to greeting', 'general-tab'),
          toAnchor: anchorTitled('✳ 關興')
        }),
        lookup
      )
    ).toBe(true)
  })

  it('flags orders signed by a general even without anchors', () => {
    expect(isCommandLink(link({ text: '趙雲將令：前軍出發' }), noTabTitles)).toBe(true)
  })

  it('leaves soldier-to-soldier chatter alone', () => {
    expect(
      isCommandLink(
        link({ fromAnchor: anchorTitled('✳ 關興'), toAnchor: anchorTitled('張苞') }),
        noTabTitles
      )
    ).toBe(false)
  })
})
