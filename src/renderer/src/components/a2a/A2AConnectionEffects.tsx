import React from 'react'
import type { A2ALinkEvent } from '../../../../shared/terminal-a2a-link'
import { resolveShuGeneralBanner } from './shu-general-motifs'
import { BlossomMotif, GoldMotif, MoonlightMotif, ThunderMotif } from './ShuGeneralMotifCarriers'

export type A2AConnectionMotif =
  | 'flame'
  | 'foliage'
  | 'chain'
  | 'water'
  | 'tornado'
  | 'moonlight'
  | 'gold'
  | 'blossom'
  | 'thunder'

export type MotifPalette = {
  label: string
  icon: string
  sourceColor: string
  targetColor: string
  flowColor: string
  coreColor: string
  gradientId: string
  markerId: string
}

export const MOTIF_PALETTES: Record<A2AConnectionMotif, MotifPalette> = {
  flame: {
    label: '烈焰',
    icon: '🔥',
    sourceColor: 'var(--a2a-flame, #ff6b00)',
    targetColor: 'var(--a2a-flame-core, #ffe600)',
    flowColor: 'var(--a2a-flame, #ff6b00)',
    coreColor: 'var(--a2a-flame-core, #ffe600)',
    gradientId: 'a2a-beam-gradient-flame',
    markerId: 'a2a-arrow-flame'
  },
  foliage: {
    label: '綠葉藤蔓',
    icon: '🌿',
    sourceColor: 'var(--a2a-leaf, #72ff5a)',
    targetColor: 'var(--a2a-leaf-soft, #d5ff76)',
    flowColor: 'var(--a2a-leaf, #72ff5a)',
    coreColor: 'var(--a2a-leaf-soft, #d5ff76)',
    gradientId: 'a2a-beam-gradient-foliage',
    markerId: 'a2a-arrow-foliage'
  },
  chain: {
    label: '金屬鎖鏈',
    icon: '⛓️',
    sourceColor: 'var(--a2a-chain, #c7d2fe)',
    targetColor: 'var(--a2a-chain-hot, #f0abfc)',
    flowColor: 'var(--a2a-chain, #c7d2fe)',
    coreColor: 'var(--a2a-chain-hot, #f0abfc)',
    gradientId: 'a2a-beam-gradient-chain',
    markerId: 'a2a-arrow-chain'
  },
  water: {
    label: '冰藍流水',
    icon: '💧',
    sourceColor: 'var(--a2a-water, #38bdf8)',
    targetColor: 'var(--a2a-water-hot, #a5f3fc)',
    flowColor: 'var(--a2a-water, #38bdf8)',
    coreColor: 'var(--a2a-water-hot, #a5f3fc)',
    gradientId: 'a2a-beam-gradient-water',
    markerId: 'a2a-arrow-water'
  },
  tornado: {
    label: '洋紅旋風',
    icon: '🌪️',
    sourceColor: 'var(--a2a-tornado, #d946ef)',
    targetColor: 'var(--a2a-flow, #00e5ff)',
    flowColor: 'var(--a2a-tornado, #d946ef)',
    coreColor: 'var(--a2a-flow-soft, #a5f3fc)',
    gradientId: 'a2a-beam-gradient-tornado',
    markerId: 'a2a-arrow-tornado'
  },
  moonlight: {
    label: '趙雲白光',
    icon: '🌙',
    sourceColor: 'var(--a2a-moonlight, #f8fafc)',
    targetColor: 'var(--a2a-moonlight-soft, #cbd5e1)',
    flowColor: 'var(--a2a-moonlight, #f8fafc)',
    coreColor: 'var(--a2a-moonlight, #f8fafc)',
    gradientId: 'a2a-beam-gradient-moonlight',
    markerId: 'a2a-arrow-moonlight'
  },
  gold: {
    label: '馬超金光',
    icon: '⚜️',
    sourceColor: 'var(--a2a-gold, #fbbf24)',
    targetColor: 'var(--a2a-gold-core, #fff3b0)',
    flowColor: 'var(--a2a-gold, #fbbf24)',
    coreColor: 'var(--a2a-gold-core, #fff3b0)',
    gradientId: 'a2a-beam-gradient-gold',
    markerId: 'a2a-arrow-gold'
  },
  blossom: {
    label: '姜維粉櫻',
    icon: '🌸',
    sourceColor: 'var(--a2a-blossom, #f472b6)',
    targetColor: 'var(--a2a-blossom-soft, #fbcfe8)',
    flowColor: 'var(--a2a-blossom, #f472b6)',
    coreColor: 'var(--a2a-blossom-soft, #fbcfe8)',
    gradientId: 'a2a-beam-gradient-blossom',
    markerId: 'a2a-arrow-blossom'
  },
  thunder: {
    label: '張飛紫電',
    icon: '⚡',
    sourceColor: 'var(--a2a-thunder, #8b5cf6)',
    targetColor: 'var(--a2a-thunder-core, #e9d5ff)',
    flowColor: 'var(--a2a-thunder, #8b5cf6)',
    coreColor: 'var(--a2a-thunder-core, #e9d5ff)',
    gradientId: 'a2a-beam-gradient-thunder',
    markerId: 'a2a-arrow-thunder'
  }
}

