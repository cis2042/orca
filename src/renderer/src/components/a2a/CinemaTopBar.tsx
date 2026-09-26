import React from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Zap,
  Activity,
  Cpu
} from 'lucide-react'
import { cn } from '../../lib/utils'

export type CinemaTopBarProps = {
  isPlaying: boolean
  speedMultiplier: 1 | 1.5 | 2
  isFullscreen: boolean
  isStandAloneModal: boolean
  onTogglePlay: () => void
  onReplay: () => void
  onStepNext: () => void
  onSpeedChange: (speed: 1 | 1.5 | 2) => void
  onToggleFullscreen: () => void
  onClose?: () => void
}

export function CinemaTopBar({
  isPlaying,
  speedMultiplier,
  isFullscreen,
  isStandAloneModal,
  onTogglePlay,
  onReplay,
  onStepNext,
  onSpeedChange,
  onToggleFullscreen,
  onClose
}: CinemaTopBarProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/90 px-5 py-2.5 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 text-white shadow-md shadow-violet-900/30">
          <Zap className="size-4 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold tracking-wider uppercase text-zinc-100 font-mono">
              OAGENT MULTI-AI COLLABORATIVE MESH
            </h2>
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-emerald-400 border border-emerald-500/30">
              LIVE DEMO REEL
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-mono">
            Autonomous 8-Agent Orchestration & Zero-Collision Verification Protocol
          </p>
        </div>
      </div>

      {/* Global Status Telemetry Badges */}
      <div className="hidden lg:flex items-center gap-3 text-[10px] font-mono">
        <div className="flex items-center gap-1 text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-2 py-0.5 rounded">
          <Activity className="size-3" />
          <span>60 FPS REALTIME</span>
        </div>
        <div className="flex items-center gap-1 text-violet-400 bg-violet-950/40 border border-violet-800/50 px-2 py-0.5 rounded">
          <Cpu className="size-3" />
          <span>8 AGENTS / 6 AI ENGINES</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded">
          <ShieldCheck className="size-3" />
          <span>CONTRACT-FIRST VERIFIED</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onTogglePlay}
          className="flex items-center gap-1 rounded bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-xs font-mono font-medium transition-colors"
        >
          {isPlaying ? (
            <Pause className="size-3.5 text-amber-400" />
          ) : (
            <Play className="size-3.5 text-emerald-400" />
          )}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>
        <button
          type="button"
          onClick={onReplay}
          className="rounded bg-zinc-800 hover:bg-zinc-700 p-1.5 text-zinc-300 transition-colors"
          title="Replay from Step 1"
        >
          <RotateCcw className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onStepNext}
          className="rounded bg-zinc-800 hover:bg-zinc-700 p-1.5 text-zinc-300 transition-colors"
          title="Step Next"
        >
          <SkipForward className="size-3.5" />
        </button>
        <div className="flex items-center rounded bg-zinc-800/80 p-0.5 text-[10px] font-mono">
          {([1, 1.5, 2] as const).map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => onSpeedChange(spd)}
              className={cn(
                'px-1.5 py-0.5 rounded',
                speedMultiplier === spd
                  ? 'bg-violet-600 text-white font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {spd}x
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="rounded bg-zinc-800 hover:bg-zinc-700 p-1.5 text-zinc-300 transition-colors ml-1"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </button>
        {isStandAloneModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-zinc-800 hover:bg-rose-900/60 p-1.5 text-zinc-300 hover:text-rose-200 transition-colors ml-1"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
