import { describe, expect, it } from 'vitest'
import { resolveShuGeneralPaneAura } from './shu-general-pane-aura'

describe('resolveShuGeneralPaneAura', () => {
  it('gives a general-titled pane that general colour', () => {
    const aura = resolveShuGeneralPaneAura('#2 趙雲 將軍')
    expect(aura?.general).toBe('趙雲')
    expect(aura?.style).toMatchObject({ '--general-aura': 'var(--a2a-moonlight, #f8fafc)' })
    expect(resolveShuGeneralPaneAura('馬超-xhuman')?.style).toMatchObject({
      '--general-aura': 'var(--a2a-gold, #fbbf24)'
    })
  })

  it('leaves ordinary panes alone', () => {
    expect(resolveShuGeneralPaneAura('grok-pkg-3')).toBeNull()
    expect(resolveShuGeneralPaneAura(null)).toBeNull()
  })
})
