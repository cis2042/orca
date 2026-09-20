import { parseTerminalIndex, type A2ALinkEvent } from '../../../../shared/terminal-a2a-link'

export const A2A_TELEMETRY_WINDOW_MS = 60_000

export type A2ADirectedConnection = {
  id: string
  fromIndex: number
  toIndex: number
  count: number
  windowCount: number
  frequencyPerMinute: number
  latestTimestamp: number
  latestTrace: A2ALinkEvent
  isActive: boolean
}

export type A2AConnectionTelemetry = {
  windowMs: number
  totalEvents: number
  eventsPerMinute: number
  directedConnections: number
  activeConnections: number
  connectedAgents: number
  routes: A2ADirectedConnection[]
}

function resolveTerminalIndex(
  explicitIndex: number | undefined,
  target: string
): number | undefined {
  return explicitIndex ?? parseTerminalIndex(target)
}

function getRouteKey(trace: A2ALinkEvent): string | null {
  const fromIndex = resolveTerminalIndex(trace.fromIndex, trace.from)
  const toIndex = resolveTerminalIndex(trace.toIndex, trace.to)

  if (!fromIndex || !toIndex || fromIndex === toIndex) {
    return null
  }

  return `${fromIndex}->${toIndex}`
}

function getRouteIndexes(routeKey: string): { fromIndex: number; toIndex: number } {
  const [fromIndex, toIndex] = routeKey.split('->').map((value) => Number.parseInt(value, 10))
  return { fromIndex, toIndex }
}

export function summarizeA2AConnections(
  traces: readonly A2ALinkEvent[],
  activeLinks: readonly A2ALinkEvent[],
  now = Date.now(),
  windowMs = A2A_TELEMETRY_WINDOW_MS
): A2AConnectionTelemetry {
  const safeWindowMs =
    Number.isFinite(windowMs) && windowMs > 0 ? windowMs : A2A_TELEMETRY_WINDOW_MS
  const windowStart = now - safeWindowMs
  const routeMap = new Map<
    string,
    {
      count: number
      windowCount: number
      latestTimestamp: number
      latestTrace: A2ALinkEvent
    }
  >()

  for (const trace of traces) {
    const routeKey = getRouteKey(trace)
    if (!routeKey) {
      continue
    }

    const existing = routeMap.get(routeKey)
    const isInWindow = trace.timestamp >= windowStart && trace.timestamp <= now
    if (!existing) {
      routeMap.set(routeKey, {
        count: 1,
        windowCount: isInWindow ? 1 : 0,
        latestTimestamp: trace.timestamp,
        latestTrace: trace
      })
      continue
    }

    existing.count += 1
    if (isInWindow) {
      existing.windowCount += 1
    }
    if (trace.timestamp >= existing.latestTimestamp) {
      existing.latestTimestamp = trace.timestamp
      existing.latestTrace = trace
    }
  }

  const activeRouteKeys = new Set<string>()
  for (const link of activeLinks) {
    const routeKey = getRouteKey(link)
    if (!routeKey) {
      continue
    }
    activeRouteKeys.add(routeKey)
    if (!routeMap.has(routeKey)) {
      routeMap.set(routeKey, {
        count: 0,
        windowCount: 0,
        latestTimestamp: link.timestamp,
        latestTrace: link
      })
    }
  }

  const routes = Array.from(routeMap.entries())
    .map(([id, route]) => {
      const { fromIndex, toIndex } = getRouteIndexes(id)
      return {
        id,
        fromIndex,
        toIndex,
        count: route.count,
        windowCount: route.windowCount,
        frequencyPerMinute: (route.windowCount * 60_000) / safeWindowMs,
        latestTimestamp: route.latestTimestamp,
        latestTrace: route.latestTrace,
        isActive: activeRouteKeys.has(id)
      }
    })
    .sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1
      }
      if (a.frequencyPerMinute !== b.frequencyPerMinute) {
        return b.frequencyPerMinute - a.frequencyPerMinute
      }
      return b.latestTimestamp - a.latestTimestamp
    })

  const connectedAgentIndexes = new Set<number>()
  for (const route of routes) {
    connectedAgentIndexes.add(route.fromIndex)
    connectedAgentIndexes.add(route.toIndex)
  }

  const windowEventCount = traces.filter(
    (trace) => trace.timestamp >= windowStart && trace.timestamp <= now
  ).length

  return {
    windowMs: safeWindowMs,
    totalEvents: traces.length,
    eventsPerMinute: (windowEventCount * 60_000) / safeWindowMs,
    directedConnections: routes.length,
    activeConnections: routes.filter((route) => route.isActive).length,
    connectedAgents: connectedAgentIndexes.size,
    routes
  }
}

export function formatA2AFrequency(frequencyPerMinute: number): string {
  if (!Number.isFinite(frequencyPerMinute) || frequencyPerMinute <= 0) {
    return '0/min'
  }

  const rounded = Number.isInteger(frequencyPerMinute)
    ? String(frequencyPerMinute)
    : frequencyPerMinute.toFixed(1)
  return `${rounded}/min`
}
