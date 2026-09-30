import { describe, it, expect } from 'vitest'
import { createLineBotHandler } from './line-bot.mjs'

describe('createLineBotHandler', () => {
  const boundRepos = [
    '/Users/cis2042/APP/agent-id',
    '/Users/cis2042/APP/XHuman_ID',
    '/Users/cis2042/APP/twin3-sdk',
    '/Users/cis2042/APP/twin3_bitbee'
  ]

  it('replies with command guide for /help and does not call push API', async () => {
    const handler = createLineBotHandler({
      boundRepos,
      baseUrl: 'http://localhost:3788',
      sessionId: 'test-session',
      sessionToken: 'test-token'
    })

    const event = {
      type: 'message',
      replyToken: 'test-reply-token-help',
      source: { groupId: 'group-1' },
      message: { type: 'text', text: '/help' }
    }

    const res = await handler.handleWebhookEvent(event)
    expect(res.handled).toBe(true)
    expect(res.action).toBe('show_help')

    const replyLogs = handler.getReplyApiLogs()
    expect(replyLogs.length).toBe(1)
    expect(replyLogs[0].replyToken).toBe('test-reply-token-help')
    expect(replyLogs[0].messages[0].text).toContain('Twin3 多 Agent 協作指令清單')
    expect(replyLogs[0].messages[0].text).toContain('/project')

    const pushLogs = handler.getPushApiLogs()
    expect(pushLogs.length).toBe(0)
  })

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

    const replyLogs = handler.getReplyApiLogs()
    expect(replyLogs.length).toBe(1)
    expect(replyLogs[0].messages[0].sender).toBeDefined()
    expect(replyLogs[0].messages[0].sender.name).toBe('bitbee')
    expect(replyLogs[0].messages[0].sender.iconUrl).toContain('bitbee.png')

    const pushLogs = handler.getPushApiLogs()
    expect(pushLogs.length).toBe(0)
  })

  it('receives markdown file as input, saves context, and injects into prompt', async () => {
    let capturedPrompt = ''
    const mdContent =
      '# HumanID 舊用戶取回 API 說明\n\n端點: /api/v1/auth/recovery\n需要驗證雙因素憑證。'

    const handler = createLineBotHandler({
      boundRepos,
      baseUrl: 'http://localhost:3788',
      sessionId: 'test-session',
      sessionToken: 'test-token',
      contentFetcher: async (_msgId: string) => Buffer.from(mdContent, 'utf-8'),
      executor: (
        _repo: string,
        _engine: string,
        prompt: string,
        onDone: (res: { output: string; diffSummary: string }) => void
      ) => {
        capturedPrompt = prompt
        onDone({ output: '已根據文件規劃完畢', diffSummary: 'no diff' })
      }
    })

    const fileEvent = {
      type: 'message',
      replyToken: 'test-reply-token-file',
      source: { groupId: 'group-1' },
      message: {
        type: 'file',
        id: 'msg-file-9988',
        fileName: 'HumanID舊用戶取回-twin3-API說明-給Ming.md',
        fileSize: 1024
      }
    }

    const fileRes = await handler.handleWebhookEvent(fileEvent)
    expect(fileRes.handled).toBe(true)
    expect(fileRes.action).toBe('file_received')

    const fileReplies = handler.getReplyApiLogs()
    expect(fileReplies.length).toBe(1)
    expect(fileReplies[0].messages[0].text).toContain(
      '已接收文件：HumanID舊用戶取回-twin3-API說明-給Ming.md'
    )
    expect(
      fileReplies[0].messages[0].quickReply.items.some((i: { action: { label: string } }) =>
        i.action.label.includes('依此規劃')
      )
    ).toBe(true)

    const ctx = handler.getContext('group-1')
    expect(ctx.lastUploadedFile).toBeDefined()
    expect(ctx.lastUploadedFile.content).toContain('HumanID 舊用戶取回 API 說明')

    const triggerEvent = {
      type: 'message',
      replyToken: 'test-reply-token-plan',
      source: { groupId: 'group-1' },
      message: { type: 'text', text: '@1 依此規劃實作方案' }
    }

    const taskRes = await handler.handleWebhookEvent(triggerEvent)
    expect(taskRes.handled).toBe(true)
    expect(taskRes.action).toBe('task_started')
    expect(capturedPrompt).toContain('參考上下文文件: HumanID舊用戶取回-twin3-API說明-給Ming.md')
    expect(capturedPrompt).toContain('端點: /api/v1/auth/recovery')

    const pushLogs = handler.getPushApiLogs()
    expect(pushLogs.length).toBe(0)
  })

  it('supports non-push task progress polling (進度還沒更新 vs 進度已經更新) with 0 push API cost', async () => {
    let completeTaskCallback: ((res: { output: string; diffSummary: string }) => void) | null = null

    const handler = createLineBotHandler({
      boundRepos,
      baseUrl: 'http://localhost:3788',
      sessionId: 'test-session',
      sessionToken: 'test-token',
      geminiBrain: {
        summarizeRemoteProgress: async () => '遠端系統運作正常，目前無活動中的終端',
        chat: async () => ({ text: 'ok' }),
        clearMemory: () => {},
        getHistory: () => [],
        hasApiKey: () => true
      },
      executor: (
        _repo: string,
        _engine: string,
        _prompt: string,
        onDone: (res: { output: string; diffSummary: string }) => void
      ) => {
        completeTaskCallback = onDone
      }
    })

    const startEvent = {
      type: 'message',
      replyToken: 'token-start-task',
      source: { groupId: 'group-1' },
      message: { type: 'text', text: '@1 檢查專案健康度' }
    }
    const startRes = await handler.handleWebhookEvent(startEvent)
    expect(startRes.handled).toBe(true)
    expect(startRes.action).toBe('task_started')

    const startReplies = handler.getReplyApiLogs()
    const lastStartReply = startReplies.at(-1)
    expect(lastStartReply.messages[0].text).toContain('任務已啟動')
    expect(
      lastStartReply.messages[0].quickReply.items.some((i: { action: { label: string } }) =>
        i.action.label.includes('查看進度')
      )
    ).toBe(true)

    const check1Event = {
      type: 'message',
      replyToken: 'token-check-1',
      source: { groupId: 'group-1' },
      message: { type: 'text', text: '@1 狀態' }
    }
    const check1Res = await handler.handleWebhookEvent(check1Event)
    expect(check1Res.handled).toBe(true)
    expect(check1Res.action).toBe('agent_status_reported')
    expect(check1Res.status).toBe('running')

    const check1Reply = handler.getReplyApiLogs().at(-1)
    expect(check1Reply.messages[0].text).toContain('執行中')

    const standbyEvent = {
      type: 'message',
      replyToken: 'token-standby',
      source: { groupId: 'group-1' },
      message: { type: 'text', text: '@2 狀態' }
    }
    const standbyRes = await handler.handleWebhookEvent(standbyEvent)
    expect(standbyRes.handled).toBe(true)
    expect(standbyRes.action).toBe('agent_status_reported')
    expect(standbyRes.status).toBe('standby')

    const remoteEvent = {
      type: 'message',
      replyToken: 'token-remote',
      source: { groupId: 'group-1' },
      message: { type: 'text', text: '/progress' }
    }
    const remoteRes = await handler.handleWebhookEvent(remoteEvent)
    expect(remoteRes.handled).toBe(true)
    expect(remoteRes.action).toBe('progress_checked')
    expect(remoteRes.status).toBe('remote_reported')

    if (completeTaskCallback) {
      const cb = completeTaskCallback as (res: { output: string; diffSummary: string }) => void
      cb({
        output: '專案健康度檢查完畢，4 個微服務皆正常運作',
        diffSummary: '0 files changed'
      })
    }

    const check2Event = {
      type: 'message',
      replyToken: 'token-check-2',
      source: { groupId: 'group-1' },
      message: { type: 'text', text: '@1 狀態' }
    }
    const check2Res = await handler.handleWebhookEvent(check2Event)
    expect(check2Res.handled).toBe(true)
    expect(check2Res.action).toBe('agent_status_reported')
    expect(check2Res.status).toBe('completed')

    const check2Reply = handler.getReplyApiLogs().at(-1)
    expect(check2Reply.messages[0].type).toBe('flex')
    expect(check2Reply.messages[0].contents.body.contents[1].text).toContain('專案健康度檢查完畢')

    const pushLogs = handler.getPushApiLogs()
    expect(pushLogs.length).toBe(0)
  })

  it('reserves push API exclusively for CI/CD deploy notifications', async () => {
    const handler = createLineBotHandler({
      boundRepos,
      sessionId: 'test-session',
      sessionToken: 'test-token'
    })

    await handler.sendDeployNotification('group-1', {
      repo: 'twin3.sdk',
      commit: 'abc1234',
      status: 'Success',
      message: 'All tests passed'
    })

    const pushLogs = handler.getPushApiLogs()
    expect(pushLogs.length).toBe(1)
    expect(pushLogs[0].to).toBe('group-1')
    expect(pushLogs[0].messages[0].text).toContain('CI/CD 部署通報')
    expect(pushLogs[0].messages[0].text).toContain('twin3.sdk')
  })

  it('blocks events from unauthorized groups and private 1-on-1 chats', async () => {
    const handler = createLineBotHandler({
      boundRepos,
      allowedGroups: ['authorized-group-1'],
      sessionId: 'test-session',
      sessionToken: 'test-token'
    })

    const unauthorizedGroupEvent = {
      type: 'message',
      replyToken: 'token-unauth-group',
      source: { groupId: 'unauthorized-group-2' },
      message: { type: 'text', text: '/help' }
    }
    const res1 = await handler.handleWebhookEvent(unauthorizedGroupEvent)
    expect(res1.handled).toBe(true)
    expect(res1.action).toBe('blocked_unauthorized_group')

    const replyLogs1 = handler.getReplyApiLogs()
    expect(replyLogs1.length).toBe(1)
    expect(replyLogs1[0].messages[0].text).toContain('安全鎖定')
    expect(replyLogs1[0].messages[0].text).toContain('僅限授權群組使用')

    const privateChatEvent = {
      type: 'message',
      replyToken: 'token-private-dm',
      source: { userId: 'stranger-user' },
      message: { type: 'text', text: '@1 檢查專案' }
    }
    const res2 = await handler.handleWebhookEvent(privateChatEvent)
    expect(res2.handled).toBe(true)
    expect(res2.action).toBe('blocked_unauthorized_group')

    const authorizedGroupEvent = {
      type: 'message',
      replyToken: 'token-auth-group',
      source: { groupId: 'authorized-group-1' },
      message: { type: 'text', text: '/help' }
    }
    const res3 = await handler.handleWebhookEvent(authorizedGroupEvent)
    expect(res3.handled).toBe(true)
    expect(res3.action).toBe('show_help')
  })

  it('generates and validates group-bound tickets for Web CLI safety', async () => {
    const handler = createLineBotHandler({
      boundRepos,
      allowedGroups: ['authorized-group-1'],
      sessionId: 'test-session',
      sessionToken: 'test-token'
    })

    const validTicket = handler.generateGroupCliTicket('authorized-group-1')
    expect(typeof validTicket).toBe('string')
    expect(handler.validateGroupTicket(validTicket)).toBe(true)

    const invalidTicket = handler.generateGroupCliTicket('outsider-group')
    expect(handler.validateGroupTicket(invalidTicket)).toBe(false)
    expect(handler.validateGroupTicket('non-existent-ticket')).toBe(false)
    expect(handler.validateGroupTicket('')).toBe(false)
  })

  it('generates authorized CLI link upon /cli command in authorized group', async () => {
    const handler = createLineBotHandler({
      boundRepos,
      allowedGroups: ['authorized-group-1'],
      baseUrl: 'http://localhost:3788',
      sessionId: 'test-session',
      sessionToken: 'test-token'
    })

    const event = {
      type: 'message',
      replyToken: 'token-cli-cmd',
      source: { groupId: 'authorized-group-1' },
      message: { type: 'text', text: '/cli' }
    }

    const res = await handler.handleWebhookEvent(event)
    expect(res.handled).toBe(true)
    expect(res.action).toBe('cli_link_generated')

    const replyLogs = handler.getReplyApiLogs()
    const lastReply = replyLogs.at(-1)
    expect(lastReply.messages[0].text).toContain('手機 Web CLI 專屬授權通道')
    expect(lastReply.messages[0].text).toContain('ticket=')
  })

  it('handles natural conversation with Gemini Brain and retains long-term memory', async () => {
    let capturedPrompt = ''
    const mockBrain = {
      chat: async (params: { text: string }) => {
        capturedPrompt = params.text
        return { text: '我是 Twin3 智慧大腦，理解您的對話脈絡。' }
      },
      clearMemory: () => {},
      getHistory: () => [],
      hasApiKey: () => true
    }

    const handler = createLineBotHandler({
      boundRepos,
      allowedGroups: ['authorized-group-1'],
      baseUrl: 'http://localhost:3788',
      sessionId: 'test-session',
      sessionToken: 'test-token',
      geminiBrain: mockBrain
    })

    const chatEvent = {
      type: 'message',
      replyToken: 'token-chat-natural',
      source: { groupId: 'authorized-group-1' },
      message: { type: 'text', text: '請說明目前 xagent.id 的核心架構與部署進度' }
    }

    const res = await handler.handleWebhookEvent(chatEvent)
    expect(res.handled).toBe(true)
    expect(res.action).toBe('gemini_natural_chat')
    expect(capturedPrompt).toBe('請說明目前 xagent.id 的核心架構與部署進度')

    const replyLogs = handler.getReplyApiLogs()
    const lastReply = replyLogs.at(-1)
    expect(lastReply.replyToken).toBe('token-chat-natural')
    expect(lastReply.messages[0].text).toContain('我是 Twin3 智慧大腦')
    expect(lastReply.messages[0].quickReply.items.length).toBeGreaterThan(0)

    const pushLogs = handler.getPushApiLogs()
    expect(pushLogs.length).toBe(0)
  })

  it('clears group long-term memory upon /clear command', async () => {
    let clearedGroup = ''
    const mockBrain = {
      chat: async () => ({ text: '' }),
      clearMemory: (gid: string) => {
        clearedGroup = gid
      },
      getHistory: () => [],
      hasApiKey: () => true
    }

    const handler = createLineBotHandler({
      boundRepos,
      allowedGroups: ['authorized-group-1'],
      baseUrl: 'http://localhost:3788',
      sessionId: 'test-session',
      sessionToken: 'test-token',
      geminiBrain: mockBrain
    })

    const clearEvent = {
      type: 'message',
      replyToken: 'token-clear-mem',
      source: { groupId: 'authorized-group-1' },
      message: { type: 'text', text: '/clear' }
    }

    const res = await handler.handleWebhookEvent(clearEvent)
    expect(res.handled).toBe(true)
    expect(res.action).toBe('memory_cleared')
    expect(clearedGroup).toBe('authorized-group-1')

    const replyLogs = handler.getReplyApiLogs()
    const lastReply = replyLogs.at(-1)
    expect(lastReply.messages[0].text).toContain('本群組長效對話記憶已重設完成')
  })

  it('sends clean task start card with distinct agent icon and zero black imagemap', async () => {
    const handler = createLineBotHandler({
      boundRepos,
      allowedGroups: ['authorized-group-1'],
      baseUrl: 'https://test-host.twin3.id',
      sessionId: 'test-session',
      sessionToken: 'test-token',
      executor: (
        _repo: string,
        _eng: string,
        _p: string,
        done: (r: { output: string; diffSummary: string }) => void
      ) => {
        done({ output: 'done', diffSummary: '' })
      }
    })

    const taskEvent = {
      type: 'message',
      replyToken: 'token-task-clean',
      source: { groupId: 'authorized-group-1' },
      message: { type: 'text', text: '@2 審查安全性' }
    }

    const res = await handler.handleWebhookEvent(taskEvent)
    expect(res.handled).toBe(true)
    expect(res.action).toBe('task_started')

    const replyLogs = handler.getReplyApiLogs()
    const lastReply = replyLogs.at(-1)
    expect(lastReply.messages.length).toBe(1)
    expect(lastReply.messages[0].text).toContain('📌 當前環境：')
    expect(lastReply.messages[0].text).toContain('任務已啟動')
    expect(lastReply.messages[0].sender.name).toBe('Agent 2')
    expect(lastReply.messages[0].sender.iconUrl).toContain('agent-2.png')
  })

  it('formats /progress response matching CTO war-room standard with GitHub URLs and zero greetings', async () => {
    const handler = createLineBotHandler({
      boundRepos,
      allowedGroups: ['authorized-group-1'],
      baseUrl: 'https://test-host.twin3.id',
      sessionId: 'test-session',
      sessionToken: 'test-token',
      executor: () => {}
    })

    const progressEvent = {
      type: 'message',
      replyToken: 'token-progress-warroom',
      source: { groupId: 'authorized-group-1' },
      message: { type: 'text', text: '/progress' }
    }

    const res = await handler.handleWebhookEvent(progressEvent)
    expect(res.handled).toBe(true)
    expect(res.action).toBe('progress_checked')

    const replyLogs = handler.getReplyApiLogs()
    const lastReply = replyLogs.at(-1)
    const replyText = lastReply.messages[0].text

    expect(replyText).toContain('🔴 🏢 xAgent.id')
    expect(replyText).toContain('現在到哪：')
    expect(replyText).toContain('待驗收：')
    expect(replyText).toContain('🔗 https://github.com/twin3-ai/agent-id/pull/1261')
    expect(replyText).not.toContain('Ming 您好')
    expect(replyText).not.toContain('Orca Bridge')
  })
})
