import React from 'react'
import { ArrowRight, Play, Terminal } from 'lucide-react'
import { useAppStore } from '../../store'
import { PRESET_TAB_COLORS } from '../tab-bar/tab-colors'
import type { A2ALinkEvent } from '../../../../shared/terminal-a2a-link'
import type { AgentNodeData } from './AgentTopologyGraph'
import type { A2AConnectionTelemetry } from './a2a-telemetry'

type AgentTopologyInspectorProps = {
  selectedAgent: AgentNodeData
  agentTraces: A2ALinkEvent[]
  telemetry: A2AConnectionTelemetry
  onTakeControl: (index: number) => void
  onReplayTrace: (id: string) => void
  onClose: () => void
}

export function AgentTopologyInspector({
  selectedAgent,
  agentTraces,
  telemetry,
  onTakeControl,
  onReplayTrace,
  onClose
}: AgentTopologyInspectorProps): React.JSX.Element {
  const routeCount = telemetry.routes.filter(
    (route) => route.fromIndex === selectedAgent.index || route.toIndex === selectedAgent.index
  ).length

  return (
    <div className="border-t border-a2a-flow/15 bg-card/80 p-3 backdrop-blur-md transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-full border border-a2a-source/40 bg-a2a-source/15 font-mono text-xs font-bold text-a2a-source">
            #{selectedAgent.index}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{selectedAgent.role}</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[10px] font-medium ${
                  selectedAgent.isCommunicating
                    ? 'border border-a2a-source/40 bg-a2a-source/20 text-a2a-source'
                    : selectedAgent.isActive
                      ? 'border border-a2a-target/30 bg-a2a-target/15 text-a2a-target'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {selectedAgent.isCommunicating
                  ? '通訊中'
                  : selectedAgent.isActive
                    ? '就緒'
                    : '待命中'}
              </span>
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              標識: @{selectedAgent.index} · 互動: {agentTraces.length} 次 · 有向路由: {routeCount}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedAgent.tabId && (
            <div className="mr-2 flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/60 px-2 py-1">
              <span className="text-[11px] font-medium text-muted-foreground">框色:</span>
              <div className="flex items-center gap-1">
                {PRESET_TAB_COLORS.slice(0, 8).map((color) => (
                  <button
                    key={color.label}
                    type="button"
                    className={`size-3 rounded-full border transition-transform hover:scale-125 ${
                      selectedAgent.color === color.value
                        ? 'ring-1 ring-foreground ring-offset-1 ring-offset-card'
                        : ''
                    } ${color.value ? 'border-transparent' : 'border-border bg-transparent'}`}
                    style={color.value ? { backgroundColor: color.value } : undefined}
                    onClick={() => {
                      if (selectedAgent.tabId) {
                        useAppStore.getState().setTabColor(selectedAgent.tabId, color.value)
                      }
                    }}
                    title={color.label}
                  />
                ))}
                <label
                  className="relative flex size-3 cursor-pointer items-center justify-center rounded-full border border-dashed border-border hover:border-muted-foreground"
                  title="自訂色彩"
                >
                  <span className="text-[7px] leading-none text-muted-foreground">+</span>
                  <input
                    type="color"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    value={selectedAgent.color ?? '#3b82f6'}
                    onChange={(event) => {
                      if (selectedAgent.tabId) {
                        useAppStore.getState().setTabColor(selectedAgent.tabId, event.target.value)
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => onTakeControl(selectedAgent.index)}
            className="flex items-center gap-1.5 rounded-lg border border-a2a-flow/40 bg-a2a-flow/10 px-3 py-1.5 text-xs font-medium text-a2a-flow-soft shadow-sm transition-colors hover:bg-a2a-flow/20"
          >
            <Terminal className="size-3.5" />
            <span>接管終端 (Take Control)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="關閉 Agent 詳情"
          >
            ✕
          </button>
        </div>
      </div>

      {agentTraces.length > 0 && (
        <div className="scrollbar-sleek mt-2.5 max-h-24 space-y-1 overflow-y-auto pr-1">
          {agentTraces.slice(0, 3).map((trace) => (
            <div
              key={trace.id}
              className="flex items-center justify-between rounded border border-border/40 bg-background/40 px-2 py-1 text-[11px] font-mono"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-a2a-source">#{trace.fromIndex ?? trace.from}</span>
                <ArrowRight className="size-3 shrink-0 text-a2a-flow" />
                <span className="text-a2a-target">#{trace.toIndex ?? trace.to}</span>
                <span className="max-w-xs truncate text-foreground/80">
                  {trace.text || trace.type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onReplayTrace(trace.id)}
                className="text-muted-foreground hover:text-foreground/80"
                title="重播動效"
              >
                <Play className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
