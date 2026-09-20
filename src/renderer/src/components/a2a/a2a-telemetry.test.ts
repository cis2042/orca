import { describe, expect, it } from 'vitest'
import type { A2ALinkEvent } from '../../../../shared/terminal-a2a-link'
import { formatA2AFrequency, summarizeA2AConnections } from './a2a-telemetry'

function trace(
  id: string,
  from: string,
  to: string,
  timestamp: number,
  overrides: Partial<A2ALinkEvent> = {}
): A2ALinkEvent {
  return {
    id,
    from,
    to,
    type: 'message',
    timestamp,
    ...overrides
  }
}

describe('a2a-telemetry', () => {
  it('reports directed routes and their trailing-window frequency', () => {
    const telemetry = summarizeA2AConnections(
      [
        trace('a', '@2', '@5', 119_000),
        trace('b', '@2', '@5', 90_000),
        trace('c', '@5', '@2', 118_000),
        trace('d', '@8', '@2', 10_000)
      ],
      [trace('a', '@2', '@5', 119_000)],
      120_000
    )

    expect(telemetry.totalEvents).toBe(4)
    expect(telemetry.eventsPerMinute).toBe(3)
    expect(telemetry.directedConnections).toBe(3)
    expect(telemetry.activeConnections).toBe(1)
    expect(telemetry.connectedAgents).toBe(3)
    expect(telemetry.routes[0]).toMatchObject({
      id: '2->5',
      fromIndex: 2,
      toIndex: 5,
      count: 2,
      windowCount: 2,
      frequencyPerMinute: 2,
      isActive: true
    })
    expect(telemetry.routes.map((route) => route.id)).toEqual(['2->5', '5->2', '8->2'])
  })

  it('keeps source and target direction separate and ignores self-links', () => {
    const telemetry = summarizeA2AConnections(
      [
        trace('a', '@2', '@5', 60_000),
        trace('b', '@5', '@2', 60_000),
        trace('c', '@2', '@2', 60_000),
        trace('d', 'worker', 'reviewer', 60_000, { fromIndex: 2, toIndex: 8 })
      ],
      [],
      60_000
    )

    expect(telemetry.routes.map((route) => route.id)).toEqual(['2->5', '5->2', '2->8'])
    expect(telemetry.routes.find((route) => route.id === '2->5')?.latestTrace.id).toBe('a')
  })

  it('includes an active route even when history was cleared', () => {
    const active = trace('active', '@1', '@3', 1_000)
    const telemetry = summarizeA2AConnections([], [active], 1_000)

    expect(telemetry.routes).toHaveLength(1)
    expect(telemetry.routes[0]).toMatchObject({
      id: '1->3',
      count: 0,
      isActive: true,
      latestTrace: active
    })
  })

  it('formats zero, whole, and fractional rates for the report', () => {
    expect(formatA2AFrequency(0)).toBe('0/min')
    expect(formatA2AFrequency(3)).toBe('3/min')
    expect(formatA2AFrequency(1.25)).toBe('1.3/min')
  })
})
