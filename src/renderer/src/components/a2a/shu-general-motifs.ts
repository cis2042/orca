import type { A2AConnectionMotif } from './A2AConnectionEffects'

export type ShuGeneral = '關羽' | '趙雲' | '馬超' | '姜維' | '魏延' | '張飛'

export type ShuGeneralBanner = {
  general: ShuGeneral
  motif: A2AConnectionMotif
  aliases: readonly string[]
}

export const SHU_GENERAL_BANNERS: readonly ShuGeneralBanner[] = [
  { general: '關羽', motif: 'foliage', aliases: ['關羽', '关羽', 'guanyu', 'guan yu'] },
  { general: '趙雲', motif: 'moonlight', aliases: ['趙雲', '赵云', 'zhaoyun', 'zhao yun'] },
  { general: '馬超', motif: 'gold', aliases: ['馬超', '马超', 'machao', 'ma chao'] },
  { general: '姜維', motif: 'blossom', aliases: ['姜維', '姜维', 'jiangwei', 'jiang wei'] },
  { general: '魏延', motif: 'flame', aliases: ['魏延', 'weiyan', 'wei yan'] },
  { general: '張飛', motif: 'thunder', aliases: ['張飛', '张飞', 'zhangfei', 'zhang fei'] }
]

const ORDER_SUFFIX = /^(令|將令|军令|軍令|將軍|将军|部|軍|军)/u

function bannerNamedIn(source: string): ShuGeneralBanner | null {
  const lowered = source.toLowerCase()
  return (
    SHU_GENERAL_BANNERS.find((banner) =>
      banner.aliases.some((alias) => lowered.includes(alias.toLowerCase()))
    ) ?? null
  )
}

function bannerSigningOrder(text: string): ShuGeneralBanner | null {
  const trimmed = text.trim().replace(/^[【[（(「『]\s*/u, '')
  const lowered = trimmed.toLowerCase()
  for (const banner of SHU_GENERAL_BANNERS) {
    for (const alias of banner.aliases) {
      const loweredAlias = alias.toLowerCase()
      if (lowered.startsWith(loweredAlias)) {
        return banner
      }
      const at = lowered.indexOf(loweredAlias)
      if (at > 0 && ORDER_SUFFIX.test(lowered.slice(at + loweredAlias.length))) {
        return banner
      }
    }
  }
  return null
}

export function resolveShuGeneralBanner(input: {
  sourceTitle?: string | null
  fromLabel?: string | null
  text?: string | null
}): ShuGeneralBanner | null {
  return (
    (input.sourceTitle ? bannerNamedIn(input.sourceTitle) : null) ??
    (input.fromLabel ? bannerNamedIn(input.fromLabel) : null) ??
    (input.text ? bannerSigningOrder(input.text) : null)
  )
}
