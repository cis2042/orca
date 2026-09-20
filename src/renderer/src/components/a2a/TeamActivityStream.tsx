import React, { useState, useMemo } from 'react'
import {
  RotateCcw,
  Terminal,
  ArrowRight,
  Zap,
  MessageSquare,
  Keyboard,
  KeyRound,
  Filter,
  Trash2
} from 'lucide-react'
import { useA2AStore } from '../../store/a2a-traces-store'
import type { A2ALinkType } from '../../../../shared/terminal-a2a-link'
import { A2ATelemetrySummary } from './A2ATelemetrySummary'
import { formatA2AFrequency, summarizeA2AConnections } from './a2a-telemetry'

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 5) {
    return '剛剛'
  }
  if (seconds < 60) {
    return `${seconds} 秒前`
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} 分鐘前`
  }
  const hours = Math.floor(minutes / 60)
  return `${hours} 小時前`
}

function getTypeBadge(type: A2ALinkType): {
  label: string
  icon: React.JSX.Element
  color: string
} {
  switch (type) {
    case 'send':
      return {
        label: 'DISPATCH 派工',
        icon: <Zap className="size-3 text-a2a-warning" />,
        color: 'border-a2a-warning/30 bg-a2a-warning/10 text-a2a-warning'
      }
    case 'message':
      return {
        label: 'MESSAGE 傳訊',
        icon: <MessageSquare className="size-3 text-a2a-flow" />,
        color: 'border-a2a-flow/30 bg-a2a-flow/10 text-a2a-flow'
      }
    case 'type':
      return {
        label: 'INPUT 輸入',
        icon: <Keyboard className="size-3 text-a2a-source" />,
        color: 'border-a2a-source/30 bg-a2a-source/10 text-a2a-source'
      }
    case 'keys':
      return {
        label: 'KEYS 按鍵',
        icon: <KeyRound className="size-3 text-a2a-target" />,
        color: 'border-a2a-target/30 bg-a2a-target/10 text-a2a-target'
      }
  }
}

export function TeamActivityStream(): React.JSX.Element {
  const recentTraces = useA2AStore((s) => s.recentTraces)
  const activeLinks = useA2AStore((s) => s.activeLinks)
  const replayTrace = useA2AStore((s) => s.replayTrace)
  const clearTraces = useA2AStore((s) => s.clearTraces)
  const [filterText, setFilterText] = useState('')

  const telemetry = useMemo(
    () => summarizeA2AConnections(recentTraces, activeLinks),
    [recentTraces, activeLinks]
  )

  const filteredTraces = useMemo(() => {
    if (!filterText.trim()) {
      return recentTraces
    }
    const q = filterText.toLowerCase()
    return recentTraces.filter((t) => {
      const fromStr = `${t.from} ${t.fromIndex ?? ''}`.toLowerCase()
      const toStr = `${t.to} ${t.toIndex ?? ''}`.toLowerCase()
      const content = (t.text || '').toLowerCase()
      return fromStr.includes(q) || toStr.includes(q) || content.includes(q)
    })
  }, [recentTraces, filterText])

  const handleTakeControl = (index?: number) => {
    if (!index || typeof document === 'undefined') {
      return
    }
    const targetTab = document.querySelector<HTMLElement>(`[data-terminal-index="${index}"]`)
    if (targetTab) {
      targetTab.click()
    }
  }

  return (
    <div className="flex size-full flex-col overflow-hidden bg-background/40">
      {/* Top Filter & Toolbar */}
      <div className="flex items-center justify-between border-b border-border/80 bg-card/40 px-4 py-2.5">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Filter className="size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="過濾 Agent (如 @2, @5) 或指令關鍵字..."
            className="w-full rounded-md border border-border bg-background/60 px-2.5 py-1 text-xs text-foreground/90 placeholder:text-muted-foreground/70 focus:border-a2a-flow/60 focus:outline-none"
          />
          {filterText && (
            <button
              type="button"
              onClick={() => setFilterText('')}
              className="text-xs text-muted-foreground hover:text-foreground/80"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-muted-foreground">
            共 {filteredTraces.length} 條活動 · {formatA2AFrequency(telemetry.eventsPerMinute)}
          </span>
          {recentTraces.length > 0 && (
            <button
              type="button"
              onClick={clearTraces}
              title="清除活動記錄"
              className="flex items-center gap-1 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-a2a-warning"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-a2a-flow/15 bg-a2a-canvas/70">
        <A2ATelemetrySummary telemetry={telemetry} />
      </div>

      {/* Activity Cards Feed */}
      <div className="scrollbar-sleek flex-1 space-y-3 overflow-y-auto p-4">
        {filteredTraces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <MessageSquare className="mb-2 size-8 stroke-1 text-muted-foreground/70" />
            <div className="text-sm font-medium text-muted-foreground">尚無跨 Agent 活動記錄</div>
            <div className="mt-1 max-w-xs text-xs text-muted-foreground/70">
              當終端機內的 Agent 執行跨機指令（如 orca bridge send @5）時，會即時聚合成結構化卡片。
            </div>
          </div>
        ) : (
          filteredTraces.map((trace) => {
            const isActive = activeLinks.some((l) => l.id === trace.id)
            const typeBadge = getTypeBadge(trace.type)

            return (
              <div
                key={trace.id}
                className={`group relative rounded-xl border p-3.5 transition-all shadow-sm ${
                  isActive
                    ? 'border-a2a-flow/60 bg-a2a-flow/10 ring-1 ring-a2a-flow/30'
                    : 'border-border/80 bg-card/60 hover:border-a2a-flow/30 hover:bg-card/90'
                }`}
              >
                {/* Header: Sender -> Recipient + Badge + Time */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <div className="flex items-center gap-1.5 rounded-md border border-a2a-source/30 bg-background/80 px-2 py-0.5 font-bold text-a2a-source">
                      <span>#{trace.fromIndex ?? trace.from}</span>
                      {trace.fromLabel && (
                        <span className="text-[10px] font-normal text-muted-foreground">
                          ({trace.fromLabel})
                        </span>
                      )}
                    </div>

                    <ArrowRight className="size-3 text-a2a-flow" />

                    <div className="flex items-center gap-1.5 rounded-md border border-a2a-target/30 bg-background/80 px-2 py-0.5 font-bold text-a2a-target">
                      <span>#{trace.toIndex ?? trace.to}</span>
                      {trace.toLabel && (
                        <span className="text-[10px] font-normal text-muted-foreground">
                          ({trace.toLabel})
                        </span>
                      )}
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${typeBadge.color}`}
                    >
                      {typeBadge.icon}
                      {typeBadge.label}
                    </span>

                    {trace.fromIndex !== undefined && trace.toIndex !== undefined && (
                      <span className="inline-flex items-center rounded-md border border-a2a-flow/25 bg-a2a-flow/5 px-1.5 py-0.5 text-[10px] font-mono text-a2a-flow">
                        {formatA2AFrequency(
                          telemetry.routes.find(
                            (route) =>
                              route.fromIndex === trace.fromIndex && route.toIndex === trace.toIndex
                          )?.frequencyPerMinute ?? 0
                        )}
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-[11px] text-muted-foreground">
                    {formatTimeAgo(trace.timestamp)}
                  </span>
                </div>

                {/* Message / Code Body */}
                {trace.text && (
                  <div className="mt-2.5 overflow-x-auto rounded-lg border border-border/80 bg-background/80 p-2.5 font-mono text-xs text-foreground/90 select-text">
                    {trace.text}
                  </div>
                )}

                {/* Action Footer */}
                <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-1 text-xs">
                  <span className="font-mono text-[10px] text-muted-foreground/70">
                    ID: {trace.id.slice(0, 16)}...
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => replayTrace(trace.id)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      title="重播視覺連線"
                    >
                      <RotateCcw className="size-3" />
                      <span>重播</span>
                    </button>

                    {trace.toIndex && (
                      <button
                        type="button"
                        onClick={() => handleTakeControl(trace.toIndex)}
                        className="flex items-center gap-1 rounded border border-border/60 bg-muted/70 px-2 py-1 text-foreground/80 transition-colors hover:border-a2a-flow/40 hover:bg-a2a-flow/15 hover:text-a2a-flow-soft"
                        title={`切換至目標終端 #${trace.toIndex}`}
                      >
                        <Terminal className="size-3" />
                        <span>接管 #{trace.toIndex}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
