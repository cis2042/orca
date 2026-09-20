import React from 'react'
import { formatA2AFrequency, type A2ADirectedConnection } from './a2a-telemetry'
import { A2AConnectionEffects, getA2AConnectionMotif } from './A2AConnectionEffects'

type Point = { x: number; y: number }

type AgentTopologyEdgesProps = {
  edges: A2ADirectedConnection[]
  nodePositions: Map<number, Point>
  hoveredEdgeId: string | null
  selectedAgentIndex: number | null
  setHoveredEdgeId: (id: string | null) => void
  replayTrace: (id: string) => void
}

export function AgentTopologyEdges({
  edges,
  nodePositions,
  hoveredEdgeId,
  selectedAgentIndex,
  setHoveredEdgeId,
  replayTrace
}: AgentTopologyEdgesProps): React.JSX.Element {
  return (
    <>
      {edges.map((edge) => {
        const p1 = nodePositions.get(edge.fromIndex)
        const p2 = nodePositions.get(edge.toIndex)
        if (!p1 || !p2) {
          return null
        }

        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const cx = (p1.x + p2.x) / 2 - dy * 0.18
        const cy = (p1.y + p2.y) / 2 + dx * 0.18
        const pathD = `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`
        const isHovered = hoveredEdgeId === edge.id
        const isEdgeSelected =
          selectedAgentIndex === edge.fromIndex || selectedAgentIndex === edge.toIndex

        return (
          <g
            key={edge.id}
            className="a2a-topology-edge cursor-pointer transition-opacity"
            role="group"
            aria-label={`#${edge.fromIndex} → #${edge.toIndex}, ${formatA2AFrequency(edge.frequencyPerMinute)}`}
            onMouseEnter={() => setHoveredEdgeId(edge.id)}
            onMouseLeave={() => setHoveredEdgeId(null)}
            onClick={() => replayTrace(edge.latestTrace.id)}
          >
            <path d={pathD} fill="none" stroke="transparent" strokeWidth="24" />
            <path
              d={pathD}
              fill="none"
              className={edge.isActive ? 'a2a-topology-flow' : undefined}
              stroke={
                edge.isActive
                  ? 'url(#topo-edge-active)'
                  : isEdgeSelected
                    ? 'var(--a2a-source)'
                    : 'url(#topo-edge-idle)'
              }
              strokeWidth={edge.isActive ? 3 : isEdgeSelected ? 2.5 : 1.5}
              strokeDasharray={edge.isActive ? '6 4' : undefined}
              markerEnd={edge.isActive ? 'url(#topo-arrow-active)' : 'url(#topo-arrow-idle)'}
            />
            {edge.isActive && (
              <A2AConnectionEffects
                pathD={pathD}
                motif={getA2AConnectionMotif(edge.latestTrace)}
                compact
              />
            )}
            <title>
              #{edge.fromIndex} → #{edge.toIndex} · {formatA2AFrequency(edge.frequencyPerMinute)} ·{' '}
              {edge.count} events
            </title>

            {edge.isActive && (
              <circle
                className="a2a-topology-packet"
                r="4"
                fill="var(--foreground)"
                stroke="var(--a2a-flow)"
                strokeWidth="2"
              >
                <animateMotion path={pathD} dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}

            <g
              transform={`translate(${cx}, ${cy})`}
              opacity={edge.isActive || isHovered || isEdgeSelected ? 1 : 0.82}
            >
              <rect
                x="-68"
                y="-16"
                width="136"
                height="32"
                rx="8"
                fill="var(--a2a-canvas)"
                stroke={edge.isActive ? 'var(--a2a-flow)' : 'var(--a2a-idle)'}
                strokeWidth="1"
              />
              <text
                x="0"
                y="-3"
                textAnchor="middle"
                fill="var(--a2a-source-soft)"
                fontSize="9.5"
                fontWeight="700"
                fontFamily="monospace"
              >
                #{edge.fromIndex} → #{edge.toIndex}
              </text>
              <text
                x="0"
                y="9"
                textAnchor="middle"
                fill="var(--a2a-flow-soft)"
                fontSize="8"
                fontFamily="monospace"
              >
                {formatA2AFrequency(edge.frequencyPerMinute)} · {edge.count} events
              </text>
            </g>
          </g>
        )
      })}
    </>
  )
}
