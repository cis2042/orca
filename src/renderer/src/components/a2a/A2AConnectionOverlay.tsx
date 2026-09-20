import React, { useCallback, useEffect, useState } from 'react'
import { X, Send, MessageSquare } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useA2AStore } from '../../store/a2a-traces-store'
import type { A2ALinkEvent } from '../../../../shared/terminal-a2a-link'
import { A2AConnectionHud } from './A2AConnectionHud'
import {
  A2AConnectionEffects,
  getA2AConnectionMotif,
  type A2AConnectionMotif
} from './A2AConnectionEffects'

type Point = { x: number; y: number }

type ResolvedLinkGeometry = {
  link: A2ALinkEvent
  p1: Point | null
  p2: Point | null
  midX: number
  midY: number
  pathD: string
  isFallback: boolean
  motif: A2AConnectionMotif
}

function hasUsableTerminalBounds(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    el.getAttribute('aria-hidden') !== 'true' &&
    el.closest('[aria-hidden="true"]') === null
  )
}

function resolvePointFromElement(el: Element | null): Point | null {
  if (!(el instanceof HTMLElement) || !hasUsableTerminalBounds(el)) {
    return null
  }
  const rect = el.getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  }
}

function findTerminalPane(tabId: string): HTMLElement | null {
  const panes = Array.from(document.querySelectorAll<HTMLElement>('[data-terminal-tab-id]')).filter(
    (el) => el.dataset.terminalTabId === tabId && hasUsableTerminalBounds(el)
  )

  return panes.reduce<HTMLElement | null>((largest, pane) => {
    if (!largest) {
      return pane
    }
    const current = pane.getBoundingClientRect()
    const previous = largest.getBoundingClientRect()
    return current.width * current.height > previous.width * previous.height ? pane : largest
  }, null)
}

function findTerminalElement(targetIndex?: number, targetName?: string): Element | null {
  if (typeof document === 'undefined') {
    return null
  }

  try {
    const cleanTargetName = targetName?.replace(/^[@#]/, '')
    const tabRoots = Array.from(
      document.querySelectorAll<HTMLElement>('[data-tab-id][data-terminal-index]')
    )
    const matchesTarget = (el: HTMLElement): boolean => {
      if (targetIndex !== undefined && el.dataset.terminalIndex === String(targetIndex)) {
        return true
      }
      if (!cleanTargetName) {
        return false
      }
      const title = el.dataset.tabTitle?.trim().replace(/^[@#]/, '')
      return title === cleanTargetName || title?.toLowerCase() === cleanTargetName.toLowerCase()
    }

    for (const tabRoot of tabRoots) {
      if (!matchesTarget(tabRoot) || !tabRoot.dataset.tabId) {
        continue
      }
      const pane = findTerminalPane(tabRoot.dataset.tabId)
      if (pane) {
        return pane
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

  const geometries: ResolvedLinkGeometry[] = activeLinks.map((link) => {
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
        isFallback: true,
        motif: getA2AConnectionMotif(link)
      }
    }

    // A self-link is not a source-to-target connection and should not become a loop.
    if (p1.x === p2.x && p1.y === p2.y) {
      return {
        link,
        p1,
        p2,
        midX: p1.x,
        midY: p1.y,
        pathD: '',
        isFallback: true,
        motif: getA2AConnectionMotif(link)
      }
    }

    // Compute curve path between two real terminals
    const dx = Math.abs(p2.x - p1.x)
    const dy = Math.abs(p2.y - p1.y)

    let pathD = ''
    let midX = (p1.x + p2.x) / 2
    let midY = (p1.y + p2.y) / 2

    if (dy < 30) {
      // Keep same-row pane connections readable without depending on trace order.
      const arcDepth = Math.min(120, Math.max(48, dx * 0.18))
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
      isFallback: false,
      motif: getA2AConnectionMotif(link)
    }
  })

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
          style={{
            filter: 'drop-shadow(0 0 10px color-mix(in srgb, var(--a2a-flow) 28%, transparent))'
          }}
        >
          <defs>
            <linearGradient id="a2a-beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--a2a-source)" stopOpacity="0.95" />
              <stop offset="40%" stopColor="var(--a2a-flow)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--a2a-target)" stopOpacity="0.95" />
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
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="var(--a2a-target)" />
            </marker>
          </defs>

          {geometries
            .filter((g): g is ResolvedLinkGeometry & { p1: Point; p2: Point } =>
              Boolean(g.pathD && g.p1 && g.p2)
            )
            .map(({ link, p1, p2, pathD, motif }) => (
              <g
                key={link.id}
                className="a2a-link-beam"
                role="group"
                aria-label={`#${link.fromIndex ?? link.from} → #${link.toIndex ?? link.to}`}
              >
                {/* Outer soft glow line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="url(#a2a-beam-gradient)"
                  strokeWidth="14"
                  strokeOpacity="0.28"
                  strokeLinecap="round"
                  filter="url(#a2a-glow)"
                />

                {/* Foreground animated dashed line */}
                <path
                  d={pathD}
                  fill="none"
                  className="a2a-link-beam-flow"
                  stroke="url(#a2a-beam-gradient)"
                  strokeWidth="4.5"
                  strokeDasharray="18 8"
                  markerEnd="url(#a2a-arrow-head)"
                />

                <path
                  d={pathD}
                  fill="none"
                  className="a2a-link-beam-flow-core"
                  stroke="var(--a2a-flow-soft)"
                  strokeWidth="1.4"
                  strokeDasharray="3 11"
                  markerEnd="url(#a2a-arrow-head)"
                />

                <A2AConnectionEffects pathD={pathD} motif={motif} />

                {/* Origin (#from) glowing ring and radar ping */}
                <circle
                  className="a2a-link-beam-pulse"
                  cx={p1.x}
                  cy={p1.y}
                  r="14"
                  fill="none"
                  stroke="var(--a2a-source)"
                  strokeWidth="1.5"
                >
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
                  fill="var(--a2a-source)"
                  stroke="var(--foreground)"
                  strokeWidth="1.5"
                />

                {/* Target (#to) receiving pulse rings */}
                <circle
                  className="a2a-link-beam-pulse"
                  cx={p2.x}
                  cy={p2.y}
                  r="16"
                  fill="none"
                  stroke="var(--a2a-target)"
                  strokeWidth="1.5"
                >
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
                  fill="var(--a2a-target)"
                  stroke="var(--foreground)"
                  strokeWidth="1.5"
                />

                {/* Traveling light particle / energy packet */}
                <circle
                  className="a2a-link-beam-pulse"
                  r="4.5"
                  fill="var(--foreground)"
                  stroke="var(--a2a-flow)"
                  strokeWidth="2"
                >
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
        activeLinks={activeLinks}
        recentTraces={recentTraces}
        hasAnyTrace={hasAnyTrace}
        setHubOpen={setHubOpen}
        clearTraces={clearTraces}
        replayTrace={replayTrace}
        onTestTrigger={handleTestTrigger}
      />
    </div>
  )
}
