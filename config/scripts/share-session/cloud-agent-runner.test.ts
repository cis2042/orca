import { describe, it, expect } from 'vitest'
import { createCloudAgentRunner } from './cloud-agent-runner.mjs'
import { createLineBotHandler } from './line-bot.mjs'

type Call = { url: string; method: string; auth: string; body: string }

function createFakeCloud(tasks: Record<string, unknown>[], failCompletions = 0) {
  const calls: Call[] = []
  let remainingFailures = failCompletions
  const fetchImpl = async (url: string, init: RequestInit = {}) => {
    const headers = init.headers as Record<string, string>
    calls.push({
      url,
      method: init.method || 'GET',
      auth: headers.Authorization,
      body: String(init.body || '')
    })
    if (url.endsWith('/api/agent/tasks')) {
      const batch = tasks.splice(0)
      return new Response(JSON.stringify({ ok: true, tasks: batch }), {
        status: 200
      })
    }
    if (url.endsWith('/complete') && remainingFailures > 0) {
      remainingFailures--
      return new Response('{}', { status: 503 })
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }
  return { calls, fetchImpl }
}

const silentLogger = { log: () => {} }

describe('createCloudAgentRunner', () => {
  it('claims cloud tasks with the bearer token, runs them and reports output', async () => {
    const cloud = createFakeCloud([
      { id: 't1', agentId: '@1', text: 'fix lint', repoKey: 'agent-id' }
    ])
    const ran: unknown[] = []
    const runner = createCloudAgentRunner({
      baseUrl: 'https://bridge.example/',
      token: 'secret',
      fetchImpl: cloud.fetchImpl,
      logger: silentLogger,
      runTask: async (task: unknown) => {
        ran.push(task)
        return { output: 'lint fixed' }
      }
    })

    expect(await runner.pollOnce()).toEqual({ claimed: 1 })
    await runner.waitForIdle()

    expect(ran).toHaveLength(1)
    expect(cloud.calls[0]).toMatchObject({
      url: 'https://bridge.example/api/agent/tasks',
      auth: 'Bearer secret'
    })
    const completion = cloud.calls.find((c) => c.url.endsWith('/api/agent/tasks/t1/complete'))
    expect(completion?.method).toBe('POST')
    expect(JSON.parse(completion?.body || '{}')).toEqual({
      output: 'lint fixed'
    })
  })

  it('reports task failures and retries completions that could not be delivered', async () => {
    const cloud = createFakeCloud([{ id: 't2', agentId: '@2', text: 'boom', repoKey: 'x' }], 1)
    const runner = createCloudAgentRunner({
      baseUrl: 'https://bridge.example',
      token: 'secret',
      fetchImpl: cloud.fetchImpl,
      logger: silentLogger,
      runTask: async () => {
        throw new Error('engine crashed')
      }
    })

    await runner.pollOnce()
    await runner.waitForIdle()
    expect(runner.getUnsentCount()).toBe(1)

    await runner.pollOnce()
    expect(runner.getUnsentCount()).toBe(0)
    const completions = cloud.calls.filter((c) => c.url.endsWith('/t2/complete'))
    expect(completions).toHaveLength(2)
    expect(JSON.parse(completions[1].body).output).toContain('engine crashed')
  })

  it('keeps polling alive when the cloud is unreachable', async () => {
    const runner = createCloudAgentRunner({
      baseUrl: 'https://bridge.example',
      token: 'secret',
      logger: silentLogger,
      fetchImpl: async () => {
        throw new Error('offline')
      },
      runTask: async () => ({ output: '' })
    })
    expect(await runner.pollOnce()).toEqual({ error: 'offline' })
  })
})

describe('line bot runRemoteTask', () => {
  it('runs the cloud task in the repo matching its key with the engine for the agent', async () => {
    const seen: string[][] = []
    const handler = createLineBotHandler({
      boundRepos: ['/repos/agent-id', '/repos/XHuman_ID'],
      executor: (
        repo: string,
        engine: string,
        prompt: string,
        done: (r: { output: string }) => void
      ) => {
        seen.push([repo, engine, prompt])
        done({ output: '\u001b[32mall green\u001b[0m' })
      }
    })

    const result = await handler.runRemoteTask({
      id: 't3',
      agentId: '@2',
      text: 'review',
      repoKey: 'XHuman_ID'
    })
    expect(seen).toEqual([['/repos/XHuman_ID', 'gpt', 'review']])
    expect(result.output).toBe('all green')
    expect(handler.getContext('cloud').agentTasks['@2'].status).toBe('completed')
  })
})
