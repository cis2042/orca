import { describe, expect, it } from 'vitest'
import {
  resolveShuGeneralPaneAura,
  SHU_GENERAL_PANE_AURA_CLASS,
  SHU_GENERAL_PANE_AURA_WORKING_CLASS
} from './shu-general-pane-aura'

describe('resolveShuGeneralPaneAura', () => {
  it('exports distinct general aura base and working classes', () => {
    expect(SHU_GENERAL_PANE_AURA_CLASS).toBe('terminal-pane-general-aura')
    expect(SHU_GENERAL_PANE_AURA_WORKING_CLASS).toBe('terminal-pane-general-aura-working')
  })

  it('gives a general-titled pane that general colour', () => {
    const aura = resolveShuGeneralPaneAura('#2 趙雲 將軍')
    expect(aura?.general).toBe('趙雲')
    expect(aura?.style).toMatchObject({ '--general-aura': 'var(--a2a-moonlight, #f8fafc)' })
    expect(resolveShuGeneralPaneAura('馬超-xhuman')?.style).toMatchObject({
      '--general-aura': 'var(--a2a-gold, #fbbf24)'
    })
  })

  it('reads the pinned custom title before the live agent title', () => {
    expect(resolveShuGeneralPaneAura('關羽 將軍', '✳ 徐庶關閉')?.general).toBe('關羽')
    expect(resolveShuGeneralPaneAura(null, '✳ Order zhaoyun opus55')?.general).toBe('趙雲')
  })

  it('resolves Guan Yu courtesy aliases and preserves referential identity', () => {
    const aura1 = resolveShuGeneralPaneAura('雲長 將軍')
    const aura2 = resolveShuGeneralPaneAura('關雲長')
    expect(aura1?.general).toBe('關羽')
    expect(aura2?.general).toBe('關羽')
    expect(aura1).toBe(aura2)
    expect(aura1?.style).toMatchObject({
      '--general-aura': 'var(--a2a-leaf, #72ff5a)',
      '--general-aura-core': 'var(--a2a-leaf-soft, #d5ff76)'
    })
  })

  it('leaves ordinary panes alone', () => {
    expect(resolveShuGeneralPaneAura('grok-pkg-3')).toBeNull()
    expect(resolveShuGeneralPaneAura(null)).toBeNull()
  })
})
