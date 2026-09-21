import type { A2ALinkEvent } from '../../../../shared/terminal-a2a-link'
import { getA2AConnectionMotif, type A2AConnectionMotif } from './A2AConnectionEffects'

export type Point = { x: number; y: number }

export type ResolvedLinkGeometry = {
  link: A2ALinkEvent
  p1: Point | null
  p2: Point | null
  midX: number
  midY: number
  pathD: string
  isFallback: boolean
  motif: A2AConnectionMotif
}

export function hasUsableTerminalBounds(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    el.getAttribute('aria-hidden') !== 'true' &&
    el.closest('[aria-hidden="true"]') === null
  )
}

export function resolvePointFromElement(el: Element | null): Point | null {
  if (!(el instanceof HTMLElement) || !hasUsableTerminalBounds(el)) {
    return null
  }
  const rect = el.getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  }
}

export function findTerminalPane(tabId: string): HTMLElement | null {
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

export function findTerminalElement(targetIndex?: number, targetName?: string): Element | null {
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
      if (/^\d+$/.test(cleanTargetName) && el.dataset.terminalIndex === cleanTargetName) {
        return true
      }
      const title = el.dataset.tabTitle?.trim().replace(/^[@#]/, '')
      return title === cleanTargetName || title?.toLowerCase() === cleanTargetName.toLowerCase()
    }

    let fallbackTab: HTMLElement | null = null

    for (const tabRoot of tabRoots) {
      if (!matchesTarget(tabRoot)) {
        continue
      }
      if (!fallbackTab && hasUsableTerminalBounds(tabRoot)) {
        fallbackTab = tabRoot
      }
      if (!tabRoot.dataset.tabId) {
        continue
      }
      const pane = findTerminalPane(tabRoot.dataset.tabId)
      if (pane) {
        return pane
      }
    }

    if (fallbackTab) {
      return fallbackTab
    }
  } catch {
    return null
  }
  return null
}

export function resolveLinkGeometries(activeLinks: A2ALinkEvent[]): ResolvedLinkGeometry[] {
  return activeLinks.map((link) => {
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

    // Self-link (or single terminal): generate an elegant loopback orbit arc
    // so directional beams, motifs (Flame/Foliage/Chain/Water/Tornado) and pulses render clearly
    if (p1.x === p2.x && p1.y === p2.y) {
      const startX = p1.x - 30
      const startY = p1.y - 10
      const endX = p1.x + 30
      const endY = p1.y - 10
      const ctrlY = p1.y - 120
      const pathD = `M ${startX} ${startY} Q ${p1.x} ${ctrlY} ${endX} ${endY}`
      return {
        link,
        p1: { x: startX, y: startY },
        p2: { x: endX, y: endY },
        midX: p1.x,
        midY: p1.y - 65,
        pathD,
        isFallback: false,
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
}
