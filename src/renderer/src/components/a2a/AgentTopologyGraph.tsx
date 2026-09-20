import React, { useMemo, useState } from 'react'
import { useA2AStore } from '../../store/a2a-traces-store'
import { useAppStore } from '../../store'
import { A2ATelemetrySummary } from './A2ATelemetrySummary'
import { AgentTopologyEdges } from './AgentTopologyEdges'
import { AgentTopologyInspector } from './AgentTopologyInspector'
import { summarizeA2AConnections, type A2ADirectedConnection } from './a2a-telemetry'

export type AgentNodeData = {
  index: number
  label: string
  role: string
  isActive: boolean
  isCommunicating: boolean
  lastSeenAt: number
  color?: string | null
  tabId?: string
}

function getRoleName(index: number, fallbackLabel?: string): string {
  if (fallbackLabel && fallbackLabel.trim() && !fallbackLabel.startsWith('@')) {
    return fallbackLabel
  }
  switch (index) {
    case 1:
      return 'Supervisor (總調度)'
    case 2:
      return 'Worker (執行專員)'
    case 3:
      return 'Researcher (資料研究)'
    case 4:
      return 'Architect (架構工程)'
    case 5:
      return 'Test & QA (測試驗證)'
    case 8:
      return 'Reviewer (審查把關)'
    default:
      return `Agent #${index}`
  }
}

