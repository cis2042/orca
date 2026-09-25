import { afterEach, describe, expect, it } from 'vitest'
import {
  AgentSessionPtyWriteRefusedError,
  type AgentSessionWriteAim
} from '../../shared/agent-session-pty-write-admission'
import {
  agentSessionLeaseFixture,
  agentSessionRecordFixture
} from '../../shared/agent-session-record.test-fixture'
import { agentSessionPtyWriteGate } from './agent-session-pty-write-gate'
import { RuntimeTerminalWriter } from './runtime-terminal-writer'

const PTY_ID = 'pty-aim'
const SESSION_ID = 'session-alpha-1'
const AIM: AgentSessionWriteAim = { sessionId: SESSION_ID, runtimeFence: 7 }

function bindSession(): void {
  const lease = agentSessionLeaseFixture({ sessionId: SESSION_ID, runtimeFence: 7 })
  agentSessionPtyWriteGate.attachRecordLookup((sessionId) =>
    sessionId === lease.sessionId ? agentSessionRecordFixture(lease) : null
  )
  agentSessionPtyWriteGate.bindPty(PTY_ID, lease.sessionId)
}

describe('terminal writes pinned to an agent session', () => {
  afterEach(() => {
    agentSessionPtyWriteGate.detachRecordLookup()
  })

  it('writes when the pane is still the aimed session', async () => {
    bindSession()
    const writes: string[] = []
    const writer = new RuntimeTerminalWriter((ptyId, data) => {
      writes.push(`${ptyId}:${data}`)
      return true
    })

    await writer.writeAction(PTY_ID, { text: 'hello' }, 'hello', { expectedAgentSession: AIM })

    expect(writes).toEqual([`${PTY_ID}:hello`])
  })

  it('does not write when the pane session changed', async () => {
    bindSession()
    const writes: string[] = []
    const writer = new RuntimeTerminalWriter((_ptyId, data) => {
      writes.push(data)
      return true
    })

    await expect(
      writer.writeAction(PTY_ID, { text: 'hello' }, 'hello', {
        expectedAgentSession: { sessionId: 'session-beta-2', runtimeFence: 7 }
      })
    ).rejects.toBeInstanceOf(AgentSessionPtyWriteRefusedError)
    expect(writes).toEqual([])
  })

  it('still writes a first aim that does not name a session', async () => {
    bindSession()
    const writes: string[] = []
    const writer = new RuntimeTerminalWriter((_ptyId, data) => {
      writes.push(data)
      return true
    })

    await writer.writeAction(PTY_ID, { text: 'hello' }, 'hello')

    expect(writes).toEqual(['hello'])
  })
})
