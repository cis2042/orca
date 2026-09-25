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

export function findTerminalTabTitle(
  targetIndex?: number,
  targetName?: string,
  worktreeId?: string
): string | null {
  if (typeof document === 'undefined') {
    return null
  }
  const cleanTargetName = targetName?.replace(/^[@#]/, '')
  const selector = worktreeId
    ? sessionTerminalTabSelector(worktreeId)
    : '[data-tab-id][data-terminal-index]'
  let tabRoots = Array.from(document.querySelectorAll<HTMLElement>(selector))
  if (tabRoots.length === 0 && worktreeId) {
    tabRoots = Array.from(
      document.querySelectorAll<HTMLElement>('[data-tab-id][data-terminal-index]')
    )
  }
  const match = tabRoots.find((el) => {
    if (targetIndex !== undefined) {
      return el.dataset.terminalIndex === String(targetIndex)
    }
    return Boolean(cleanTargetName) && el.dataset.terminalIndex === cleanTargetName
  })
  return match?.dataset.tabTitle?.trim() || null
}

/** Tabs that carry a worktree-scoped @index. The same number exists in every session. */
export function sessionTerminalTabSelector(worktreeId: string, index?: number): string {
  const scope = `[data-worktree-id="${CSS.escape(worktreeId)}"]`
  const indexAttr =
    index === undefined ? '[data-terminal-index]' : `[data-terminal-index="${index}"]`
  return `${scope} [data-tab-id]${indexAttr}, ${scope}[data-tab-id]${indexAttr}`
}

export function findTerminalElement(
  targetIndex?: number,
  targetName?: string,
  worktreeId?: string
): Element | null {
  if (typeof document === 'undefined') {
    return null
  }

  try {
    const cleanTargetName = targetName?.replace(/^[@#]/, '')
    const selector = worktreeId
      ? sessionTerminalTabSelector(worktreeId)
      : '[data-tab-id][data-terminal-index]'
    let tabRoots = Array.from(document.querySelectorAll<HTMLElement>(selector))
    if (tabRoots.length === 0 && worktreeId) {
      tabRoots = Array.from(
        document.querySelectorAll<HTMLElement>('[data-tab-id][data-terminal-index]')
      )
    }
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

export function resolveLinkGeometries(
  activeLinks: A2ALinkEvent[],
  scopeWorktreeId?: string | null
): ResolvedLinkGeometry[] {
  return activeLinks.map((link) => {
    const inSession = !scopeWorktreeId || !link.worktreeId || link.worktreeId === scopeWorktreeId
    const motif = getA2AConnectionMotif(
      link,
      findTerminalTabTitle(link.fromIndex, link.from, scopeWorktreeId ?? undefined)
    )
    if (!inSession) {
      return {
        link,
        p1: null,
        p2: null,
        midX: 0,
        midY: 0,
        pathD: '',
        isFallback: true,
        motif
      }
    }

    const elFrom = findTerminalElement(link.fromIndex, link.from, scopeWorktreeId ?? undefined)
    const elTo = findTerminalElement(link.toIndex, link.to, scopeWorktreeId ?? undefined)

    let p1 = resolvePointFromElement(elFrom)
    let p2 = resolvePointFromElement(elTo)

    const isHumanSource =
      link.from.toLowerCase() === '@human' ||
      link.from.toLowerCase() === 'human' ||
      link.from.toLowerCase() === 'orca-cli' ||
      link.from.toLowerCase() === 'caller'

    if (!p1 && isHumanSource && typeof window !== 'undefined') {
      const w = window.innerWidth || 800
      const h = window.innerHeight || 600
      p1 = { x: w / 2, y: h - 25 }
    }

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
        motif
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
        motif
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
      // Multi-level curve (e.g. tab to split pane, pane to pane, or vertical split)
      const baseControlX = (p2.x - p1.x) * 0.5
      // If horizontally very close (e.g. top/bottom panes), bow outwards slightly so it's a visible dynamic arc rather than a collapsed line
      const bowX = dx < 40 ? 50 : 0
      const c1x = p1.x + baseControlX + bowX
      const c2x = p2.x - baseControlX + bowX
      midX = (c1x + c2x) / 2
      pathD = `M ${p1.x} ${p1.y} C ${c1x} ${p1.y}, ${c2x} ${p2.y}, ${p2.x} ${p2.y}`
    }

    return {
      link,
      p1,
      p2,
      midX,
      midY,
      pathD,
      isFallback: false,
      motif
    }
  })
}