export function AgentTopologyGraph(): React.JSX.Element {
  const activeLinks = useA2AStore((s) => s.activeLinks)
  const recentTraces = useA2AStore((s) => s.recentTraces)
  const selectedAgentIndex = useA2AStore((s) => s.selectedAgentIndex)
  const setSelectedAgentIndex = useA2AStore((s) => s.setSelectedAgentIndex)
  const replayTrace = useA2AStore((s) => s.replayTrace)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [renderedAt] = useState(() => Date.now())

  const tabsByWorktree = useAppStore((s) => s.tabsByWorktree)
  const activeWorktreeId = Object.keys(tabsByWorktree)[0] || ''
  const currentTabs = useMemo(
    () => tabsByWorktree[activeWorktreeId] ?? [],
    [tabsByWorktree, activeWorktreeId]
  )

  const telemetry = useMemo(
    () => summarizeA2AConnections(recentTraces, activeLinks),
    [recentTraces, activeLinks]
  )

  // Discover all distinct agent indexes from recent traces and DOM
  const agents = useMemo<AgentNodeData[]>(() => {
    const indexMap = new Map<number, { label?: string; lastSeen: number }>()

    // Check DOM for open tabs with terminal index
    if (typeof document !== 'undefined') {
      const tabElements = document.querySelectorAll('[data-terminal-index]')
      tabElements.forEach((el) => {
        const raw = el.getAttribute('data-terminal-index')
        const idx = raw ? Number.parseInt(raw, 10) : Number.NaN
        if (Number.isFinite(idx) && idx > 0) {
          const tabText = el.textContent?.trim() || ''
          indexMap.set(idx, { label: tabText, lastSeen: renderedAt })
        }
      })
    }

    // Check recent traces
    for (const trace of recentTraces) {
      if (trace.fromIndex) {
        const existing = indexMap.get(trace.fromIndex)
        indexMap.set(trace.fromIndex, {
          label: trace.fromLabel || existing?.label,
          lastSeen: Math.max(existing?.lastSeen || 0, trace.timestamp)
        })
      }
      if (trace.toIndex) {
        const existing = indexMap.get(trace.toIndex)
        indexMap.set(trace.toIndex, {
          label: trace.toLabel || existing?.label,
          lastSeen: Math.max(existing?.lastSeen || 0, trace.timestamp)
        })
      }
    }

    // Default agents if none yet
    if (indexMap.size === 0) {
      indexMap.set(1, { lastSeen: renderedAt })
      indexMap.set(2, { lastSeen: renderedAt })
      indexMap.set(5, { lastSeen: renderedAt })
    }

    const sortedIndexes = Array.from(indexMap.keys()).sort((a, b) => a - b)
    const now = renderedAt

    return sortedIndexes.map((idx) => {
      const info = indexMap.get(idx)
      const isCommunicating = activeLinks.some((l) => l.fromIndex === idx || l.toIndex === idx)
      const isActive = isCommunicating || (info?.lastSeen ? now - info.lastSeen < 15000 : false)
      const tab = currentTabs[idx - 1]
      return {
        index: idx,
        label: info?.label || `@${idx}`,
        role: getRoleName(idx, info?.label),
        isActive,
        isCommunicating,
        lastSeenAt: info?.lastSeen || 0,
        color: tab?.color ?? null,
        tabId: tab?.id
      }
    })
  }, [recentTraces, activeLinks, currentTabs, renderedAt])

  // Compute node positions on an SVG coordinate space (680 x 380)
  const nodePositions = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>()
    const count = agents.length
    const width = 680
    const height = 360
    const centerX = width / 2
    const centerY = height / 2

    if (count === 1) {
      map.set(agents[0].index, { x: centerX, y: centerY })
    } else if (count === 2) {
      map.set(agents[0].index, { x: centerX - 160, y: centerY })
      map.set(agents[1].index, { x: centerX + 160, y: centerY })
    } else if (count === 3) {
      // Triangle with Supervisor at top
      map.set(agents[0].index, { x: centerX, y: centerY - 90 })
      map.set(agents[1].index, { x: centerX - 160, y: centerY + 80 })
      map.set(agents[2].index, { x: centerX + 160, y: centerY + 80 })
    } else {
      // Circular layout with index 1 placed at the top
      const radiusX = 220
      const radiusY = 110
      agents.forEach((agent, i) => {
        // Offset angle so the first agent is at top (-PI / 2)
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
        const x = centerX + radiusX * Math.cos(angle)
        const y = centerY + radiusY * Math.sin(angle)
        map.set(agent.index, { x, y })
      })
    }
    return map
  }, [agents])

  // Unique directed edges plus frequency telemetry for the topology report.
  const edges: A2ADirectedConnection[] = telemetry.routes

  // Switch to terminal tab
  const handleTakeControl = (index: number) => {
    if (typeof document === 'undefined') {
      return
    }
    const targetTab = document.querySelector<HTMLElement>(`[data-terminal-index="${index}"]`)
    if (targetTab) {
      targetTab.click()
    }
  }

  const selectedAgent = agents.find((a) => a.index === selectedAgentIndex)
  const agentTraces = useMemo(() => {
    if (!selectedAgentIndex) {
      return []
    }
    return recentTraces.filter(
      (t) => t.fromIndex === selectedAgentIndex || t.toIndex === selectedAgentIndex
    )
  }, [selectedAgentIndex, recentTraces])

  return (
    <div className="relative flex flex-col size-full overflow-hidden bg-a2a-canvas/90 select-none">
      <div className="border-b border-a2a-flow/15 bg-a2a-canvas/80">
        <div className="flex items-center justify-between px-3 pt-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-a2a-flow/80">
            A2A telemetry / directed mesh
          </div>
          <div className="font-mono text-[10px] text-muted-foreground/70">
            window 60s · live source → target
          </div>
        </div>
        <A2ATelemetrySummary telemetry={telemetry} />
      </div>

      {/* Topology Canvas */}
      <div className="relative flex-1 min-h-[360px] flex items-center justify-center p-4">
        <svg
          viewBox="0 0 680 360"
          className="w-full h-full max-h-[380px] pointer-events-auto"
          style={{
            filter: 'drop-shadow(0 0 12px color-mix(in srgb, var(--a2a-flow) 14%, transparent))'
          }}
        >
          <defs>
            <linearGradient id="topo-edge-active" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--a2a-source)" stopOpacity="0.95" />
              <stop offset="50%" stopColor="var(--a2a-flow)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--a2a-target)" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="topo-edge-idle" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--a2a-source)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--a2a-idle)" stopOpacity="0.55" />
            </linearGradient>

            <marker
              id="topo-arrow-active"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="var(--a2a-target)" />
            </marker>

            <marker
              id="topo-arrow-idle"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 2 L 8 5 L 0 8 z" fill="var(--a2a-idle-soft)" />
            </marker>
          </defs>

          {/* Background Grid Pattern */}
          <pattern id="topo-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="0.8" fill="var(--a2a-flow)" opacity="0.18" />
          </pattern>
          <rect width="680" height="360" fill="url(#topo-grid)" />

          <AgentTopologyEdges
            edges={edges}
            nodePositions={nodePositions}
            hoveredEdgeId={hoveredEdgeId}
            selectedAgentIndex={selectedAgentIndex}
            setHoveredEdgeId={setHoveredEdgeId}
            replayTrace={replayTrace}
          />

          {/* Agent Nodes */}
          {agents.map((agent) => {
            const pos = nodePositions.get(agent.index)
            if (!pos) {
              return null
            }

            const isSelected = selectedAgentIndex === agent.index
            return (
              <g
                key={`node-${agent.index}`}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer"
                onClick={() =>
                  setSelectedAgentIndex(selectedAgentIndex === agent.index ? null : agent.index)
                }
              >
                {/* Ping / Radar ring if active */}
                {agent.isCommunicating && (
                  <circle
                    className="a2a-topology-radar"
                    r="36"
                    fill="none"
                    stroke="var(--a2a-source)"
                    strokeWidth="1.5"
                  >
                    <animate
                      attributeName="r"
                      from="28"
                      to="44"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.8"
                      to="0"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Base circle */}
                <circle
                  r="28"
                  fill="var(--a2a-canvas)"
                  stroke={
                    isSelected
                      ? agent.color || 'var(--a2a-flow)'
                      : agent.color
                        ? agent.color
                        : agent.isCommunicating
                          ? 'var(--a2a-source)'
                          : agent.isActive
                            ? 'var(--a2a-target)'
                            : 'var(--tab-group-split-divider-strong)'
                  }
                  strokeWidth={isSelected ? 3.5 : agent.color ? 2.5 : 2}
                  filter="drop-shadow(0 4px 6px color-mix(in srgb, var(--a2a-canvas) 50%, transparent))"
                />

                {/* Inner Icon / Index Badge */}
                <text
                  x="0"
                  y="-4"
                  textAnchor="middle"
                  fill="var(--foreground)"
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  #{agent.index}
                </text>

                {/* Role text below circle */}
                <text
                  x="0"
                  y="12"
                  textAnchor="middle"
                  fill={agent.isActive ? 'var(--a2a-flow-soft)' : 'var(--muted-foreground)'}
                  fontSize="8"
                  fontWeight="600"
                >
                  {agent.role.split(' ')[0]}
                </text>

                {/* Status Dot */}
                <circle
                  cx="20"
                  cy="-18"
                  r="5"
                  fill={
                    agent.isCommunicating
                      ? 'var(--a2a-source)'
                      : agent.isActive
                        ? 'var(--a2a-target)'
                        : 'var(--muted-foreground)'
                  }
                  stroke="var(--a2a-canvas)"
                  strokeWidth="1.5"
                />
              </g>
            )
          })}
        </svg>
      </div>

      {selectedAgent && (
        <AgentTopologyInspector
          selectedAgent={selectedAgent}
          agentTraces={agentTraces}
          telemetry={telemetry}
          onTakeControl={handleTakeControl}
          onReplayTrace={replayTrace}
          onClose={() => setSelectedAgentIndex(null)}
        />
      )}

      <style>{`
        @keyframes a2a-topology-dash-flow {
          from { stroke-dashoffset: 22; }
          to { stroke-dashoffset: 0; }
        }
        .a2a-topology-flow {
          animation: a2a-topology-dash-flow 1.2s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .a2a-topology-flow {
            animation: none !important;
          }
          .a2a-topology-packet,
          .a2a-topology-radar {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
