import crypto from 'node:crypto'
import { spawn, execSync } from 'node:child_process'

export function createLineBotHandler(options = {}) {
  let channelAccessToken = options.channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
  let channelSecret = options.channelSecret || process.env.LINE_CHANNEL_SECRET || ''
  const boundRepos = options.boundRepos || []
  let baseUrl = options.baseUrl || 'http://localhost:3788'
  const sessionId = options.sessionId || ''
  const sessionToken = options.sessionToken || ''
  const executor = options.executor || null

  const userContexts = new Map()
  const pushApiCallLogs = []
  const replyApiCallLogs = []

  function stripAnsi(str) {
    if (!str) {
      return ''
    }
    const esc = String.fromCharCode(27)
    return str.replaceAll(new RegExp(`${esc}\\[[0-9;]*[a-zA-Z]`, 'g'), '')
  }

  function getContext(targetId) {
    if (!userContexts.has(targetId)) {
      userContexts.set(targetId, {
        currentRepoIndex: 0,
        currentModel: 'claude',
        activeTasks: new Map()
      })
    }
    return userContexts.get(targetId)
  }

  function verifySignature(body, signature) {
    if (!channelSecret) {
      return true
    }
    const hash = crypto.createHmac('sha256', channelSecret).update(body).digest('base64')
    return hash === signature
  }

  async function sendLineReply(replyToken, messages) {
    replyApiCallLogs.push({ replyToken, messages, timestamp: Date.now() })
    if (!channelAccessToken) {
      return { ok: true, mocked: true }
    }
    try {
      const res = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${channelAccessToken}`
        },
        body: JSON.stringify({ replyToken, messages })
      })
      return { ok: res.ok, status: res.status }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }

  async function sendLinePush(to, messages) {
    pushApiCallLogs.push({ to, messages, timestamp: Date.now() })
    if (!channelAccessToken) {
      return { ok: true, mocked: true }
    }
    try {
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${channelAccessToken}`
        },
        body: JSON.stringify({ to, messages })
      })
      return { ok: res.ok, status: res.status }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }

  function makeQuickReplyRepos() {
    const aliasMap = {
      'agent-id': 'xagent.id',
      XHuman_ID: 'xhuman.id',
      'twin3-sdk': 'twin3.sdk',
      twin3_bitbee: 'bitbee'
    }
    const items = boundRepos.map((repo, idx) => {
      const base = repo.split('/').pop()
      const name = aliasMap[base] || base
      return {
        type: 'action',
        action: {
          type: 'message',
          label: `📦 ${name}`,
          text: `/set_repo ${idx}`
        }
      }
    })
    return { items }
  }

  function makeQuickReplyModels() {
    return {
      items: [
        {
          type: 'action',
          action: { type: 'message', label: 'Claude Code', text: '/set_model claude' }
        },
        {
          type: 'action',
          action: { type: 'message', label: 'Gemini CLI', text: '/set_model gemini' }
        },
        {
          type: 'action',
          action: { type: 'message', label: 'Codex CLI', text: '/set_model codex' }
        },
        {
          type: 'action',
          action: { type: 'message', label: 'Cursor Agent', text: '/set_model agent' }
        }
      ]
    }
  }

  function makeStandardQuickReplies(ctx, liveCliUrl) {
    const aliasMap = {
      'agent-id': 'xagent.id',
      XHuman_ID: 'xhuman.id',
      'twin3-sdk': 'twin3.sdk',
      twin3_bitbee: 'bitbee'
    }
    const currentRepo = boundRepos[ctx?.currentRepoIndex || 0] || boundRepos[0]
    const base = currentRepo.split('/').pop()
    const repoName = aliasMap[base] || base
    const currentModel = ctx?.currentModel || 'claude'

    const items = [
      {
        type: 'action',
        action: { type: 'message', label: `📦 專案(${repoName})`, text: '/project' }
      },
      {
        type: 'action',
        action: { type: 'message', label: `🤖 引擎(${currentModel})`, text: '/model' }
      },
      {
        type: 'action',
        action: { type: 'message', label: '⚡ @1 狀態', text: '@1 檢查專案健康度' }
      },
      {
        type: 'action',
        action: { type: 'message', label: '🤝 雙 Agent 協商', text: '@1 @2 討論 架構優化' }
      },
      {
        type: 'action',
        action: { type: 'message', label: '❓ 說明', text: '/help' }
      }
    ]
    if (liveCliUrl) {
      items.push({
        type: 'action',
        action: { type: 'uri', label: '🖥️ 手機 Web CLI', uri: liveCliUrl }
      })
    }
    return { items }
  }

  function runTaskAsync(targetRepo, engine, prompt) {
    return new Promise((resolve) => {
      executeTaskProcess(targetRepo, engine, prompt, resolve)
    })
  }

  async function handleWebhookEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
      return { handled: false }
    }

    const replyToken = event.replyToken
    const text = event.message.text.trim()
    const targetId = event.source.groupId || event.source.roomId || event.source.userId
    const ctx = getContext(targetId)

    const aliasMap = {
      'agent-id': 'xagent.id',
      XHuman_ID: 'xhuman.id',
      'twin3-sdk': 'twin3.sdk',
      twin3_bitbee: 'bitbee'
    }

    const liveCliUrl = `${baseUrl}/s/${sessionId}?token=${sessionToken}`

    if (text === '/help' || text === '說明' || text === 'help' || text === '/?') {
      await sendLineReply(replyToken, [
        {
          type: 'text',
          text: `⚡ Twin3 多 Agent 協作指令清單：\n\n【專案切換】\n• /project：切換 4 大專案（xagent.id, xhuman.id, twin3.sdk, bitbee）\n\n【模型切換】\n• /model：挑選模型引擎\n• /claude、/gemini、/codex、/agy：快速切換\n\n【多 Agent 指揮派工】\n• @1 <任務>：指派給 Agent 1（Claude Code 架構師）\n• @2 <任務>：指派給 Agent 2（Gemini 測試工程師）\n• @3 <任務>：指派給 Agent 3（Cursor Agent 執行者）\n• @1 @2 討論 <議題>：雙 Agent A2A 交叉審查\n\n【直接回覆】\n• 所有回答與成果直接在 LINE 訊息中呈現，可使用下方捷徑按鈕快速切換操作。`,
          quickReply: makeStandardQuickReplies(ctx, liveCliUrl)
        }
      ])
      return { handled: true, action: 'show_help' }
    }

    if (text === '/project' || text === '/repos') {
      await sendLineReply(replyToken, [
        {
          type: 'text',
          text: '請點選下方圖示切換欲操作的 Twin3 專案：',
          quickReply: makeQuickReplyRepos()
        }
      ])
      return { handled: true, action: 'select_project' }
    }

    if (text.startsWith('/set_repo ')) {
      const idx = Number.parseInt(text.replace('/set_repo ', ''), 10)
      if (idx >= 0 && idx < boundRepos.length) {
        ctx.currentRepoIndex = idx
        const base = boundRepos[idx].split('/').pop()
        const name = aliasMap[base] || base
        await sendLineReply(replyToken, [
          {
            type: 'text',
            text: `🟢 已切換至專案：${name}\n路徑：${boundRepos[idx]}\n請直接輸入任務指示或使用 @1、@2 分派。`,
            quickReply: makeStandardQuickReplies(ctx, liveCliUrl)
          }
        ])
        return { handled: true, action: 'repo_set', repoIndex: idx }
      }
    }

    if (text === '/model') {
      await sendLineReply(replyToken, [
        {
          type: 'text',
          text: '請選擇欲調用的 AI 引擎（使用宿主訂閱）：',
          quickReply: makeQuickReplyModels()
        }
      ])
      return { handled: true, action: 'select_model' }
    }

    if (text.startsWith('/set_model ')) {
      const m = text.replace('/set_model ', '').trim()
      ctx.currentModel = m
      await sendLineReply(replyToken, [
        {
          type: 'text',
          text: `🤖 已切換模型引擎為：${m}`,
          quickReply: makeStandardQuickReplies(ctx, liveCliUrl)
        }
      ])
      return { handled: true, action: 'model_set', model: m }
    }

    if (text === '/claude') {
      ctx.currentModel = 'claude'
      await sendLineReply(replyToken, [
        {
          type: 'text',
          text: '🤖 已切換為 Claude Code 引擎',
          quickReply: makeStandardQuickReplies(ctx, liveCliUrl)
        }
      ])
      return { handled: true }
    }
    if (text === '/gemini') {
      ctx.currentModel = 'gemini'
      await sendLineReply(replyToken, [
        {
          type: 'text',
          text: '🤖 已切換為 Gemini CLI 引擎',
          quickReply: makeStandardQuickReplies(ctx, liveCliUrl)
        }
      ])
      return { handled: true }
    }
    if (text === '/codex') {
      ctx.currentModel = 'codex'
      await sendLineReply(replyToken, [
        {
          type: 'text',
          text: '🤖 已切換為 Codex CLI 引擎',
          quickReply: makeStandardQuickReplies(ctx, liveCliUrl)
        }
      ])
      return { handled: true }
    }
    if (text === '/agy') {
      ctx.currentModel = 'agent'
      await sendLineReply(replyToken, [
        {
          type: 'text',
          text: '🤖 已切換為 Cursor Agent 引擎',
          quickReply: makeStandardQuickReplies(ctx, liveCliUrl)
        }
      ])
      return { handled: true }
    }

    const isDiscussion =
      text.includes('@1') &&
      text.includes('@2') &&
      (text.includes('討論') || text.includes('review') || text.includes('對齊'))
    const isTargetedAgent = text.startsWith('@1') || text.startsWith('@2') || text.startsWith('@3')

    let agentId = '@1'
    let prompt = text
    let engine = ctx.currentModel

    if (isDiscussion) {
      prompt = text.replace(/@\d/g, '').trim()
      return startDiscussionTask(targetId, replyToken, prompt, ctx)
    }

    if (isTargetedAgent) {
      const match = text.match(/^(@\d)\s*(.*)/)
      if (match) {
        agentId = match[1]
        prompt = match[2]
      }
      if (agentId === '@1') {
        engine = 'claude'
      }
      if (agentId === '@2') {
        engine = 'gemini'
      }
      if (agentId === '@3') {
        engine = 'agent'
      }
    }

    return startExecutionTask(targetId, replyToken, prompt, agentId, engine, ctx)
  }

  async function startExecutionTask(targetId, replyToken, prompt, agentId, engine, ctx) {
    const startTime = Date.now()
    const targetRepo = boundRepos[ctx.currentRepoIndex] || boundRepos[0]
    const base = targetRepo.split('/').pop()
    const aliasMap = {
      'agent-id': 'xagent.id',
      XHuman_ID: 'xhuman.id',
      'twin3-sdk': 'twin3.sdk',
      twin3_bitbee: 'bitbee'
    }
    const repoName = aliasMap[base] || base
    const liveCliUrl = `${baseUrl}/s/${sessionId}?token=${sessionToken}`

    const result = await runTaskAsync(targetRepo, engine, prompt)
    const durationSec = Math.round((Date.now() - startTime) / 1000)
    const cleanOutput = stripAnsi(result.output).trim()
    const displayOutput =
      cleanOutput.length > 1500
        ? `${cleanOutput.slice(0, 1400)}\n\n...（更多內容可點擊下方按鈕至 Web CLI 查看）`
        : cleanOutput || '任務已順利完成'

    await sendLineReply(replyToken, [
      {
        type: 'flex',
        altText: `🟢 ${repoName} (${agentId}) 成果回覆`,
        quickReply: makeStandardQuickReplies(ctx, liveCliUrl),
        contents: {
          type: 'bubble',
          size: 'mega',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `🟢 任務完成 [${agentId}]`,
                weight: 'bold',
                color: '#3fb950',
                size: 'md'
              },
              {
                type: 'text',
                text: `耗時: ${durationSec}s | 專案: ${repoName} | 引擎: ${engine}`,
                size: 'xs',
                color: '#8b949e',
                margin: 'xs'
              }
            ]
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '📝 回覆與執行結果：',
                weight: 'bold',
                size: 'xs',
                color: '#58a6ff'
              },
              {
                type: 'text',
                text: displayOutput,
                size: 'sm',
                color: '#f0f6fc',
                wrap: true,
                margin: 'sm'
              },
              ...(result.diffSummary
                ? [
                    {
                      type: 'text',
                      text: `\n📦 檔案變更：\n${result.diffSummary}`,
                      size: 'xs',
                      color: '#7ee787',
                      wrap: true,
                      fontFamily: 'monospace',
                      margin: 'md'
                    }
                  ]
                : [])
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                style: 'secondary',
                height: 'sm',
                action: {
                  type: 'uri',
                  label: '🖥️ 開啟 Web CLI（可選：手動控制）',
                  uri: liveCliUrl
                }
              }
            ]
          }
        }
      }
    ])

    return { handled: true, action: 'task_replied' }
  }

  async function startDiscussionTask(targetId, replyToken, prompt, ctx) {
    const startTime = Date.now()
    const targetRepo = boundRepos[ctx.currentRepoIndex] || boundRepos[0]
    const base = targetRepo.split('/').pop()
    const aliasMap = {
      'agent-id': 'xagent.id',
      XHuman_ID: 'xhuman.id',
      'twin3-sdk': 'twin3.sdk',
      twin3_bitbee: 'bitbee'
    }
    const repoName = aliasMap[base] || base
    const liveCliUrl = `${baseUrl}/s/${sessionId}?token=${sessionToken}`

    const res1 = await runTaskAsync(targetRepo, 'claude', `請針對 ${prompt} 提出架構方案`)
    const res2 = await runTaskAsync(
      targetRepo,
      'gemini',
      `請針對以下架構方案進行代碼審查與邊緣案例補充：\n${res1.output.slice(-800)}`
    )

    const durationSec = Math.round((Date.now() - startTime) / 1000)
    const clean1 = stripAnsi(res1.output).trim()
    const clean2 = stripAnsi(res2.output).trim()
    const brief1 = clean1.length > 500 ? `${clean1.slice(0, 480)}...` : clean1 || '架構規劃完成'
    const brief2 = clean2.length > 500 ? `${clean2.slice(0, 480)}...` : clean2 || '邊界審查通過'

    await sendLineReply(replyToken, [
      {
        type: 'text',
        text: `⚖️【@1 與 @2 討論共識出爐】(耗時 ${durationSec}s)\n專案：${repoName}\n議題：${prompt}\n\n🏛️ @1 Claude 方案：\n${brief1}\n\n🛡️ @2 Gemini 審查：\n${brief2}`,
        quickReply: makeStandardQuickReplies(ctx, liveCliUrl)
      }
    ])

    return { handled: true, action: 'discussion_replied' }
  }

  function executeTaskProcess(targetRepo, engine, prompt, onDone) {
    if (executor) {
      executor(targetRepo, engine, prompt, onDone)
      return
    }
    let cmd = 'claude'
    let args = ['-p', prompt, '--dangerously-skip-permissions']

    if (engine === 'gemini') {
      cmd = 'gemini'
      args = ['-p', prompt, '--skip-trust', '--approval-mode', 'yolo']
    } else if (engine === 'codex') {
      cmd = 'codex'
      args = ['exec', prompt]
    } else if (engine === 'agent') {
      cmd = 'agent'
      args = ['-f', '--model', 'auto', prompt]
    }

    let output = ''
    try {
      const child = spawn(cmd, args, {
        cwd: targetRepo,
        env: { ...process.env }
      })

      child.stdout.on('data', (d) => {
        output += d.toString()
      })
      child.stderr.on('data', (d) => {
        output += d.toString()
      })

      child.on('close', () => {
        let diffSummary = ''
        try {
          diffSummary = execSync('git status --short', { cwd: targetRepo, encoding: 'utf8' }).trim()
        } catch {}
        onDone({ output, diffSummary })
      })

      child.on('error', (err) => {
        onDone({ output: `Error: ${err.message}`, diffSummary: '' })
      })
    } catch (e) {
      onDone({ output: `Spawn failure: ${e.message}`, diffSummary: '' })
    }
  }

  async function sendDeployNotification(to, deployInfo = {}) {
    const { repo, commit, status, message, url } = deployInfo
    const deployText = `🚀【CI/CD 部署通報】\n專案：${repo || 'twin3'}\n狀態：${status || 'Success'}\nCommit：${commit || 'HEAD'}\n${message ? `說明：${message}\n` : ''}${url ? `連結：${url}` : ''}`
    return sendLinePush(to, [{ type: 'text', text: deployText.trim() }])
  }

  return {
    verifySignature,
    handleWebhookEvent,
    getContext,
    getPushApiLogs: () => pushApiCallLogs,
    getReplyApiLogs: () => replyApiCallLogs,
    sendDeployNotification,
    setBaseUrl: (url) => {
      baseUrl = url
    }
  }
}