export type A2AConnectionEffectsProps = {
  pathD: string
  motif: A2AConnectionMotif
  compact?: boolean
}

export const MOTIFS: A2AConnectionMotif[] = ['flame', 'foliage', 'chain', 'water', 'tornado']

export const GENERAL_MOTIFS: A2AConnectionMotif[] = ['moonlight', 'gold', 'blossom', 'thunder']

const ALL_MOTIFS: A2AConnectionMotif[] = [...MOTIFS, ...GENERAL_MOTIFS]

function taggedMotif(text: string | undefined): A2AConnectionMotif | undefined {
  const tag = text?.match(/motif:([a-z]+)/i)?.[1]?.toLowerCase()
  return ALL_MOTIFS.find((motif) => motif === tag)
}

function hashedMotif(link: Pick<A2ALinkEvent, 'id' | 'from' | 'to' | 'type'>): A2AConnectionMotif {
  const key = `${link.id}:${link.from}:${link.to}:${link.type}`
  let hash = 0
  for (const character of key) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }
  return MOTIFS[hash % MOTIFS.length]
}

export function getA2AConnectionMotif(
  link: Pick<A2ALinkEvent, 'id' | 'from' | 'to' | 'type'> &
    Pick<A2ALinkEvent, 'text' | 'fromLabel'>,
  sourceTitle?: string | null
): A2AConnectionMotif {
  return (
    taggedMotif(link.text) ??
    resolveShuGeneralBanner({ sourceTitle, fromLabel: link.fromLabel, text: link.text })?.motif ??
    hashedMotif(link)
  )
}

