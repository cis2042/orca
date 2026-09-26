import React, { useMemo } from 'react'
import { Radio, X, RotateCcw, Maximize2 } from 'lucide-react'
import type { A2ALinkEvent } from '../../../../shared/terminal-a2a-link'
import { A2ATelemetrySummary } from './A2ATelemetrySummary'
import { summarizeA2AConnections } from './a2a-telemetry'

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
  const telemetry = useMemo(
    () => summarizeA2AConnections(recentTraces, activeLinks),
    [recentTraces, activeLinks]
  )

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {hudOpen && (
        <div className="flex w-80 flex-col rounded-xl border border-a2a-flow/25 bg-a2a-canvas/95 p-3.5 text-foreground/90 shadow-floating backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between border-b border-a2a-flow/15 pb-2">
            <div className="flex items-center gap-2">
              <Radio className="size-4 text-a2a-flow animate-pulse" />
              <span className="text-xs font-semibold text-foreground">A2A 通訊軌跡 (Trace)</span>
              {activeLinks.length > 0 && (
                <span className="rounded-full border border-a2a-target/30 bg-a2a-target/10 px-1.5 py-0.2 text-[10px] font-mono font-medium text-a2a-target">
                  {activeLinks.length} active
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setHubOpen(true)}
                className="flex items-center gap-1 rounded border border-a2a-source/30 bg-a2a-source/10 px-1.5 py-0.5 text-[10px] text-a2a-source transition-colors hover:bg-a2a-source/20"
                title="展開完整 A2A 調度中樞 (Grokbot Hub)"
              >
                <Maximize2 className="size-2.5" />
                <span>調度中樞</span>
              </button>
              {recentTraces.length > 0 && (
                <button
                  type="button"
                  onClick={clearTraces}
                  className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setHudOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Close HUD"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          <A2ATelemetrySummary telemetry={telemetry} compact />

          {/* Quick Demo Triggers */}
          <div className="my-2 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground shrink-0">測試連線:</span>
              <button
                type="button"
                onClick={() => onTestTrigger('@2', '@5', 'npm test')}
                className="flex items-center gap-1 rounded border border-a2a-source/30 bg-a2a-source/10 px-2 py-0.5 text-[10px] font-mono text-a2a-source transition-colors hover:bg-a2a-source/20"
              >
                #2 ➔ #5
              </button>
              <button
                type="button"
                onClick={() => onTestTrigger('@2', '@8', 'review ready')}
                className="flex items-center gap-1 rounded border border-a2a-flow/30 bg-a2a-flow/10 px-2 py-0.5 text-[10px] font-mono text-a2a-flow transition-colors hover:bg-a2a-flow/20"
              >
                #2 ➔ #8
              </button>
              <button
                type="button"
                onClick={() => {
                  onTestTrigger('@2', '@5', 'task: build')
                  setTimeout(() => onTestTrigger('@2', '@8', 'task: test'), 200)
                }}
                className="flex items-center gap-1 rounded border border-a2a-target/30 bg-a2a-target/10 px-2 py-0.5 text-[10px] font-mono text-a2a-target transition-colors hover:bg-a2a-target/20"
              >
                分派 2➔5,8
              </button>
            </div>

            {/* 5-Color Motif Showcase */}
            <div className="flex items-center gap-1 pt-1 border-t border-a2a-flow/10">
              <span className="text-[9px] text-muted-foreground shrink-0">五色光束:</span>
              <button
                type="button"
                onClick={() => onTestTrigger('@2', '@5', 'motif:flame 烈焰光束 🔥')}
                title="烈焰光束 (Flame)"
                className="rounded border border-[#ff6b00]/40 bg-[#ff6b00]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#ff6b00] hover:bg-[#ff6b00]/25 transition-colors"
              >
                🔥 烈焰
              </button>
              <button
                type="button"
                onClick={() => onTestTrigger('@2', '@5', 'motif:foliage 綠葉藤蔓 🌿')}
                title="綠葉藤蔓 (Foliage)"
                className="rounded border border-[#72ff5a]/40 bg-[#72ff5a]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#72ff5a] hover:bg-[#72ff5a]/25 transition-colors"
              >
                🌿 藤蔓
              </button>
              <button
                type="button"
                onClick={() => onTestTrigger('@2', '@5', 'motif:chain 金屬鎖鏈 ⛓️')}
                title="金屬鎖鏈 (Chain)"
                className="rounded border border-[#c7d2fe]/40 bg-[#c7d2fe]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#c7d2fe] hover:bg-[#c7d2fe]/25 transition-colors"
              >
                ⛓️ 鎖鏈
              </button>
              <button
                type="button"
                onClick={() => onTestTrigger('@2', '@5', 'motif:water 冰藍流水 💧')}
                title="冰藍流水 (Water)"
                className="rounded border border-[#38bdf8]/40 bg-[#38bdf8]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#38bdf8] hover:bg-[#38bdf8]/25 transition-colors"
              >
                💧 流水
              </button>
              <button
                type="button"
                onClick={() => onTestTrigger('@2', '@5', 'motif:tornado 洋紅旋風 🌪️')}
                title="洋紅旋風 (Tornado)"
                className="rounded border border-[#d946ef]/40 bg-[#d946ef]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#d946ef] hover:bg-[#d946ef]/25 transition-colors"
              >
                🌪️ 旋風
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-a2a-flow/10">
              <span className="text-[9px] text-muted-foreground shrink-0">蜀將光束:</span>
              <button
                type="button"
                onClick={() => onTestTrigger('@2', '@5', '關羽令：青龍出鞘 🌿')}
                title="關羽 · 綠葉藤蔓"
                className="rounded border border-a2a-leaf/40 bg-a2a-leaf/15 px-1.5 py-0.5 text-[10px] font-medium text-a2a-leaf hover:bg-a2a-leaf/25 transition-colors"
              >
                關羽
              </button>
              <button
                type="button"
                onClick={() => onTestTrigger('@2', '@5', '趙雲令：白光破陣 🌙')}
                title="趙雲 · 白光"
                className="rounded border border-a2a-moonlight/40 bg-a2a-moonlight/15 px-1.5 py-0.5 text-[10px] font-medium text-a2a-moonlight hover:bg-a2a-moonlight/25 transition-colors"
              >
                趙雲
              </button>
              <button
                type="button"
                onClick={() => onTestTrigger('@2', '@5', '馬超令：金鎗突進 ⚜️')}
                title="馬超 · 金光"
                className="rounded border border-a2a-gold/40 bg-a2a-gold/15 px-1.5 py-0.5 text-[10px] font-medium text-a2a-gold hover:bg-a2a-gold/25 transition-colors"
              >
                馬超
              </button>
              <button
                type="button"
                onClick={() => onTestTrigger('@2', '@5', '姜維令：櫻雨佈陣 🌸')}
                title="姜維 · 粉櫻"
                className="rounded border border-a2a-blossom/40 bg-a2a-blossom/15 px-1.5 py-0.5 text-[10px] font-medium text-a2a-blossom hover:bg-a2a-blossom/25 transition-colors"
              >
                姜維
              </button>
              <button
                type="button"
                onClick={() => onTestTrigger('@2', '@5', '魏延令：烈焰奇襲 🔥')}
                title="魏延 · 烈焰"
                className="rounded border border-a2a-flame/40 bg-a2a-flame/15 px-1.5 py-0.5 text-[10px] font-medium text-a2a-flame hover:bg-a2a-flame/25 transition-colors"
              >
                魏延
              </button>
              <button
                type="button"
                onClick={() => onTestTrigger('@2', '@5', '張飛令：紫電當陽 ⚡')}
                title="張飛 · 紫電"
                className="rounded border border-a2a-thunder/40 bg-a2a-thunder/15 px-1.5 py-0.5 text-[10px] font-medium text-a2a-thunder hover:bg-a2a-thunder/25 transition-colors"
              >
                張飛
              </button>
            </div>
          </div>

          {/* Recent Trace History List */}
          <div className="max-h-56 overflow-y-auto scrollbar-sleek space-y-1.5 pr-1">
            {recentTraces.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                尚無 Agent 溝通記錄
                <div className="mt-1 text-[10px] text-muted-foreground/70">
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
                        ? 'border-a2a-flow/50 bg-a2a-flow/10'
                        : 'border-border/80 bg-card/50 hover:border-a2a-flow/30'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-[9px] text-a2a-source/70">SRC</span>
                        <span className="font-bold text-a2a-source">
                          {trace.fromIndex !== undefined ? `#${trace.fromIndex}` : trace.from}
                        </span>
                        <span className="text-a2a-flow">→</span>
                        <span className="text-[9px] text-a2a-target/70">DST</span>
                        <span className="font-bold text-a2a-target">
                          {trace.toIndex !== undefined ? `#${trace.toIndex}` : trace.to}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {trace.type.toUpperCase()}
                        </span>
                      </div>
                      {trace.text && (
                        <span className="mt-0.5 truncate text-[11px] text-foreground/80">
                          {trace.text}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => replayTrace(trace.id)}
                      title="重新播放通訊連線"
                      className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent hover:text-foreground"
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
            className="flex items-center gap-1.5 rounded-full border border-violet-500/50 bg-zinc-950/95 px-3 py-1 text-xs font-mono text-violet-300 shadow-floating backdrop-blur-md transition-all hover:scale-105 hover:bg-zinc-900 ring-1 ring-violet-500/30"
          >
            <Radio className="size-3 text-cyan-400 animate-pulse" />
            <span>A2A 8-AI Demo</span>
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
            className="flex size-7 items-center justify-center rounded-full border border-violet-500/40 bg-violet-600/20 text-violet-300 shadow-md backdrop-blur-md transition-transform hover:scale-110 hover:bg-violet-600/40"
          >
            <Maximize2 className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
