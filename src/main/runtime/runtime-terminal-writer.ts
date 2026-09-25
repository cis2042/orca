import { resolveAgentPromptSubmitDelayForAgent } from '../../shared/agent-prompt-injection'
import type { TuiAgent } from '../../shared/tui-agent'
import {
  AgentSessionPtyWriteRefusedError,
  assertExpectedAgentSessionAim,
  type AgentSessionWriteAim
} from '../../shared/agent-session-pty-write-admission'
import { iterateTerminalInputChunks } from '../../shared/terminal-input'
import {
  agentSessionPtyWriteGate,
  type AgentSessionPtyWriteAdmittance
} from './agent-session-pty-write-gate'

export type RuntimeTerminalWriteOptions = {
  signal?: AbortSignal
  beforeWrite?: (ptyId: string) => void | Promise<void>
  reserveWrite?: (ptyId: string) => void
  afterWrite?: (ptyId: string) => void | Promise<void>
  suffixFailureError?: string
  /** When set, the write is refused if the pane's session is no longer this aim. */
  expectedAgentSession?: AgentSessionWriteAim
}

export class RuntimeTerminalWriter {
  constructor(
    private readonly write: (ptyId: string, data: string) => boolean,
    private readonly getWriteHostPlatform: (ptyId: string) => NodeJS.Platform = () =>
      process.platform,
    private readonly getAgent: (ptyId: string) => TuiAgent | null = () => null
  ) {}

  async writeAction(
    ptyId: string,
    action: { text?: string; enter?: boolean; interrupt?: boolean },
    payload: string,
    options: RuntimeTerminalWriteOptions = {}
  ): Promise<AgentSessionPtyWriteAdmittance> {
    // Why: the lease is checked before the mobile floor is reserved, so a refused send never takes
    // a claim it will not use.
    const admitted = agentSessionPtyWriteGate.assertAdmitted(ptyId)
    assertExpectedAgentSessionAim(admitted, options.expectedAgentSession)
    // Why: direct terminal.send can carry paste-sized text from RPC/mobile
    // clients; chunk text before PTY/ConPTY while preserving suffix separation.
    const text = typeof action.text === 'string' ? action.text : ''
    const hasSuffix = action.enter || action.interrupt
    if (text) {
      await this.writeChunks(ptyId, text, options, admitted)
    }
    if (hasSuffix) {
      const suffix = (action.enter ? '\r' : '') + (action.interrupt ? '\x03' : '')
      if (text) {
        // Why: same hazard as the agent-prompt path -- Enter must not overtake text the
        // execution host is still ingesting, and a flat 500 ms cannot cover 16 MB.
        await waitForTerminalWriteDelay(
          resolveAgentPromptSubmitDelayForAgent(
            this.getWriteHostPlatform(ptyId),
            text,
            this.getAgent(ptyId)
          ),
          options.signal
        )
      }
      // Why: the 500ms text/suffix pause is long enough for a handoff to complete, so the submit
      // is re-checked against the fence the text was admitted under.
      this.assertStillAimed(ptyId, admitted, options.expectedAgentSession)
      try {
        await options.beforeWrite?.(ptyId)
      } catch (error) {
        if (options.suffixFailureError) {
          throw new Error(options.suffixFailureError)
        }
        throw error
      }
      this.assertStillAimed(ptyId, admitted, options.expectedAgentSession)
      options.reserveWrite?.(ptyId)
      if (!this.write(ptyId, suffix)) {
        throw new Error(options.suffixFailureError ?? 'terminal_not_writable')
      }
      await options.afterWrite?.(ptyId)
      return admitted
    }
    if (text) {
      return admitted
    }
    await options.beforeWrite?.(ptyId)
    this.assertStillAimed(ptyId, admitted, options.expectedAgentSession)
    options.reserveWrite?.(ptyId)
    if (!this.write(ptyId, payload)) {
      throw new Error('terminal_not_writable')
    }
    await options.afterWrite?.(ptyId)
    return admitted
  }

  private assertStillAimed(
    ptyId: string,
    admitted: AgentSessionPtyWriteAdmittance,
    expected: AgentSessionWriteAim | undefined
  ): void {
    agentSessionPtyWriteGate.assertReadmitted(ptyId, admitted)
    const current = agentSessionPtyWriteGate.admit(ptyId)
    if (!current.admitted) {
      throw new AgentSessionPtyWriteRefusedError(current.refusal)
    }
    assertExpectedAgentSessionAim(
      { sessionId: current.sessionId, runtimeFence: current.runtimeFence },
      expected
    )
  }

  async writeChunks(
    ptyId: string,
    text: string,
    options: RuntimeTerminalWriteOptions = {},
    admitted: AgentSessionPtyWriteAdmittance = agentSessionPtyWriteGate.assertAdmitted(ptyId)
  ): Promise<void> {
    const chunks = iterateTerminalInputChunks(text)
    let chunk = chunks.next()
    let firstChunk = true
    while (!chunk.done) {
      if (!firstChunk) {
        this.assertStillAimed(ptyId, admitted, options.expectedAgentSession)
      }
      firstChunk = false
      await options.beforeWrite?.(ptyId)
      this.assertStillAimed(ptyId, admitted, options.expectedAgentSession)
      options.reserveWrite?.(ptyId)
      if (!this.write(ptyId, chunk.value)) {
        throw new Error('terminal_not_writable')
      }
      await options.afterWrite?.(ptyId)
      chunk = chunks.next()
      if (!chunk.done) {
        await yieldBetweenTerminalInputChunks()
      }
    }
  }
}

function yieldBetweenTerminalInputChunks(): Promise<void> {
  return new Promise<void>((resolve) => setImmediate(resolve))
}

async function waitForTerminalWriteDelay(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (!signal) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    return
  }
  if (signal.aborted) {
    throw new Error('request_aborted')
  }
  await new Promise<void>((resolve, reject) => {
    const onAbort = (): void => {
      clearTimeout(timer)
      reject(new Error('request_aborted'))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, delayMs)
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) {
      onAbort()
    }
  })
}
