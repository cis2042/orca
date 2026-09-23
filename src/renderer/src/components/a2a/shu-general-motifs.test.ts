import { describe, expect, it } from 'vitest'
import { resolveShuGeneralBanner } from './shu-general-motifs'
import { getA2AConnectionMotif, MOTIFS } from './A2AConnectionEffects'

describe('resolveShuGeneralBanner', () => {
  it('maps each general to their own beam', () => {
    expect(resolveShuGeneralBanner({ text: '關羽令：出擊' })?.motif).toBe('foliage')
    expect(resolveShuGeneralBanner({ text: '趙雲令：出擊' })?.motif).toBe('moonlight')
    expect(resolveShuGeneralBanner({ text: '馬超令：出擊' })?.motif).toBe('gold')
    expect(resolveShuGeneralBanner({ text: '姜維令：出擊' })?.motif).toBe('blossom')
    expect(resolveShuGeneralBanner({ text: '魏延令：出擊' })?.motif).toBe('flame')
    expect(resolveShuGeneralBanner({ text: '張飛令：出擊' })?.motif).toBe('thunder')
  })

  it('reads the general from the sending terminal title before the text', () => {
    expect(
      resolveShuGeneralBanner({ sourceTitle: '#2 馬超 將軍', text: '回報趙雲：完成' })?.general
    ).toBe('馬超')
    expect(
      resolveShuGeneralBanner({ fromLabel: 'zhaoyun-xagent', text: 'npm test' })?.general
    ).toBe('趙雲')
  })

  it('accepts a signed order at the start or a name followed by 令/將軍', () => {
    expect(resolveShuGeneralBanner({ text: '【張飛】讀 order 並執行' })?.general).toBe('張飛')
    expect(resolveShuGeneralBanner({ text: '此為姜維將軍的將令' })?.general).toBe('姜維')
    expect(resolveShuGeneralBanner({ text: '請回報給趙雲' })).toBeNull()
    expect(resolveShuGeneralBanner({ text: 'npm test' })).toBeNull()
  })
})

describe('getA2AConnectionMotif', () => {
  const link = { id: 'l1', from: '@2', to: '@5', type: 'send' as const }

  it('lets an explicit motif tag win over the general', () => {
    expect(getA2AConnectionMotif({ ...link, text: 'motif:gold 關羽令：出擊' })).toBe('gold')
  })

  it('uses the general beam when the source terminal is a general', () => {
    expect(getA2AConnectionMotif({ ...link, text: 'npm test' }, '趙雲 將軍')).toBe('moonlight')
  })

  it('falls back to one of the five shared motifs for ordinary links', () => {
    expect(MOTIFS).toContain(getA2AConnectionMotif({ ...link, text: 'npm test' }))
  })
})
