import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AgentSessionWriteAim } from '../../shared/agent-session-pty-write-admission'
import type { RuntimeTerminalSend } from '../../shared/runtime-types'
import type { HandlerContext } from '../dispatch'
import { RuntimeClientError } from '../runtime-client'

const PIN_PREFIX = 'orca-bridge-session-pin-'

type StoredPin = AgentSessionWriteAim & { handle: string }

export function sessionAimMovedMessage(target: string): string {
  return `Session changed on ${target}; this automation is still aimed at the previous session, so the paste was stopped. Re-aim with --reaim to paste into the session that is there now.`
}

function senderHandle(): string {
  return process.env.ORCA_TERMINAL_HANDLE || 'cli'
}

function pinPath(target: string): string {
  const sanitized = `${senderHandle()}--${target}`.replace(/[^a-zA-Z0-9_-]/g, '_')
  return join(tmpdir(), `${PIN_PREFIX}${sanitized}`)
}

function pinField(value: object, key: string): unknown {
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (entryKey === key) {
      return entryValue
    }
  }
  return undefined
}

function isStoredPin(value: unknown): value is StoredPin {
  if (!value || typeof value !== 'object') {
    return false
  }
  const handle = pinField(value, 'handle')
  const sessionId = pinField(value, 'sessionId')
  const runtimeFence = pinField(value, 'runtimeFence')
  const sessionOk = sessionId === null || typeof sessionId === 'string'
  const fenceOk =
    runtimeFence === null ||
    (typeof runtimeFence === 'number' && Number.isInteger(runtimeFence) && runtimeFence >= 0)
  return typeof handle === 'string' && handle.length > 0 && sessionOk && fenceOk
}

function readPin(target: string): StoredPin | null {
  const path = pinPath(target)
  if (!existsSync(path)) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
    return isStoredPin(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writePin(target: string, pin: StoredPin): void {
  try {
    writeFileSync(pinPath(target), JSON.stringify(pin), 'utf8')
  } catch {
    // Best-effort: a missing pin only means the next paste aims again.
  }
}

/** Test isolation. Production pins live until the sender re-aims. */
export function forgetBridgeSessionPins(): void {
  let names: string[] = []
  try {
    names = readdirSync(tmpdir())
  } catch {
    return
  }
  for (const name of names) {
    if (!name.startsWith(PIN_PREFIX)) {
      continue
    }
    try {
      unlinkSync(join(tmpdir(), name))
    } catch {
      // Another test may have removed it.
    }
  }
}

/**
 * Send text to a bridge target, pinned to the session the first paste aimed at.
 * A later paste whose pane or session moved is refused and does not retarget.
 */
export async function sendPinnedBridgeText(args: {
  client: HandlerContext['client']
  target: string
  handle: string
  text: string
  enter: boolean
  reaim: boolean
}): Promise<RuntimeTerminalSend> {
  const pin = args.reaim ? null : readPin(args.target)
  if (pin && pin.handle !== args.handle) {
    throw new RuntimeClientError(
      'agent_session_checkpoint_stale',
      sessionAimMovedMessage(args.target)
    )
  }
  const result = await args.client.call<{ send: RuntimeTerminalSend }>('terminal.send', {
    terminal: args.handle,
    text: args.text,
    enter: args.enter,
    client: { id: 'orca-bridge', type: 'desktop' },
    ...(pin
      ? {
          expectedAgentSession: {
            sessionId: pin.sessionId,
            runtimeFence: pin.runtimeFence
          }
        }
      : {})
  })
  const send = result.result.send
  if (!send.accepted && send.agentSessionRefusal?.code === 'agent_session_checkpoint_stale') {
    throw new RuntimeClientError(
      'agent_session_checkpoint_stale',
      sessionAimMovedMessage(args.target)
    )
  }
  if (send.accepted && (args.reaim || !pin)) {
    const aim = send.agentSessionAim ?? { sessionId: null, runtimeFence: null }
    writePin(args.target, {
      handle: args.handle,
      sessionId: aim.sessionId,
      runtimeFence: aim.runtimeFence
    })
  }
  return send
}
