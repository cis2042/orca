import { useState, useMemo } from 'react'
import { Send, Zap, Users, Sparkles } from 'lucide-react'
import { useA2AStore } from '../../store/a2a-traces-store'
import { parseTerminalIndex } from '../../../../shared/terminal-a2a-link'

export function A2ACommanderBar(): JSX.Element {
  const { recentTraces, addTrace } = useA2AStore()
  const [inputText, setInputText] = useState('')
  const [selectedTarget, setSelectedTarget] = useState<string>('@2')

  // Discover candidate target agents
  const candidateTargets = useMemo<string[]>(() => {
    const indexes = new Set<number>()

    // Check open tabs in DOM
    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-terminal-index]').forEach((el) => {
        const raw = el.getAttribute('data-terminal-index')
        const idx = raw ? Number.parseInt(raw, 10) : NaN
        if (Number.isFinite(idx) && idx > 0) indexes.add(idx)
      })
    }

    // Check traces
    recentTraces.forEach((t) => {
      if (t.toIndex) indexes.add(t.toIndex)
      if (t.fromIndex) indexes.add(t.fromIndex)
    })

    if (indexes.size === 0) {
      indexes.add(1)
      indexes.add(2)
      indexes.add(5)
    }

    const sorted = Array.from(indexes).sort((a, b) => a - b)
    return ['@all', ...sorted.map((i) => `@${i}`)]
  }, [recentTraces])

  const handleDispatch = async () => {
    const trimmed = inputText.trim()
    if (!trimmed) return

    let target = selectedTarget
    let command = trimmed

    // Check if input starts with @mention
    const match = trimmed.match(/^(@\w+)\s+(.*)$/)
    if (match) {
      target = match[1]
      command = match[2]
    }

    if (target === '@all') {
      // Fan out to all numbered targets
      const numericTargets = candidateTargets.filter((t) => t !== '@all')
      for (const t of numericTargets) {
        const toIdx = parseTerminalIndex(t)
        const trace = addTrace({
          from: '@human',
          to: t,
          fromIndex: 1,
          toIndex: toIdx,
          fromLabel: 'Commander',
          toLabel: `Agent ${t}`,
          type: 'send',
          text: command
        })
        if (typeof window !== 'undefined' && window.api?.ui?.sendA2ALink) {
          window.api.ui.sendA2ALink(trace).catch(() => {})
        }
      }
    } else {
      const toIdx = parseTerminalIndex(target)
      const trace = addTrace({
        from: '@human',
        to: target,
        fromIndex: 1,
        toIndex: toIdx,
        fromLabel: 'Commander',
        toLabel: `Agent ${target}`,
        type: 'send',
        text: command
      })
      if (typeof window !== 'undefined' && window.api?.ui?.sendA2ALink) {
        window.api.ui.sendA2ALink(trace).catch(() => {})
      }
    }

    setInputText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleDispatch()
    }
  }

  return (
    <div className="border-t border-zinc-800/80 bg-zinc-900/90 p-3 backdrop-blur-md">
      {/* Target Pill Bar */}
      <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 mr-1 select-none">
          <Users className="size-3" />
          <span>對象:</span>
        </span>
        {candidateTargets.map((target) => {
          const isSelected = selectedTarget === target
          return (
            <button
              key={target}
              type="button"
              onClick={() => setSelectedTarget(target)}
              className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-violet-600 text-white shadow-sm ring-1 ring-violet-400'
                  : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {target}
            </button>
          )
        })}

        <div className="ml-auto flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
          <Sparkles className="size-2.5 text-violet-400" />
          <span>Human Commander</span>
        </div>
      </div>

      {/* Input Field & Submit */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`下達跨 Agent 指令給 ${selectedTarget}，例如: 執行單元測試 或 確認 PR...`}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3.5 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          />
        </div>

        <button
          type="button"
          onClick={handleDispatch}
          disabled={!inputText.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Zap className="size-3.5" />
          <span>派工</span>
        </button>
      </div>
    </div>
  )
}