function DirectionArrow({ pathD, compact }: Pick<A2AConnectionEffectsProps, 'pathD' | 'compact'>) {
  return (
    <g className="a2a-direction-carrier">
      <animateMotion
        path={pathD}
        dur={compact ? '1.55s' : '1.05s'}
        begin={compact ? '-0.58s' : '-0.32s'}
        repeatCount="indefinite"
        rotate="auto"
      />
      <path
        d="M -12 -7 L 0 0 L -12 7"
        fill="none"
        stroke="var(--a2a-target)"
        strokeWidth={compact ? 1.6 : 2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

function FlameMotif({ pathD, compact }: Pick<A2AConnectionEffectsProps, 'pathD' | 'compact'>) {
  return (
    <g className="a2a-motif-carrier a2a-motif-flame-carrier">
      <animateMotion
        path={pathD}
        dur={compact ? '1.7s' : '1.15s'}
        begin={compact ? '-0.9s' : '-0.45s'}
        repeatCount="indefinite"
        rotate="auto"
      />
      <path className="a2a-motif-flame-tail" d="M -28 0 C -18 -7 -8 -7 2 -2 C -8 2 -18 7 -28 0 Z" />
      <path
        className="a2a-motif-flame-core"
        d="M -4 0 C -1 -13 8 -13 9 -4 C 17 1 8 10 -1 9 C -6 7 -8 3 -4 0 Z"
      />
      <circle className="a2a-motif-ember" cx="15" cy="-1" r="2.2" />
    </g>
  )
}

function FoliageMotif({ pathD, compact }: Pick<A2AConnectionEffectsProps, 'pathD' | 'compact'>) {
  return (
    <g className="a2a-motif-carrier a2a-motif-foliage-carrier">
      <animateMotion
        path={pathD}
        dur={compact ? '2s' : '1.35s'}
        begin={compact ? '-0.75s' : '-0.4s'}
        repeatCount="indefinite"
        rotate="auto"
      />
      <path className="a2a-motif-vine" d="M -29 2 Q -14 -8 0 1 T 29 -1" />
      <path className="a2a-motif-leaf" d="M -18 -6 C -8 -14 0 -12 3 -5 C -5 0 -12 0 -18 -6 Z" />
      <path className="a2a-motif-leaf" d="M -1 7 C 8 -2 16 -1 18 6 C 10 11 4 11 -1 7 Z" />
      <path
        className="a2a-motif-leaf-soft"
        d="M 12 -9 C 19 -16 27 -13 28 -7 C 22 -2 16 -3 12 -9 Z"
      />
    </g>
  )
}

function ChainMotif({ pathD, compact }: Pick<A2AConnectionEffectsProps, 'pathD' | 'compact'>) {
  return (
    <g className="a2a-motif-carrier a2a-motif-chain-carrier">
      <animateMotion
        path={pathD}
        dur={compact ? '2.15s' : '1.45s'}
        begin={compact ? '-1.2s' : '-0.72s'}
        repeatCount="indefinite"
        rotate="auto"
      />
      <rect
        className="a2a-motif-chain-link"
        x="-27"
        y="-6"
        width="19"
        height="12"
        rx="6"
        transform="rotate(22 -18 0)"
      />
      <rect
        className="a2a-motif-chain-link"
        x="-7"
        y="-6"
        width="19"
        height="12"
        rx="6"
        transform="rotate(-22 2 0)"
      />
      <rect
        className="a2a-motif-chain-link-hot"
        x="13"
        y="-6"
        width="19"
        height="12"
        rx="6"
        transform="rotate(22 22 0)"
      />
    </g>
  )
}

function WaterMotif({ pathD, compact }: Pick<A2AConnectionEffectsProps, 'pathD' | 'compact'>) {
  return (
    <g className="a2a-motif-carrier a2a-motif-water-carrier">
      <animateMotion
        path={pathD}
        dur={compact ? '1.9s' : '1.25s'}
        begin={compact ? '-0.95s' : '-0.5s'}
        repeatCount="indefinite"
        rotate="auto"
      />
      <path className="a2a-motif-water-column" d="M 0 -24 C -7 -15 7 -12 0 -3 C -4 2 -4 8 0 12" />
      <path className="a2a-motif-water-splash" d="M -9 9 C -5 3 -2 3 0 8 C 3 2 7 3 11 9" />
      <circle className="a2a-motif-water-drop" cx="-13" cy="-11" r="2.3" />
      <circle className="a2a-motif-water-drop" cx="13" cy="4" r="1.8" />
    </g>
  )
}

function TornadoMotif({ pathD, compact }: Pick<A2AConnectionEffectsProps, 'pathD' | 'compact'>) {
  return (
    <g className="a2a-motif-carrier a2a-motif-tornado-carrier">
      <animateMotion
        path={pathD}
        dur={compact ? '2.05s' : '1.3s'}
        begin={compact ? '-1.05s' : '-0.55s'}
        repeatCount="indefinite"
        rotate="auto"
      />
      <g className="a2a-motif-tornado-spin">
        <path
          className="a2a-motif-tornado-arc"
          d="M -22 -15 C -5 -25 15 -21 22 -10 C 14 -5 -3 -8 -17 0"
        />
        <path
          className="a2a-motif-tornado-arc-soft"
          d="M -20 0 C -5 -10 11 -8 20 1 C 10 7 -4 9 -15 16"
        />
        <path className="a2a-motif-tornado-arc" d="M -13 18 C -3 10 6 10 14 15" />
        <ellipse className="a2a-motif-tornado-eye" cx="0" cy="0" rx="5" ry="3" />
      </g>
    </g>
  )
}

export function A2AConnectionEffects({
  pathD,
  motif,
  compact = false
}: A2AConnectionEffectsProps): React.JSX.Element {
  const motifProps = { pathD, compact }

  return (
    <g className={`a2a-connection-effects a2a-connection-effects-${motif}`} aria-hidden="true">
      <DirectionArrow {...motifProps} />
      {motif === 'flame' && <FlameMotif {...motifProps} />}
      {motif === 'foliage' && <FoliageMotif {...motifProps} />}
      {motif === 'chain' && <ChainMotif {...motifProps} />}
      {motif === 'water' && <WaterMotif {...motifProps} />}
      {motif === 'tornado' && <TornadoMotif {...motifProps} />}
      {motif === 'moonlight' && <MoonlightMotif {...motifProps} />}
      {motif === 'gold' && <GoldMotif {...motifProps} />}
      {motif === 'blossom' && <BlossomMotif {...motifProps} />}
      {motif === 'thunder' && <ThunderMotif {...motifProps} />}
    </g>
  )
}
