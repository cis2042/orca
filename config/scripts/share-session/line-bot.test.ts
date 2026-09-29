import { describe, it, expect } from 'vitest'
import { createLineBotHandler } from './line-bot.mjs'

describe('createLineBotHandler', () => {
  const boundRepos = [
    '/Users/cis2042/APP/agent-id',
    '/Users/cis2042/APP/XHuman_ID',
    '/Users/cis2042/APP/twin3-sdk',
    '/Users/cis2042/APP/twin3_bitbee'
  ]

  it('replies with quick replies for /project and does not call push API', async () => {
    const handler = createLineBotHandler({
      boundRepos,
      baseUrl: 'http://localhost:3788',
      sessionId: 'test-session',
      sessionToken: 'test-token'
    })

    const event = {
      type: 'message',
      replyToken: 'test-reply-token-1',
      source: { groupId: 'group-1' },
      message: { type: 'text', text: '/project' }
    }

    const res = await handler.handleWebhookEvent(event)
    expect(res.handled).toBe(true)
    expect(res.action).toBe('select_project')

    const replyLogs = handler.getReplyApiLogs()
    expect(replyLogs.length).toBe(1)
    expect(replyLogs[0].replyToken).toBe('test-reply-token-1')
    expect(replyLogs[0].messages[0].quickReply.items.length).toBe(4)

    const pushLogs = handler.getPushApiLogs()
    expect(pushLogs.length).toBe(0)
  })

  it('switches repo upon /set_repo and does not call push API', async () => {
    const handler = createLineBotHandler({
      boundRepos,
      baseUrl: 'http://localhost:3788',
      sessionId: 'test-session',
      sessionToken: 'test-token'
    })

    const event = {
      type: 'message',
      replyToken: 'test-reply-token-2',
      source: { groupId: 'group-1' },
      message: { type: 'text', text: '/set_repo 3' }
    }

    const res = await handler.handleWebhookEvent(event)
    expect(res.handled).toBe(true)
    expect(res.action).toBe('repo_set')
    expect(res.repoIndex).toBe(3)

    const ctx = handler.getContext('group-1')
    expect(ctx.currentRepoIndex).toBe(3)

    const pushLogs = handler.getPushApiLogs()
    expect(pushLogs.length).toBe(0)
  })

  it('uses reply API for task start and only calls push API upon task completion', async () => {
    const handler = createLineBotHandler({
      boundRepos,
      baseUrl: 'http://localhost:3788',
      sessionId: 'test-session',
      sessionToken: 'test-token',
      executor: (
        _repo: string,
        _engine: string,
        _prompt: string,
        onDone: (res: { output: string; diffSummary: string }) => void
      ) => {
        setTimeout(() => {
          onDone({ output: 'done', diffSummary: '1 file changed' })
        }, 50)
      }
    })

    const event = {
      type: 'message',
      replyToken: 'test-reply-token-task',
      source: { groupId: 'group-1' },
      message: { type: 'text', text: '@1 檢查程式碼' }
    }

    const res = await handler.handleWebhookEvent(event)
    expect(res.handled).toBe(true)
    expect(res.action).toBe('task_started')

    const replyLogs = handler.getReplyApiLogs()
    expect(replyLogs.length).toBe(1)
    expect(replyLogs[0].messages[0].type).toBe('flex')
    expect(replyLogs[0].messages[0].contents.footer.contents[0].action.uri).toContain(
      'test-session'
    )

    await new Promise((resolve) => setTimeout(resolve, 150))

    const pushLogs = handler.getPushApiLogs()
    expect(pushLogs.length).toBe(1)
    expect(pushLogs[0].to).toBe('group-1')
    expect(pushLogs[0].messages[0].contents.header.contents[0].text).toContain('任務完成')
  })
})
