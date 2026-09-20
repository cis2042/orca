import React from 'react'
import { Radio, X, RotateCcw, Maximize2 } from 'lucide-react'
import type { A2ALinkEvent } from '../../../../shared/terminal-a2a-link'

type A2AConnectionHudProps = {
  hudOpen: boolean
  setHudOpen: (open: boolean) => void
  activeLinks: A2ALinkEvent[]
  recentTraces: A2ALinkEvent[]
  hasAnyTrace: boolean
  setHubOpen: (open: boolean) => void
  clearTraces: () => void
  replayTrace: (id: string) => void
  onTestTrigger: (from: string, to: string, text: string) => void
}

export function A2AConnectionHud({
  hudOpen,
  setHudOpen,
  activeLinks,
  recentTraces,
  hasAnyTrace,
  setHubOpen,
  clearTraces,
  replayTrace,
  onTestTrigger
}: A2AConnectionHudProps): React.JSX.Element | null {
  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {hudOpen && (
        <div className="flex w-80 flex-col rounded-xl border border-zinc-800 bg-zinc-950/95 p-3.5 text-zinc-200 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <Radio className="size-4 text-violet-400 animate-pulse" />
              <span className="text-xs font-semibold text-zinc-100">A2A 通訊軌跡 (Trace)</span>
              {activeLinks.length > 0 && (
                <span className="rounded-full bg-violet-500/20 px-1.5 py-0.2 text-[10px] font-mono font-medium text-violet-300 border border-violet-500/30">
                  {activeLinks.length} active
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setHubOpen(true)}
                className="flex items-center gap-1 rounded bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 px-1.5 py-0.5 text-[10px] text-violet-300 transition-colors"
                title="展開完整 A2A 調度中樞 (Grokbot Hub)"
              >
                <Maximize2 className="size-2.5" />
                <span>調度中樞</span>
              </button>
              {recentTraces.length > 0 && (
                <button
                  type="button"
                  onClick={clearTraces}
                  className="rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setHudOpen(false)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                aria-label="Close HUD"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Demo Triggers */}
          <div className="my-2 flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-400">測試連線:</span>
            <button
              type="button"
              onClick={() => onTestTrigger('@2', '@5', 'npm test')}
              className="flex items-center gap-1 rounded bg-violet-500/15 hover:bg-violet-500/25 px-2 py-0.5 text-[10px] font-mono text-violet-300 border border-violet-500/30 transition-colors"
            >
              #2 ➔ #5
            </button>
            <button
              type="button"
              onClick={() => onTestTrigger('@2', '@8', 'review ready')}
              className="flex items-center gap-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 px-2 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-500/30 transition-colors"
            >
              #2 ➔ #8
            </button>
            <button
              type="button"
              onClick={() => {
                onTestTrigger('@2', '@5', 'task: build')
                setTimeout(() => onTestTrigger('@2', '@8', 'task: test'), 200)
              }}
              className="flex items-center gap-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 px-2 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/30 transition-colors"
            >
              分派 2➔5,8
            </button>
          </div>

          {/* Recent Trace History List */}
          <div className="max-h-56 overflow-y-auto scrollbar-sleek space-y-1.5 pr-1">
            {recentTraces.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                尚無 Agent 溝通記錄
                <div className="mt-1 text-[10px] text-zinc-600">
                  使用 orca bridge send @5 指令即可觸發連線痕跡
                </div>
              </div>
            ) : (
              recentTraces.map((trace) => {
                const isActive = activeLinks.some((l) => l.id === trace.id)
                return (
                  <div
                    key={trace.id}
                    className={`group flex items-center justify-between rounded-lg p-2 text-xs border transition-all ${
                      isActive
                        ? 'border-violet-500/50 bg-violet-500/10'
                        : 'border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="font-bold text-violet-300">
                          {trace.fromIndex !== undefined ? `#${trace.fromIndex}` : trace.from}
                        </span>
                        <span className="text-zinc-500">➔</span>
                        <span className="font-bold text-emerald-300">
                          {trace.toIndex !== undefined ? `#${trace.toIndex}` : trace.to}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {trace.type.toUpperCase()}
                        </span>
                      </div>
                      {trace.text && (
                        <span className="truncate text-[11px] text-zinc-300 mt-0.5">
                          {trace.text}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => replayTrace(trace.id)}
                      title="重新播放通訊連線"
                      className="rounded p-1 text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-zinc-800 hover:text-zinc-200 transition-opacity"
                    >
                      <RotateCcw className="size-3" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Mini Trigger Badge */}
      {hasAnyTrace && !hudOpen && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setHudOpen(true)}
            data-testid="a2a-hud-trigger"
            className="flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-zinc-950/80 px-2.5 py-1 text-xs font-mono text-violet-300 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-zinc-900"
          >
            <Radio className="size-3 text-violet-400 animate-pulse" />
            <span>A2A Trace</span>
            {activeLinks.length > 0 && (
              <span className="rounded-full bg-violet-500/30 px-1.5 py-0.2 text-[10px] font-bold text-violet-200">
                {activeLinks.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setHubOpen(true)}
            title="開啟視覺化調度中樞 (Grokbot Hub)"
            className="flex items-center justify-center size-6 rounded-full border border-violet-500/40 bg-violet-600/30 text-violet-200 hover:bg-violet-600/50 shadow-md backdrop-blur-md transition-transform hover:scale-110"
          >
            <Maximize2 className="size-3" />
          </button>
        </div>
      )}
    </div>
  )
}
