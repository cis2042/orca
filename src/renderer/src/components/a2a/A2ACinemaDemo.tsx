import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Bot } from 'lucide-react'
import { MOTIF_PALETTES } from './A2AConnectionEffects'
import { DEMO_AGENTS, DEMO_STEPS, type DemoStep } from './a2a-demo-scenario'
import { CinemaTopBar } from './CinemaTopBar'
import { CinemaHologramCard } from './CinemaHologramCard'
import { useA2AStore } from '../../store/a2a-traces-store'
import { cn } from '../../lib/utils'

export type A2ACinemaDemoProps = {
  onClose?: () => void
  isStandAloneModal?: boolean
}

type DemoLog = {
  id: string
  time: string
  text: string
  motif: string
}

export function A2ACinemaDemo({
  onClose,
  isStandAloneModal = false
}: A2ACinemaDemoProps): React.JSX.Element {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 1.5 | 2>(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [logs, setLogs] = useState<DemoLog[]>([])

  const addTrace = useA2AStore((s) => s.addTrace)
  const currentStep: DemoStep = DEMO_STEPS[currentStepIndex]
  const palette = MOTIF_PALETTES[currentStep.motif] || MOTIF_PALETTES.flame

  const agentPositions = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>()
    const centerX = 360
    const centerY = 240
    const radiusX = 260
    const radiusY = 160
    const total = DEMO_AGENTS.length

    for (let i = 0; i < total; i++) {
      const angle = (i * (2 * Math.PI)) / total - Math.PI / 2
      const x = Math.round(centerX + radiusX * Math.cos(angle))
      const y = Math.round(centerY + radiusY * Math.sin(angle))
      map.set(DEMO_AGENTS[i].index, { x, y })
    }
    return map
  }, [])

  const broadcastStep = useCallback(
    (step: DemoStep) => {
      const fromAgent = DEMO_AGENTS.find((a) => a.index === step.fromIndex)
      const toAgent = DEMO_AGENTS.find((a) => a.index === step.toIndex)
      const now = new Date()
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

      setLogs((prev) => [
        {
          id: `log-${Date.now()}-${Math.random()}`,
          time: timeStr,
          text: `[${step.phase}] ${fromAgent?.handle} (${fromAgent?.model}) ➔ ${toAgent?.handle} (${toAgent?.model}): ${step.title}`,
          motif: step.motif
        },
        ...prev.slice(0, 19)
      ])

      addTrace({
        from: fromAgent?.handle ?? `@${step.fromIndex}`,
        to: toAgent?.handle ?? `@${step.toIndex}`,
        fromIndex: step.fromIndex,
        toIndex: step.toIndex,
        fromLabel: fromAgent?.name,
        toLabel: toAgent?.name,
        type: 'send',
        text: `${step.commandText} motif:${step.motif}`,
        durationMs: Math.round(step.durationMs / speedMultiplier),
        delivered: true,
        executionState: 'delivered'
      })
    },
    [addTrace, speedMultiplier]
  )

  useEffect(() => {
    broadcastStep(DEMO_STEPS[0])
  }, [broadcastStep])

  useEffect(() => {
    if (!isPlaying) {
      return
    }
    const timer = setTimeout(
      () => {
        const nextIndex = (currentStepIndex + 1) % DEMO_STEPS.length
        setCurrentStepIndex(nextIndex)
        broadcastStep(DEMO_STEPS[nextIndex])
      },
      Math.round(currentStep.durationMs / speedMultiplier)
    )

    return () => clearTimeout(timer)
  }, [isPlaying, currentStepIndex, currentStep.durationMs, speedMultiplier, broadcastStep])

  const p1 = agentPositions.get(currentStep.fromIndex) ?? { x: 360, y: 120 }
  const p2 = agentPositions.get(currentStep.toIndex) ?? { x: 360, y: 360 }
  const midX = (p1.x + p2.x) / 2
  const midY = (p1.y + p2.y) / 2 - 30
  const beamPathD = `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`

  return (
    <div
      className={cn(
        'flex flex-col size-full bg-zinc-950 text-zinc-100 select-none overflow-hidden font-sans',
        isFullscreen ? 'fixed inset-0 z-[100]' : 'relative'
      )}
      data-testid="a2a-cinema-demo"
    >
      <CinemaTopBar
        isPlaying={isPlaying}
        speedMultiplier={speedMultiplier}
        isFullscreen={isFullscreen}
        isStandAloneModal={isStandAloneModal}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onReplay={() => {
          setCurrentStepIndex(0)
          broadcastStep(DEMO_STEPS[0])
        }}
        onStepNext={() => {
          setCurrentStepIndex((prev) => {
            const next = (prev + 1) % DEMO_STEPS.length
            broadcastStep(DEMO_STEPS[next])
            return next
          })
        }}
        onSpeedChange={setSpeedMultiplier}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        onClose={onClose}
      />

      {/* Main Canvas Area */}
      <div className="relative flex-1 min-h-0 bg-radial from-zinc-900/60 via-zinc-950 to-black overflow-hidden flex items-center justify-center">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.14] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #4f46e5 1px, transparent 1px), linear-gradient(to bottom, #4f46e5 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        {/* Central SVG Mesh for 8 Agents & Five-Color Beams */}
        <svg
          viewBox="0 0 720 480"
          className="w-full h-full max-w-[860px] max-h-[580px] pointer-events-none select-none"
          style={{
            filter:
              'drop-shadow(0 0 16px color-mix(in srgb, var(--a2a-flow, #38bdf8) 20%, transparent))'
          }}
        >
          <defs>
            <filter id="cinema-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="cinema-beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={palette.sourceColor} stopOpacity="0.95" />
              <stop offset="50%" stopColor={palette.flowColor} stopOpacity="1" />
              <stop offset="100%" stopColor={palette.targetColor} stopOpacity="0.95" />
            </linearGradient>
            <marker
              id="cinema-arrow-head"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={palette.targetColor} />
            </marker>
          </defs>

          {/* Static Topology Mesh Wireframe */}
          {DEMO_AGENTS.map((agent, i) => {
            const nextAgent = DEMO_AGENTS[(i + 1) % DEMO_AGENTS.length]
            const posA = agentPositions.get(agent.index)
            const posB = agentPositions.get(nextAgent.index)
            if (!posA || !posB) {
              return null
            }
            return (
              <line
                key={`wire-${agent.id}`}
                x1={posA.x}
                y1={posA.y}
                x2={posB.x}
                y2={posB.y}
                stroke="#27272a"
                strokeWidth="1.2"
                strokeDasharray="4 6"
                strokeOpacity="0.4"
              />
            )
          })}

          {/* Active Five-Color Animated Laser Beam */}
          <g className="a2a-cinema-active-beam">
            {/* Outer soft glow beam */}
            <path
              d={beamPathD}
              fill="none"
              stroke="url(#cinema-beam-grad)"
              strokeWidth="18"
              strokeOpacity="0.38"
              strokeLinecap="round"
              filter="url(#cinema-glow)"
            />
            {/* Mid animated dashed beam */}
            <path
              d={beamPathD}
              fill="none"
              stroke="url(#cinema-beam-grad)"
              strokeWidth="5"
              strokeDasharray="16 8"
              markerEnd="url(#cinema-arrow-head)"
              className="a2a-link-beam-flow"
            />
            {/* Core bright laser */}
            <path
              d={beamPathD}
              fill="none"
              stroke={palette.coreColor}
              strokeWidth="2"
              strokeDasharray="4 12"
              markerEnd="url(#cinema-arrow-head)"
              className="a2a-link-beam-flow-core"
            />
            {/* Source radar sonar pulses */}
            <circle
              cx={p1.x}
              cy={p1.y}
              r="16"
              fill="none"
              stroke={palette.sourceColor}
              strokeWidth="2"
            >
              <animate attributeName="r" from="6" to="34" dur="1.4s" repeatCount="indefinite" />
              <animate
                attributeName="opacity"
                from="0.9"
                to="0"
                dur="1.4s"
                repeatCount="indefinite"
              />
            </circle>
            {/* Target impact pulse */}
            <circle
              cx={p2.x}
              cy={p2.y}
              r="18"
              fill="none"
              stroke={palette.targetColor}
              strokeWidth="2.2"
            >
              <animate attributeName="r" from="8" to="38" dur="1.4s" repeatCount="indefinite" />
              <animate
                attributeName="opacity"
                from="1"
                to="0"
                dur="1.4s"
                repeatCount="indefinite"
              />
            </circle>
            {/* Traveling photon packet */}
            <circle r="6" fill={palette.coreColor} filter="url(#cinema-glow)">
              <animateMotion path={beamPathD} dur="1.1s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* Render 8 Agent Nodes */}
          {DEMO_AGENTS.map((agent) => {
            const pos = agentPositions.get(agent.index)
            if (!pos) {
              return null
            }
            const isSource = agent.index === currentStep.fromIndex
            const isTarget = agent.index === currentStep.toIndex
            const isActive = isSource || isTarget

            return (
              <g
                key={agent.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="transition-transform duration-300"
              >
                {/* Active Outer Pulsing Halo */}
                {isActive && (
                  <circle
                    r="40"
                    fill="none"
                    stroke={isSource ? palette.sourceColor : palette.targetColor}
                    strokeWidth="1.8"
                    strokeDasharray="6 4"
                    className="animate-spin"
                    style={{ animationDuration: '6s' }}
                  />
                )}

                {/* Node Base Circle */}
                <circle
                  r="30"
                  fill="#09090b"
                  stroke={
                    isActive ? (isSource ? palette.sourceColor : palette.targetColor) : '#3f3f46'
                  }
                  strokeWidth={isActive ? '3' : '1.5'}
                  filter="drop-shadow(0 4px 10px rgba(0,0,0,0.8))"
                />

                {/* Vendor Color Inner Accent Ring */}
                <circle
                  r="25"
                  fill="none"
                  stroke={agent.vendorColor}
                  strokeWidth="1.2"
                  strokeOpacity="0.8"
                />

                {/* Agent Avatar Badge / Icon */}
                <text textAnchor="middle" dy="-3" fontSize="16" className="select-none">
                  {agent.avatarBadge}
                </text>

                {/* Handle text @index */}
                <text
                  textAnchor="middle"
                  dy="15"
                  fill="#ffffff"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {agent.handle}
                </text>

                {/* External Labels below/above node */}
                <g transform="translate(0, 44)">
                  <text textAnchor="middle" fill="#f4f4f5" fontSize="10" fontWeight="600">
                    {agent.name}
                  </text>
                  <text
                    textAnchor="middle"
                    dy="12"
                    fill={agent.vendorColor}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="500"
                  >
                    {agent.model}
                  </text>
                  <text textAnchor="middle" dy="23" fill="#71717a" fontSize="8">
                    {agent.role}
                  </text>
                </g>
              </g>
            )
          })}
        </svg>

        {/* Center Live Transmission Payload Hologram Card */}
        <CinemaHologramCard step={currentStep} totalSteps={DEMO_STEPS.length} palette={palette} />
      </div>

      {/* Bottom Activity Stream Console */}
      <div className="border-t border-zinc-800/90 bg-zinc-950/95 px-4 py-2 h-24 shrink-0 font-mono text-[11px] overflow-y-auto scrollbar-sleek">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 sticky top-0 bg-zinc-950/95 pb-1">
          <Bot className="size-3 text-violet-400" />
          <span>Real-Time Multi-Agent Collaborative Trace Feed</span>
        </div>
        <div className="flex flex-col gap-1">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-2 text-zinc-300 leading-tight">
              <span className="text-zinc-600 text-[10px]">{log.time}</span>
              <span className="truncate">{log.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
