import React, { useEffect } from 'react'
import { Network, Activity, X, Bot, Radio, Sparkles, Zap, Film } from 'lucide-react'
import { toast } from 'sonner'
import { useA2AStore } from '../../store/a2a-traces-store'
import { useAppStore } from '../../store'
import { a2aEventInSession } from '../../../../shared/terminal-a2a-link'
import { AgentTopologyGraph } from './AgentTopologyGraph'
import { TeamActivityStream } from './TeamActivityStream'
import { A2ACommanderBar } from './A2ACommanderBar'
import { A2ACinemaDemo } from './A2ACinemaDemo'

type SendA2ALinkResult = {
  ok?: boolean
  delivered?: boolean
  targetHandle?: string
  bytesWritten?: number
  executionState?: string
  error?: string
}

export function A2ADispatchHub(): React.JSX.Element | null {
  const isHubOpen = useA2AStore((s) => s.isHubOpen)
  const setHubOpen = useA2AStore((s) => s.setHubOpen)
  const hubTab = useA2AStore((s) => s.hubTab)
  const setHubTab = useA2AStore((s) => s.setHubTab)
  const recentTraces = useA2AStore((s) => s.recentTraces)
  const activeLinks = useA2AStore((s) => s.activeLinks)
  const addTrace = useA2AStore((s) => s.addTrace)
  const activeWorktreeId = useAppStore((s) => s.activeWorktreeId)
  const sessionLinks = activeLinks.filter((link) => a2aEventInSession(link, activeWorktreeId))
  const sessionTraces = recentTraces.filter((trace) => a2aEventInSession(trace, activeWorktreeId))

  // Close with Escape key
  useEffect(() => {
    if (!isHubOpen) {
      return
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHubOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isHubOpen, setHubOpen])

  if (!isHubOpen) {
    return null
  }

  const handleLiveProbe = async () => {
    if (!activeWorktreeId) {
      toast.warning('A2A 探針只送到目前這個 Session。請先選取一個 Session。')
      return
    }
    const trace = {
      id: `a2a-probe-${Date.now()}`,
      from: '@1',
      to: '@2',
      fromIndex: 1,
      toIndex: 2,
      fromLabel: 'Supervisor',
      toLabel: 'Worker',
      type: 'send' as const,
      text: 'echo "[A2A Live Probe OK] connection verified at $(date +%H:%M:%S)"',
      timestamp: Date.now(),
      worktreeId: activeWorktreeId
    }
    if (typeof window !== 'undefined' && window.api?.ui?.sendA2ALink) {
      try {
        const res = (await window.api.ui.sendA2ALink(trace)) as unknown as SendA2ALinkResult
        if (res?.delivered) {
          addTrace({ ...trace, delivered: true, executionState: 'delivered' })
          toast.success('🟢 A2A 真實通訊探針已寫入 @2 PTY 並執行！')
        } else if (res?.error) {
          toast.warning(`⚠️ 探針已發送，但目標未就緒: ${res.error}`)
        } else {
          toast.info('ℹ️ 探針信號已廣播')
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        toast.error(`探針傳送異常: ${msg}`)
      }
    }
  }

  const handleSimulateDemo = () => {
    setHubTab('demo')
    toast.success('🎬 啟動 8-Agent 五色光全息協同調度展示！')
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200"
      data-testid="a2a-dispatch-hub-modal"
    >
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={() => setHubOpen(false)} aria-hidden="true" />

      {/* Main Glass Dialog */}
      <div className="relative flex flex-col w-full max-w-4xl h-[88vh] max-h-[720px] rounded-2xl border border-zinc-700/80 bg-zinc-950/95 shadow-2xl overflow-hidden text-zinc-100 z-10 ring-1 ring-white/10">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-3.5 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-900/20">
              <Bot className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
                  A2A 視覺化協同調度中樞
                </h2>
                <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-300 border border-violet-500/30">
                  Grokbot Hub
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                {sessionLinks.length > 0 ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Radio className="size-3 animate-pulse" />
                    {sessionLinks.length} 個通訊連線進行中
                  </span>
                ) : (
                  `${sessionTraces.length} 筆通訊歷史記錄`
                )}
              </p>
            </div>
          </div>

          {/* Tab Switcher & Actions */}
          <div className="flex items-center gap-3">
            {/* Mode Switcher */}
            <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setHubTab('topology')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all ${
                  hubTab === 'topology'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Network className="size-3.5" />
                <span>拓撲視圖</span>
              </button>
              <button
                type="button"
                onClick={() => setHubTab('stream')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all ${
                  hubTab === 'stream'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Activity className="size-3.5" />
                <span>活動流</span>
              </button>
              <button
                type="button"
                onClick={() => setHubTab('demo')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-all ${
                  hubTab === 'demo'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm ring-1 ring-violet-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Film className="size-3.5 text-cyan-400" />
                <span>8-Agent 演示</span>
              </button>
            </div>

            {/* Real Live Probe */}
            <button
              type="button"
              onClick={handleLiveProbe}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600/15 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/25 transition-colors shadow-sm"
              title="發送真實探針指令到 @2 PTY 驗證雙向通訊"
            >
              <Zap className="size-3 text-emerald-400" />
              <span>真實探針</span>
            </button>

            {/* Visual Demo Animation */}
            <button
              type="button"
              onClick={handleSimulateDemo}
              className="flex items-center gap-1.5 rounded-lg border border-violet-500/50 bg-violet-600/20 px-2.5 py-1 text-xs font-semibold text-violet-300 hover:bg-violet-600/30 transition-colors shadow-sm"
              title="播放 8-Agent 五色光全息協同技術演示"
            >
              <Sparkles
                className="size-3 text-cyan-400 animate-spin"
                style={{ animationDuration: '4s' }}
              />
              <span>8-AI Demo</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setHubOpen(false)}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden relative">
          {hubTab === 'topology' ? (
            <AgentTopologyGraph />
          ) : hubTab === 'stream' ? (
            <TeamActivityStream />
          ) : (
            <A2ACinemaDemo onClose={() => setHubOpen(false)} isStandAloneModal />
          )}
        </div>

        {/* Commander Bar Footer - only shown in topology/stream mode */}
        {hubTab !== 'demo' && <A2ACommanderBar />}
      </div>
    </div>
  )
}
