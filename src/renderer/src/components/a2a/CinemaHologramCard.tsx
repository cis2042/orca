import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import type { MotifPalette } from './A2AConnectionEffects'
import type { DemoStep } from './a2a-demo-scenario'

export type CinemaHologramCardProps = {
  step: DemoStep
  totalSteps: number
  palette: MotifPalette
}

export function CinemaHologramCard({
  step,
  totalSteps,
  palette
}: CinemaHologramCardProps): React.JSX.Element {
  return (
    <div className="absolute z-20 pointer-events-none flex flex-col items-center max-w-sm w-full px-4">
      <div className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/90 p-3.5 shadow-2xl backdrop-blur-md ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 font-bold">
            <span
              className="size-2 rounded-full animate-ping"
              style={{ backgroundColor: palette.sourceColor }}
            />
            <span style={{ color: palette.sourceColor }}>
              STEP {step.step} / {totalSteps}
            </span>
            <span className="text-zinc-500">[{step.phase}]</span>
          </div>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300 font-semibold">
            {palette.label} ({palette.icon})
          </span>
        </div>

        <div className="text-xs font-semibold text-zinc-100 mb-1 leading-snug">{step.title}</div>
        <div className="text-[11px] text-zinc-400 mb-2 font-mono leading-tight">{step.summary}</div>

        {/* Command Payload */}
        <div className="rounded bg-black/80 border border-zinc-800/90 p-2 font-mono text-[10px] text-cyan-300 mb-2 overflow-x-auto whitespace-pre">
          $ {step.commandText}
        </div>

        {/* Verification Receipt */}
        <div className="flex items-start gap-1.5 rounded bg-emerald-950/30 border border-emerald-800/50 p-2 text-[10px] text-emerald-300 font-mono">
          <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <span>{step.verificationText}</span>
        </div>

        <div className="mt-2 flex items-center justify-between text-[9px] text-zinc-500 font-mono">
          <span>{step.metricLabel}</span>
          <span>P99 &lt; 1.2ms · Zero Collision</span>
        </div>
      </div>
    </div>
  )
}
