import type { A2ALinkAnchor, A2ALinkEvent } from '../../../../shared/terminal-a2a-link'

export type Point = { x: number; y: number }

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

export function findAnchorElement(anchor: A2ALinkAnchor | undefined): HTMLElement | null {
  if (!anchor || typeof document === 'undefined') {
    return null
  }
  if (anchor.ptyId) {
    const ptyPane = Array.from(
      document.querySelectorAll<HTMLElement>(`[data-pty-id="${CSS.escape(anchor.ptyId)}"]`)
    ).find(hasUsableTerminalBounds)
    if (ptyPane) {
      return ptyPane
    }
  }
  return (
    findTerminalPane(anchor.tabId) ??
    Array.from(
      document.querySelectorAll<HTMLElement>(`[data-tab-id="${CSS.escape(anchor.tabId)}"]`)
    ).find(hasUsableTerminalBounds) ??
    null
  )
}

export function findAnchorTabTitle(anchor: A2ALinkAnchor | undefined): string | null {
  if (!anchor || typeof document === 'undefined') {
    return null
  }
  const tab = document.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(anchor.tabId)}"]`)
  return tab?.dataset.tabTitle?.trim() || anchor.title
}

export function isLinkInScope(link: A2ALinkEvent, scopeWorktreeId?: string | null): boolean {
  if (link.commandLink || !scopeWorktreeId || !link.worktreeId) {
    return true
  }
  return (
    link.worktreeId === scopeWorktreeId ||
    link.fromAnchor?.worktreeId === scopeWorktreeId ||
    link.toAnchor?.worktreeId === scopeWorktreeId
  )
}

export function resolveOffstageCampPoint(slot: 'from' | 'to'): Point | null {
  if (typeof window === 'undefined') {
    return null
  }
  const h = window.innerHeight || 600
  return { x: 18, y: slot === 'from' ? h * 0.42 : h * 0.58 }
}
