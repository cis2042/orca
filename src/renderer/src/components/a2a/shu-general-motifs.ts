import type { A2AConnectionMotif } from './A2AConnectionEffects'

export type ShuGeneral = '關羽' | '趙雲' | '馬超' | '姜維' | '魏延' | '張飛'

export type ShuGeneralBanner = {
  general: ShuGeneral
  motif: A2AConnectionMotif
  aliases: readonly string[]
}

export const SHU_GENERAL_BANNERS: readonly ShuGeneralBanner[] = [
  {
    general: '關羽',
    motif: 'foliage',
    aliases: [
      '關羽',
      '关羽',
      '關雲長',
      '关云长',
      '雲長',
      '云长',
      '關公',
      '关公',
      '關二爺',
      '关二爷',
      '二爺',
      '二爷',
      '漢壽亭侯',
      '汉寿亭侯',
      '壽亭侯',
      '寿亭侯',
      '美髯公',
      'guanyu',
      'guan yu',
      'yunchang',
      'yun chang',
      'guanyunchang',
      'guan yunchang'
    ]
  },
  {
    general: '趙雲',
    motif: 'moonlight',
    aliases: [
      '趙雲',
      '赵云',
      '趙子龍',
      '赵子龙',
      '子龍',
      '子龙',
      '常山趙子龍',
      '常山赵子龙',
      'zhaoyun',
      'zhao yun',
      'zilong',
      'zi long'
    ]
  },
  {
    general: '馬超',
    motif: 'gold',
    aliases: ['馬超', '马超', '馬孟起', '马孟起', '孟起', 'machao', 'ma chao', 'mengqi']
  },
  {
    general: '姜維',
    motif: 'blossom',
    aliases: ['姜維', '姜维', '姜伯約', '姜伯约', '伯約', '伯约', 'jiangwei', 'jiang wei', 'boyue']
  },
  {
    general: '魏延',
    motif: 'flame',
    aliases: ['魏延', '魏文長', '魏文长', '文長', '文长', 'weiyan', 'wei yan', 'wenchang']
  },
  {
    general: '張飛',
    motif: 'thunder',
    aliases: ['張飛', '张飞', '張翼德', '张翼德', '翼德', 'zhangfei', 'zhang fei', 'yide']
  }
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
