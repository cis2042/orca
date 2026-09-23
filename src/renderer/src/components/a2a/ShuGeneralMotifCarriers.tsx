import type { A2AConnectionEffectsProps } from './A2AConnectionEffects'

export function MoonlightMotif({
  pathD,
  compact
}: Pick<A2AConnectionEffectsProps, 'pathD' | 'compact'>) {
  return (
    <g className="a2a-motif-carrier a2a-motif-moonlight-carrier">
      <animateMotion
        path={pathD}
        dur={compact ? '1.6s' : '1.05s'}
        begin={compact ? '-0.8s' : '-0.4s'}
        repeatCount="indefinite"
        rotate="auto"
      />
      <path
        className="a2a-motif-moonlight-tail"
        d="M -34 0 C -22 -6 -10 -6 4 -1 C -10 1 -22 6 -34 0 Z"
      />
      <circle className="a2a-motif-moonlight-core" cx="6" cy="0" r="5" />
      <path
        className="a2a-motif-moonlight-spark"
        d="M 16 -9 L 17.5 -5.5 L 21 -4 L 17.5 -2.5 L 16 1 L 14.5 -2.5 L 11 -4 L 14.5 -5.5 Z"
      />
      <path
        className="a2a-motif-moonlight-spark"
        d="M -6 8 L -5 10.5 L -2.5 11.5 L -5 12.5 L -6 15 L -7 12.5 L -9.5 11.5 L -7 10.5 Z"
      />
    </g>
  )
}

export function GoldMotif({
  pathD,
  compact
}: Pick<A2AConnectionEffectsProps, 'pathD' | 'compact'>) {
  return (
    <g className="a2a-motif-carrier a2a-motif-gold-carrier">
      <animateMotion
        path={pathD}
        dur={compact ? '1.5s' : '0.95s'}
        begin={compact ? '-0.7s' : '-0.3s'}
        repeatCount="indefinite"
        rotate="auto"
      />
      <path className="a2a-motif-gold-shaft" d="M -30 0 L 4 0" />
      <path className="a2a-motif-gold-blade" d="M 2 -6 L 20 0 L 2 6 L 6 0 Z" />
      <circle className="a2a-motif-gold-ring" cx="-12" cy="0" r="5" />
      <circle className="a2a-motif-gold-ring" cx="-24" cy="0" r="3.5" />
    </g>
  )
}

export function BlossomMotif({
  pathD,
  compact
}: Pick<A2AConnectionEffectsProps, 'pathD' | 'compact'>) {
  return (
    <g className="a2a-motif-carrier a2a-motif-blossom-carrier">
      <animateMotion
        path={pathD}
        dur={compact ? '2.1s' : '1.4s'}
        begin={compact ? '-1s' : '-0.5s'}
        repeatCount="indefinite"
        rotate="auto"
      />
      <g className="a2a-motif-blossom-bloom">
        <ellipse className="a2a-motif-petal" cx="0" cy="-7" rx="4" ry="7" />
        <ellipse
          className="a2a-motif-petal"
          cx="6.5"
          cy="-2"
          rx="4"
          ry="7"
          transform="rotate(72 6.5 -2)"
        />
        <ellipse
          className="a2a-motif-petal"
          cx="4"
          cy="6"
          rx="4"
          ry="7"
          transform="rotate(144 4 6)"
        />
        <ellipse
          className="a2a-motif-petal"
          cx="-4"
          cy="6"
          rx="4"
          ry="7"
          transform="rotate(216 -4 6)"
        />
        <ellipse
          className="a2a-motif-petal"
          cx="-6.5"
          cy="-2"
          rx="4"
          ry="7"
          transform="rotate(288 -6.5 -2)"
        />
        <circle className="a2a-motif-blossom-heart" cx="0" cy="0" r="2.4" />
      </g>
      <ellipse
        className="a2a-motif-petal-soft"
        cx="-20"
        cy="-8"
        rx="2.5"
        ry="4.5"
        transform="rotate(-35 -20 -8)"
      />
      <ellipse
        className="a2a-motif-petal-soft"
        cx="-27"
        cy="6"
        rx="2.2"
        ry="4"
        transform="rotate(30 -27 6)"
      />
    </g>
  )
}

export function ThunderMotif({
  pathD,
  compact
}: Pick<A2AConnectionEffectsProps, 'pathD' | 'compact'>) {
  return (
    <g className="a2a-motif-carrier a2a-motif-thunder-carrier">
      <animateMotion
        path={pathD}
        dur={compact ? '1.3s' : '0.85s'}
        begin={compact ? '-0.6s' : '-0.25s'}
        repeatCount="indefinite"
        rotate="auto"
      />
      <path className="a2a-motif-bolt" d="M -6 -16 L 4 -3 L -2 -3 L 8 14 L -4 1 L 2 1 Z" />
      <path className="a2a-motif-bolt-arc" d="M -30 -4 L -22 -9 L -16 -1 L -10 -7" />
      <path className="a2a-motif-bolt-arc" d="M -28 8 L -20 4 L -15 10 L -9 5" />
    </g>
  )
}
