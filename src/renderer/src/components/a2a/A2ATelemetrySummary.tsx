import React from 'react'
import { formatA2AFrequency, type A2AConnectionTelemetry } from './a2a-telemetry'

type A2ATelemetrySummaryProps = {
  telemetry: A2AConnectionTelemetry
  compact?: boolean
}

const METRIC_STYLES = [
  {
    label: '1M RATE',
    detail: '事件頻率',
    valueClass: 'text-a2a-flow',
    borderClass: 'border-a2a-flow/30',
    glowClass: 'bg-a2a-flow/5'
  },
  {
    label: 'ROUTES',
    detail: '有向互連',
    valueClass: 'text-a2a-source',
    borderClass: 'border-a2a-source/30',
    glowClass: 'bg-a2a-source/5'
  },
  {
    label: 'LIVE',
    detail: '目前流量',
    valueClass: 'text-a2a-target',
    borderClass: 'border-a2a-target/30',
    glowClass: 'bg-a2a-target/5'
  },
  {
    label: 'AGENTS',
    detail: '已識別節點',
    valueClass: 'text-a2a-warning',
    borderClass: 'border-a2a-warning/30',
    glowClass: 'bg-a2a-warning/5'
  }
] as const

export function A2ATelemetrySummary({
  telemetry,
  compact = false
}: A2ATelemetrySummaryProps): React.JSX.Element {
  const values = [
    formatA2AFrequency(telemetry.eventsPerMinute),
    String(telemetry.directedConnections),
    String(telemetry.activeConnections),
    String(telemetry.connectedAgents)
  ]

  return (
    <section
      aria-label="A2A telemetry report"
      className={`grid grid-cols-2 gap-1.5 sm:grid-cols-4 ${compact ? 'p-1.5' : 'p-2.5'}`}
    >
      {METRIC_STYLES.map((metric, index) => (
        <div
          key={metric.label}
          className={`min-w-0 rounded-md border ${metric.borderClass} ${metric.glowClass} ${compact ? 'px-2 py-1.5' : 'px-2.5 py-2'}`}
        >
          <div className="flex items-center justify-between gap-1 font-mono text-[9px] tracking-[0.14em] text-muted-foreground">
            <span>{metric.label}</span>
            <span className="truncate tracking-normal text-muted-foreground/70">
              {metric.detail}
            </span>
          </div>
          <div className={`mt-0.5 font-mono text-sm font-semibold ${metric.valueClass}`}>
            {values[index]}
          </div>
        </div>
      ))}
    </section>
  )
}
