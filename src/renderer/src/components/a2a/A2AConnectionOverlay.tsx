import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Send, MessageSquare } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useA2AStore } from '../../store/a2a-traces-store'
import type { A2ALinkEvent } from '../../../../shared/terminal-a2a-link'
import { A2AConnectionHud } from './A2AConnectionHud'

type Point = { x: number; y: number }

type ResolvedLinkGeometry = {
  link: A2ALinkEvent
  p1: Point | null
  p2: Point | null
  midX: number
  midY: number
  pathD: string
  isFallback: boolean
}

function resolvePointFromElement(el: Element | null): Point | null {
  if (!el) {
    return null
  }
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    return null
  }
  return {
    x: rect.left + rect.width / 2,
    y: rect.bottom > 50 && rect.top < 50 ? rect.bottom - 2 : rect.top + rect.height / 2
  }
}

function findTerminalElement(targetIndex?: number, targetName?: string): Element | null {
  if (typeof document === 'undefined') {
    return null
  }
  try {
    if (targetIndex !== undefined) {
      const escapedIndex =
        typeof CSS !== 'undefined' && CSS.escape
          ? CSS.escape(String(targetIndex))
          : String(targetIndex)
      const el = document.querySelector(`[data-terminal-index="${escapedIndex}"]`)
      if (el) {
        return el
      }
    }
    if (targetName) {
      const clean = targetName.replace(/^[@#]/, '')
      const escapedClean = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(clean) : clean
      const byIndex = document.querySelector(`[data-terminal-index="${escapedClean}"]`)
      if (byIndex) {
        return byIndex
      }
      const escapedTitle =
        typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(targetName) : targetName
      const byTitle = document.querySelector(`[title*="${escapedTitle}"]`)
      if (byTitle) {
        return byTitle
      }
    }
  } catch {
    return null
  }
  return null
}

export function A2AConnectionOverlay(): React.JSX.Element | null {
  const activeLinks = useA2AStore((s) => s.activeLinks)
  const recentTraces = useA2AStore((s) => s.recentTraces)
  const removeActiveLink = useA2AStore((s) => s.removeActiveLink)
  const replayTrace = useA2AStore((s) => s.replayTrace)
  const clearTraces = useA2AStore((s) => s.clearTraces)
  const addTrace = useA2AStore((s) => s.addTrace)
  const setHubOpen = useA2AStore((s) => s.setHubOpen)

  const [hudOpen, setHudOpen] = useState(false)
  const [, setTick] = useState(0)

  // Re-measure positions on window resize or periodic animation frame
  useEffect(() => {
    if (activeLinks.length === 0) {
      return
    }
    const handleResize = (): void => setTick((t) => t + 1)
    window.addEventListener('resize', handleResize)
    const interval = setInterval(() => setTick((t) => t + 1), 300)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearInterval(interval)
    }
  }, [activeLinks.length])

  const geometries = useMemo<ResolvedLinkGeometry[]>(() => {
    return activeLinks.map((link, idx) => {
      const elFrom = findTerminalElement(link.fromIndex, link.from)
      const elTo = findTerminalElement(link.toIndex, link.to)

      const p1 = resolvePointFromElement(elFrom)
      const p2 = resolvePointFromElement(elTo)

      // Zero Phantom Beam: never draw bezier arcs to arbitrary empty space
      if (!p1 || !p2) {
        return {
          link,
          p1,
          p2,
          midX: p1?.x ?? p2?.x ?? 0,
          midY: p1 ? p1.y + 28 : p2 ? p2.y + 28 : 0,
          pathD: '',
          isFallback: true
        }
      }

      // Compute curve path between two real terminals
      const dx = Math.abs(p2.x - p1.x)
      const dy = Math.abs(p2.y - p1.y)

      let pathD = ''
      let midX = (p1.x + p2.x) / 2
      let midY = (p1.y + p2.y) / 2

      if (dy < 30) {
        // Both endpoints are along a horizontal line (e.g. top TabBar)
        // Draw a pleasant hanging arc dipping into the workspace
        const arcDepth = Math.min(140, Math.max(50, dx * 0.22)) + (idx % 4) * 16
        midY = Math.max(p1.y, p2.y) + arcDepth
        pathD = `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`
      } else {
        // Multi-level curve (e.g. tab to split pane or pane to pane)
        const controlXOffset = (p2.x - p1.x) * 0.5
        pathD = `M ${p1.x} ${p1.y} C ${p1.x + controlXOffset} ${p1.y}, ${p2.x - controlXOffset} ${p2.y}, ${p2.x} ${p2.y}`
      }

      return {
        link,
        p1,
        p2,
        midX,
        midY,
        pathD,
        isFallback: false
      }
    })
  }, [activeLinks])

  const handleTestTrigger = useCallback(
    (from: string, to: string, text: string) => {
      addTrace({
        from,
        to,
        type: 'send',
        text,
        durationMs: 5000
      })
    },
    [addTrace]
  )

  const hasAnyTrace = activeLinks.length > 0 || recentTraces.length > 0

  return (
    <div
      className="a2a-connection-container pointer-events-none fixed inset-0 z-50 overflow-hidden"
      data-testid="a2a-connection-overlay"
    >
      {/* SVG Canvas for Connection Beams */}
      {geometries.length > 0 && (
        <svg
          className="absolute inset-0 size-full pointer-events-none"
          style={{ filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.3))' }}
        >
          <defs>
            <linearGradient id="a2a-beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#38bdf8" stopOpacity="1" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.95" />
            </linearGradient>

            <filter id="a2a-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <marker
              id="a2a-arrow-head"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#34d399" />
            </marker>
          </defs>

          {geometries
            .filter((g): g is ResolvedLinkGeometry & { p1: Point; p2: Point } =>
              Boolean(g.pathD && g.p1 && g.p2)
            )
            .map(({ link, p1, p2, pathD }) => (
              <g key={link.id} className="a2a-link-beam">
                {/* Outer soft glow line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="url(#a2a-beam-gradient)"
                  strokeWidth="7"
                  strokeOpacity="0.35"
                  filter="url(#a2a-glow)"
                />

                {/* Foreground animated dashed line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="url(#a2a-beam-gradient)"
                  strokeWidth="2.5"
                  strokeDasharray="8 6"
                  markerEnd="url(#a2a-arrow-head)"
                  style={{
                    animation: 'a2a-dash-flow 1.5s linear infinite'
                  }}
                />

                {/* Origin (#from) glowing ring and radar ping */}
                <circle cx={p1.x} cy={p1.y} r="14" fill="none" stroke="#c084fc" strokeWidth="1.5">
                  <animate attributeName="r" from="4" to="20" dur="1.8s" repeatCount="indefinite" />
                  <animate
                    attributeName="opacity"
                    from="0.9"
                    to="0"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx={p1.x}
                  cy={p1.y}
                  r="5"
                  fill="#a855f7"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Target (#to) receiving pulse rings */}
                <circle cx={p2.x} cy={p2.y} r="16" fill="none" stroke="#34d399" strokeWidth="1.5">
                  <animate attributeName="r" from="6" to="24" dur="1.8s" repeatCount="indefinite" />
                  <animate
                    attributeName="opacity"
                    from="0.9"
                    to="0"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx={p2.x}
                  cy={p2.y}
                  r="6"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Traveling light particle / energy packet */}
                <circle r="4.5" fill="#ffffff" stroke="#38bdf8" strokeWidth="2">
                  <animateMotion path={pathD} dur="1.4s" repeatCount="indefinite" />
                </circle>
              </g>
            ))}
        </svg>
      )}

      {/* Floating Action Badges: only render when position is anchored to an actual visible terminal */}
      {geometries
        .filter((g) => g.p1 !== null || g.p2 !== null)
        .map(({ link, midX, midY, isFallback }) => (
          <div
            key={`badge-${link.id}`}
            style={{
              position: 'absolute',
              left: `${midX}px`,
              top: `${midY}px`,
              transform: 'translate(-50%, -50%)'
            }}
            className={cn(
              'pointer-events-auto flex items-center gap-2 rounded-full border bg-zinc-950/90 px-3 py-1 text-xs font-mono text-zinc-100 shadow-xl backdrop-blur-md transition-all hover:scale-105',
              isFallback ? 'border-amber-500/40 text-amber-200' : 'border-violet-500/40'
            )}
          >
            {/* Source badge */}
            <span className="flex items-center gap-1 rounded bg-violet-500/20 px-1.5 py-0.5 font-bold text-violet-300 border border-violet-500/30">
              {link.fromIndex !== undefined ? `#${link.fromIndex}` : link.from}
            </span>

            <span className="text-zinc-400">➔</span>

            {/* Target badge */}
            <span
              className={cn(
                'flex items-center gap-1 rounded px-1.5 py-0.5 font-bold border',
                isFallback
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              )}
            >
              {link.toIndex !== undefined ? `#${link.toIndex}` : link.to}
              {isFallback && (
                <span className="text-[9px] font-sans font-normal opacity-75">(bg)</span>
              )}
            </span>

            {/* Action icon and text preview */}
            <div className="flex items-center gap-1.5 text-zinc-300 pl-1 border-l border-zinc-700/60 max-w-[220px] truncate">
              {link.type === 'send' && <Send className="size-3 text-cyan-400 shrink-0" />}
              {link.type === 'message' && (
                <MessageSquare className="size-3 text-emerald-400 shrink-0" />
              )}
              {link.type === 'type' && <span className="text-[10px] text-amber-400">⌨</span>}
              <span className="truncate text-[11px]">{link.text || link.type}</span>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => removeActiveLink(link.id)}
              className="ml-1 rounded-full p-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="Dismiss trace"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

      {/* Floating A2A HUD Trigger & History Widget (Bottom-Right) */}
      <A2AConnectionHud
        hudOpen={hudOpen}
        setHudOpen={setHudOpen}
        activeLinks={activeLinks}
        recentTraces={recentTraces}
        hasAnyTrace={hasAnyTrace}
        setHubOpen={setHubOpen}
        clearTraces={clearTraces}
        replayTrace={replayTrace}
        onTestTrigger={handleTestTrigger}
      />

      <style>{`
        @keyframes a2a-dash-flow {
          from {
            stroke-dashoffset: 28;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  )
}
