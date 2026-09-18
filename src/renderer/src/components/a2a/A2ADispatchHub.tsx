import React, { useEffect } from 'react'
import {
  Network,
  Activity,
  X,
  Bot,
  Radio,
  Sparkles
} from 'lucide-react'
import { useA2AStore } from '../../store/a2a-traces-store'
import { AgentTopologyGraph } from './AgentTopologyGraph'
import { TeamActivityStream } from './TeamActivityStream'
import { A2ACommanderBar } from './A2ACommanderBar'

export function A2ADispatchHub(): React.JSX.Element | null {
  const { isHubOpen, setHubOpen, hubTab, setHubTab, recentTraces, activeLinks, addTrace } =
    useA2AStore()

  // Close with Escape key
  useEffect(() => {
    if (!isHubOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHubOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isHubOpen, setHubOpen])

  if (!isHubOpen) return null

  const handleSimulateFlow = () => {
    // Demo flow: #1 delegates to #2, #2 delegates to #5, #2 asks #8 for review
    const trace1 = addTrace({
      from: '@1',
      to: '@2',
      fromIndex: 1,
      toIndex: 2,
      fromLabel: 'Supervisor',
      toLabel: 'Worker',
      type: 'send',
      text: 'npm run build:features'
    })
    if (typeof window !== 'undefined' && window.api?.ui?.sendA2ALink) {
      window.api.ui.sendA2ALink(trace1).catch(() => {})
    }

    setTimeout(() => {
      const trace2 = addTrace({
        from: '@2',
        to: '@5',
        fromIndex: 2,
        toIndex: 5,
        fromLabel: 'Worker',
        toLabel: 'Tester',
        type: 'send',
        text: 'vitest run src/shared/a2a.test.ts'
      })
      if (typeof window !== 'undefined' && window.api?.ui?.sendA2ALink) {
        window.api.ui.sendA2ALink(trace2).catch(() => {})
      }
    }, 1200)

    setTimeout(() => {
      const trace3 = addTrace({
        from: '@2',
        to: '@8',
        fromIndex: 2,
        toIndex: 8,
        fromLabel: 'Worker',
        toLabel: 'Reviewer',
        type: 'message',
        text: 'Code ready for review, please check PR #21223'
      })
      if (typeof window !== 'undefined' && window.api?.ui?.sendA2ALink) {
        window.api.ui.sendA2ALink(trace3).catch(() => {})
      }
    }, 2400)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200"
      data-testid="a2a-dispatch-hub-modal"
    >
      {/* Click outside backdrop */}
      <div
        className="absolute inset-0"
        onClick={() => setHubOpen(false)}
        aria-hidden="true"
      />

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
                {activeLinks.length > 0 ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Radio className="size-3 animate-pulse" />
                    {activeLinks.length} 個通訊連線進行中
                  </span>
                ) : (
                  `${recentTraces.length} 筆通訊歷史記錄`
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
            </div>

            {/* Quick Demo Simulate */}
            <button
              type="button"
              onClick={handleSimulateFlow}
              className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-600/10 px-2.5 py-1 text-xs font-medium text-violet-300 hover:bg-violet-600/20 transition-colors"
              title="模擬多 Agent 連續派工動效"
            >
              <Sparkles className="size-3 text-violet-400" />
              <span>模擬協同</span>
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
          {hubTab === 'topology' ? <AgentTopologyGraph /> : <TeamActivityStream />}
        </div>

        {/* Commander Bar Footer */}
        <A2ACommanderBar />
      </div>
    </div>
  )
}
