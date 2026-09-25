import React, { useCallback, useEffect, useState } from 'react'
import { X, Send, MessageSquare } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useA2AStore } from '../../store/a2a-traces-store'
import { useAppStore } from '../../store'
import { A2AConnectionHud } from './A2AConnectionHud'
import { A2AConnectionEffects, MOTIF_PALETTES } from './A2AConnectionEffects'
import {
  resolveLinkGeometries,
  sessionTerminalTabSelector,
  type ResolvedLinkGeometry,
  type Point
} from './a2a-geometry'

export function A2AConnectionOverlay(): React.JSX.Element | null {
  const activeLinks = useA2AStore((s) => s.activeLinks)
  const recentTraces = useA2AStore((s) => s.recentTraces)
  const removeActiveLink = useA2AStore((s) => s.removeActiveLink)
  const replayTrace = useA2AStore((s) => s.replayTrace)
  const clearTraces = useA2AStore((s) => s.clearTraces)
  const addTrace = useA2AStore((s) => s.addTrace)
  const setHubOpen = useA2AStore((s) => s.setHubOpen)
  const activeWorktreeId = useAppStore((s) => s.activeWorktreeId)

  const [hudOpen, setHudOpen] = useState(false)
  const [, setLayoutRevision] = useState(0)

  // Re-measure after pane movement, scrolling, and tab/workspace layout changes.
  useEffect(() => {
    if (activeLinks.length === 0) {
      return
    }
    const invalidateLayout = (): void => setLayoutRevision((revision) => revision + 1)
    window.addEventListener('resize', invalidateLayout)
    window.addEventListener('scroll', invalidateLayout, true)
    const interval = window.setInterval(invalidateLayout, 300)
    return () => {
      window.removeEventListener('resize', invalidateLayout)
      window.removeEventListener('scroll', invalidateLayout, true)
      window.clearInterval(interval)
    }
  }, [activeLinks.length])

  const sessionLinks = activeLinks.filter(
    (link) => !activeWorktreeId || !link.worktreeId || link.worktreeId === activeWorktreeId
  )
  const sessionTraces = recentTraces.filter(
    (trace) => !activeWorktreeId || !trace.worktreeId || trace.worktreeId === activeWorktreeId
  )
  const geometries: ResolvedLinkGeometry[] = resolveLinkGeometries(sessionLinks, activeWorktreeId)

  const handleTestTrigger = useCallback(
    (from: string, to: string, text: string) => {
      let resolvedFrom = from
      let resolvedTo = to

      if (typeof document !== 'undefined') {
        const activeIndices: number[] = []
        const selector = activeWorktreeId
          ? sessionTerminalTabSelector(activeWorktreeId)
          : '[data-tab-id][data-terminal-index]'
        document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
          const val = Number.parseInt(el.dataset.terminalIndex || '', 10)
          if (!Number.isNaN(val) && !activeIndices.includes(val)) {
            activeIndices.push(val)
          }
        })

        // If target from or to doesn't exist in DOM, dynamically anchor to currently visible terminal(s)
        const fromIdx = Number.parseInt(from.replace(/^[@#]/, ''), 10)
        const toIdx = Number.parseInt(to.replace(/^[@#]/, ''), 10)

        const fromExists = Number.isFinite(fromIdx) && activeIndices.includes(fromIdx)
        const toExists = Number.isFinite(toIdx) && activeIndices.includes(toIdx)

        if (activeIndices.length > 0) {
          if (!fromExists) {
            resolvedFrom = `@${activeIndices[0]}`
          }
          const currentFromIdx = Number.parseInt(resolvedFrom.replace(/^[@#]/, ''), 10)
          if (!toExists) {
            const alternative = activeIndices.find((idx) => idx !== currentFromIdx)
            resolvedTo = alternative !== undefined ? `@${alternative}` : resolvedFrom
          }
        } else {
          return
        }
      }

      addTrace({
        from: resolvedFrom,
        to: resolvedTo,
        type: 'send',
        text,
        durationMs: 5000,
        delivered: true,
        executionState: 'delivered',
        ...(activeWorktreeId ? { worktreeId: activeWorktreeId } : {})
      })
    },
    [addTrace, activeWorktreeId]
  )

  const hasAnyTrace = sessionLinks.length > 0 || sessionTraces.length > 0

  return (
    <div
      className="a2a-connection-container pointer-events-none fixed inset-0 z-50 overflow-hidden"
      data-testid="a2a-connection-overlay"
    >
      {/* SVG Canvas for Connection Beams */}
      {geometries.length > 0 && (
        <svg
          className="absolute inset-0 size-full pointer-events-none"
          style={{
            filter: 'drop-shadow(0 0 10px color-mix(in srgb, var(--a2a-flow) 28%, transparent))'
          }}
        >
          <defs>
            {/* Default beam gradient */}
            <linearGradient id="a2a-beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--a2a-source)" stopOpacity="0.95" />
              <stop offset="40%" stopColor="var(--a2a-flow)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--a2a-target)" stopOpacity="0.95" />
            </linearGradient>

            {/* 5 Distinct Motifs Colored Gradients */}
            {(
              Object.entries(MOTIF_PALETTES) as [
                string,
                (typeof MOTIF_PALETTES)[keyof typeof MOTIF_PALETTES]
              ][]
            ).map(([key, palette]) => (
              <linearGradient key={key} id={palette.gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={palette.sourceColor} stopOpacity="0.95" />
                <stop offset="50%" stopColor={palette.flowColor} stopOpacity="1" />
                <stop offset="100%" stopColor={palette.targetColor} stopOpacity="0.95" />
              </linearGradient>
            ))}

            <filter id="a2a-glow" x="-60%" y="-60%" width="220%" height="220%">
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
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="var(--a2a-target)" />
            </marker>

            {/* 5 Motif-specific Arrow Heads */}
            {(
              Object.entries(MOTIF_PALETTES) as [
                string,
                (typeof MOTIF_PALETTES)[keyof typeof MOTIF_PALETTES]
              ][]
            ).map(([key, palette]) => (
              <marker
                key={`marker-${key}`}
                id={palette.markerId}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={palette.targetColor} />
              </marker>
            ))}
          </defs>

          {geometries
            .filter((g): g is ResolvedLinkGeometry & { p1: Point; p2: Point } =>
              Boolean(g.pathD && g.p1 && g.p2)
            )
            .map(({ link, p1, p2, pathD, motif }) => {
              const palette = MOTIF_PALETTES[motif] || MOTIF_PALETTES.flame
              return (
                <g
                  key={link.id}
                  className={`a2a-link-beam a2a-link-beam-${motif}`}
                  role="group"
                  aria-label={`#${link.fromIndex ?? link.from} → #${link.toIndex ?? link.to} (${palette.label})`}
                >
                  {/* Outer soft glow line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={`url(#${palette.gradientId})`}
                    strokeWidth="15"
                    strokeOpacity="0.32"
                    strokeLinecap="round"
                    filter="url(#a2a-glow)"
                  />

                  {/* Foreground animated dashed line */}
                  <path
                    d={pathD}
                    fill="none"
                    className="a2a-link-beam-flow"
                    stroke={`url(#${palette.gradientId})`}
                    strokeWidth="4.5"
                    strokeDasharray="18 8"
                    markerEnd={`url(#${palette.markerId})`}
                  />

                  {/* Core energy line */}
                  <path
                    d={pathD}
                    fill="none"
                    className="a2a-link-beam-flow-core"
                    stroke={palette.coreColor}
                    strokeWidth="1.6"
                    strokeDasharray="3 11"
                    markerEnd={`url(#${palette.markerId})`}
                  />

                  <A2AConnectionEffects pathD={pathD} motif={motif} />

                  {/* Origin (#from) glowing ring and radar ping in source theme color */}
                  <circle
                    className="a2a-link-beam-pulse"
                    cx={p1.x}
                    cy={p1.y}
                    r="14"
                    fill="none"
                    stroke={palette.sourceColor}
                    strokeWidth="1.5"
                  >
                    <animate
                      attributeName="r"
                      from="4"
                      to="20"
                      dur="1.8s"
                      repeatCount="indefinite"
                    />
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
                    fill={palette.sourceColor}
                    stroke="var(--foreground)"
                    strokeWidth="1.5"
                  />

                  {/* Target (#to) receiving pulse rings in target theme color */}
                  <circle
                    className="a2a-link-beam-pulse"
                    cx={p2.x}
                    cy={p2.y}
                    r="16"
                    fill="none"
                    stroke={palette.targetColor}
                    strokeWidth="1.5"
                  >
                    <animate
                      attributeName="r"
                      from="6"
                      to="24"
                      dur="1.8s"
                      repeatCount="indefinite"
                    />
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
                    fill={palette.targetColor}
                    stroke="var(--foreground)"
                    strokeWidth="1.5"
                  />

                  {/* Traveling light particle / energy packet in flow theme color */}
                  <circle
                    className="a2a-link-beam-pulse"
                    r="4.5"
                    fill="var(--foreground)"
                    stroke={palette.flowColor}
                    strokeWidth="2"
                  >
                    <animateMotion path={pathD} dur="1.4s" repeatCount="indefinite" />
                  </circle>
                </g>
              )
            })}
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
              'pointer-events-auto flex items-center gap-2 rounded-full border bg-a2a-canvas/90 px-3 py-1 text-xs font-mono text-foreground shadow-xl backdrop-blur-md transition-all hover:scale-105',
              isFallback ? 'border-a2a-warning/40 text-a2a-warning' : 'border-a2a-flow/40'
            )}
          >
            {/* Source badge */}
            <span className="flex items-center gap-1 rounded border border-a2a-source/30 bg-a2a-source/15 px-1.5 py-0.5 font-bold text-a2a-source">
              <span className="text-[9px] font-normal text-a2a-source/70">SRC</span>
              {link.fromIndex !== undefined ? `#${link.fromIndex}` : link.from}
            </span>

            <span className="text-a2a-flow">→</span>

            {/* Target badge */}
            <span
              className={cn(
                'flex items-center gap-1 rounded px-1.5 py-0.5 font-bold border',
                isFallback
                  ? 'border-a2a-warning/30 bg-a2a-warning/20 text-a2a-warning'
                  : 'border-a2a-target/30 bg-a2a-target/10 text-a2a-target'
              )}
            >
              <span className="text-[9px] font-normal text-a2a-target/70">DST</span>
              {link.toIndex !== undefined ? `#${link.toIndex}` : link.to}
              {isFallback && (
                <span className="text-[9px] font-sans font-normal opacity-75">(bg)</span>
              )}
            </span>

            {/* Action icon and text preview */}
            <div className="flex max-w-[220px] items-center gap-1.5 truncate border-l border-border/60 pl-1 text-foreground/80">
              {link.type === 'send' && <Send className="size-3 shrink-0 text-a2a-flow" />}
              {link.type === 'message' && (
                <MessageSquare className="size-3 shrink-0 text-a2a-target" />
              )}
              {link.type === 'type' && <span className="text-[10px] text-a2a-warning">⌨</span>}
              <span className="truncate text-[11px]">{link.text || link.type}</span>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => removeActiveLink(link.id)}
              className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
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
        activeLinks={sessionLinks}
        recentTraces={sessionTraces}
        hasAnyTrace={hasAnyTrace}
        setHubOpen={setHubOpen}
        clearTraces={clearTraces}
        replayTrace={replayTrace}
        onTestTrigger={handleTestTrigger}
      />
    </div>
  )
}
