import { describe, it, expect } from 'vitest'
import { createCloudAgentRunner, createCloudRunnerFromEnv } from './cloud-agent-runner.mjs'
import { EventEmitter } from 'node:events'
import { createLineBotHandler } from './line-bot.mjs'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRemoteTaskRunner } from './remote-task-runner.mjs'
import { createClaudeStreamParser } from './cli-stream-format.mjs'

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

const claudeTranscript = [
  { type: 'system', subtype: 'hook_started' },
  { type: 'system', subtype: 'init', model: 'claude-opus-5-5' },
  { type: 'assistant', message: { content: [{ type: 'thinking', thinking: 'plan' }] } },
  {
    type: 'assistant',
    message: {
      content: [
        {
          type: 'tool_use',
          name: 'Bash',
          input: { command: 'echo hello-cli', description: 'Print' }
        }
      ]
    }
  },
  { type: 'rate_limit_event' },
  {
    type: 'user',
    message: { content: [{ type: 'tool_result', content: 'hello-cli', is_error: false }] }
  },
  { type: 'assistant', message: { content: [{ type: 'text', text: 'DONE' }] } },
  {
    type: 'result',
    subtype: 'success',
    is_error: false,
    num_turns: 2,
    duration_ms: 3997,
    result: 'DONE'
  }
]
  .map((event) => JSON.stringify(event))
  .join('\n')

function createFakeSpawn(stdoutChunks: string[], exitCode = 0) {
  const calls: { cmd: string; args: string[]; cwd: string }[] = []
  const spawnImpl = (cmd: string, args: string[], opts: { cwd: string }) => {
    calls.push({ cmd, args, cwd: opts.cwd })
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
    }
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    setTimeout(() => {
      child.stderr.emit('data', Buffer.from('Permission allow rule warning\n'))
      for (const chunk of stdoutChunks) {
        child.stdout.emit('data', Buffer.from(chunk))
      }
      child.emit('close', exitCode)
    }, 0)
    return child
  }
  return { calls, spawnImpl }
}

describe('claude stream formatting', () => {
  it('renders tool calls, results and the final result like a CLI screen', () => {
    const parser = createClaudeStreamParser()
    parser.push(claudeTranscript.slice(0, 200))
    parser.push(claudeTranscript.slice(200))
    parser.end()
    expect(parser.getScreen()).toBe(
      [
        '▶ Claude Code 啟動（claude-opus-5-5）',
        '⏺ Bash(echo hello-cli)',
        '  ⎿ hello-cli',
        'DONE',
        '',
        '━━ ✅ 完成（2 回合，4s）━━'
      ].join('\n')
    )
    expect(parser.getFinalResult()).toBe('DONE')
    expect(parser.isError()).toBe(false)
  })
})

describe('remote task runner', () => {
  it('runs claude in stream mode in the matching repo and reports the CLI screen and final result', async () => {
    const fake = createFakeSpawn([claudeTranscript.slice(0, 150), claudeTranscript.slice(150)])
    const handler = createLineBotHandler({ boundRepos: ['/repos/agent-id', '/repos/XHuman_ID'] })
    const runRemoteTask = createRemoteTaskRunner({
      boundRepos: ['/repos/agent-id', '/repos/XHuman_ID'],
      getContext: handler.getContext,
      spawnImpl: fake.spawnImpl
    })
    const screens: string[] = []

    const result = await runRemoteTask(
      { id: 't9', agentId: '@2', engine: 'claude', text: 'say done', repoKey: 'XHuman_ID' },
      { onProgress: (screen: string) => screens.push(screen) }
    )

    expect(fake.calls[0].cwd).toBe('/repos/XHuman_ID')
    expect(fake.calls[0].args).toEqual(
      expect.arrayContaining(['--output-format', 'stream-json', '--verbose'])
    )
    expect(result.output).toBe('DONE')
    expect(result.screen).toContain('⏺ Bash(echo hello-cli)')
    expect(result.screen).toContain('[進程結束: 狀態碼 0]')
    expect(result.screen).not.toContain('Permission allow rule')
    expect(screens.length).toBeGreaterThan(1)
    expect(handler.getContext('cloud').agentTasks['@2'].status).toBe('completed')
  })

  it('falls back to the agent default engine and surfaces stderr when a plain engine fails', async () => {
    const fake = createFakeSpawn(['partial output\n'], 2)
    const runRemoteTask = createRemoteTaskRunner({
      boundRepos: ['/repos/agent-id'],
      getContext: createLineBotHandler({ boundRepos: ['/repos/agent-id'] }).getContext,
      spawnImpl: fake.spawnImpl
    })

    const result = await runRemoteTask({ id: 't10', agentId: '@3', text: 'x', repoKey: 'unknown' })
    expect(fake.calls[0].args[0]).toBe('-p')
    expect(fake.calls[0].cwd).toBe('/repos/agent-id')
    expect(result.screen).toContain('partial output')
    expect(result.screen).toContain('[進程結束: 狀態碼 2]')
  })

  it('streams progress to the cloud before reporting completion', async () => {
    const cloud = createFakeCloud([{ id: 't11', agentId: '@1', text: 'go', repoKey: 'agent-id' }])
    const runner = createCloudAgentRunner({
      baseUrl: 'https://bridge.example',
      token: 'secret',
      fetchImpl: cloud.fetchImpl,
      logger: silentLogger,
      progressIntervalMs: 5,
      runTask: async (_task: unknown, hooks: { onProgress: (s: string) => void }) => {
        hooks.onProgress('step 1')
        await new Promise((r) => setTimeout(r, 20))
        return { output: 'final', screen: 'step 1\nfinal screen' }
      }
    })

    await runner.pollOnce()
    await runner.waitForIdle()
    const outputs = cloud.calls.filter((c) => c.url.endsWith('/t11/output'))
    expect(outputs.map((c) => JSON.parse(c.body).output)).toEqual([
      'step 1',
      'step 1\nfinal screen'
    ])
    const lastOutputIndex = cloud.calls.lastIndexOf(outputs.at(-1)!)
    const completeIndex = cloud.calls.findIndex((c) => c.url.endsWith('/t11/complete'))
    expect(completeIndex).toBeGreaterThan(lastOutputIndex)
  })

  it('writes the LINE attachment to disk and points the agent prompt at it', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attach-test-'))
    const fake = createFakeSpawn([claudeTranscript])
    const runRemoteTask = createRemoteTaskRunner({
      boundRepos: ['/repos/XHuman_ID'],
      getContext: createLineBotHandler({ boundRepos: ['/repos/XHuman_ID'] }).getContext,
      spawnImpl: fake.spawnImpl,
      attachmentDir: dir
    })

    const result = await runRemoteTask({
      id: 'task_1',
      agentId: '@1',
      engine: 'claude',
      text: '開 PR 執行上方的 .md 檔的工作',
      repoKey: 'XHuman_ID',
      attachmentName: '../HumanID 舊用戶取回.md',
      attachmentContent: '# 工作令'
    })

    const savedPath = path.join(dir, 'twin3-line-attachments', 'task_1', 'HumanID_舊用戶取回.md')
    expect(fs.readFileSync(savedPath, 'utf8')).toBe('# 工作令')
    const prompt = fake.calls[0].args[1]
    expect(prompt).toContain(savedPath)
    expect(prompt).toContain('【指示】開 PR 執行上方的 .md 檔的工作')
    expect(result.screen).toContain(`📎 ../HumanID 舊用戶取回.md → ${savedPath}`)
    fs.rmSync(dir, { recursive: true, force: true })
  })
})

describe('createCloudRunnerFromEnv', () => {
  it('stays off without cloud settings', () => {
    expect(createCloudRunnerFromEnv({}, { runRemoteTask: async () => ({}) })).toBeNull()
  })

  it('passes live progress hooks through to the line bot so the CLI screen streams while running', async () => {
    const cloud = createFakeCloud([{ id: 't12', agentId: '@1', text: 'go', repoKey: 'agent-id' }])
    const lineBot = {
      runRemoteTask: async (_task: unknown, hooks?: { onProgress?: (s: string) => void }) => {
        hooks?.onProgress?.('live screen')
        await new Promise((r) => setTimeout(r, 20))
        return { output: 'done' }
      }
    }
    const runner = createCloudRunnerFromEnv(
      { BRIDGE_CLOUD_URL: 'https://bridge.example', BRIDGE_AGENT_TOKEN: 'secret' },
      lineBot,
      { fetchImpl: cloud.fetchImpl, logger: silentLogger, progressIntervalMs: 5 }
    )

    await runner!.pollOnce()
    await runner!.waitForIdle()
    const outputs = cloud.calls.filter((c) => c.url.endsWith('/t12/output'))
    expect(outputs.map((c) => JSON.parse(c.body).output)).toContain('live screen')
  })
})
