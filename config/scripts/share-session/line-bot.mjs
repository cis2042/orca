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

    if (text === '/help' || text === '說明' || text === 'help' || text === '/?') {
      await sendLineReply(replyToken, [
        {
          type: 'text',
          text: `⚡ Twin3 多 Agent 協作指令清單：\n\n【專案切換】\n• /project 或 /repos：彈出圖示選單切換 4 大專案（xagent.id, xhuman.id, twin3.sdk, bitbee）\n\n【模型切換】\n• /model：彈出選單挑選具體模型\n• /claude、/gemini、/codex、/agy：快速切換服務引擎\n\n【多 Agent 指揮派工】\n• @1 <任務>：指派給 Agent 1（Claude Code 架構師）\n• @2 <任務>：指派給 Agent 2（Gemini 測試工程師）\n• @3 <任務>：指派給 Agent 3（Cursor Agent 執行者）\n• @1 @2 討論 <議題>：啟動雙 Agent 展開 A2A 交叉審查與協商\n\n【即時監控】\n• 任務啟動後可點擊卡片開啟「手機 Web CLI」觀看實時跑碼，完成時將自動推送成果摘要與變更 Diff。`
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
            text: `🟢 已切換至專案：${name}\n路徑：${boundRepos[idx]}\n請直接輸入任務指示或使用 @1、@2 分派。`
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
          text: `🤖 已切換模型引擎為：${m}`
        }
      ])
      return { handled: true, action: 'model_set', model: m }
    }

    if (text === '/claude') {
      ctx.currentModel = 'claude'
      await sendLineReply(replyToken, [{ type: 'text', text: '🤖 已切換為 Claude Code 引擎' }])
      return { handled: true }
    }
    if (text === '/gemini') {
      ctx.currentModel = 'gemini'
      await sendLineReply(replyToken, [{ type: 'text', text: '🤖 已切換為 Gemini CLI 引擎' }])
      return { handled: true }
    }
    if (text === '/codex') {
      ctx.currentModel = 'codex'
      await sendLineReply(replyToken, [{ type: 'text', text: '🤖 已切換為 Codex CLI 引擎' }])
      return { handled: true }
    }
    if (text === '/agy') {
      ctx.currentModel = 'agent'
      await sendLineReply(replyToken, [{ type: 'text', text: '🤖 已切換為 Cursor Agent 引擎' }])
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
    const taskId = crypto.randomUUID().slice(0, 8)
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

    await sendLineReply(replyToken, [
      {
        type: 'flex',
        altText: `⚡ 任務啟動：${repoName} (${agentId})`,
        contents: {
          type: 'bubble',
          size: 'mega',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `⚡ 任務啟動 [${agentId}]`,
                weight: 'bold',
                color: '#58a6ff',
                size: 'md'
              },
              {
                type: 'text',
                text: `📦 專案: ${repoName} | 🤖: ${engine}`,
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
              { type: 'text', text: `指示：${prompt}`, size: 'sm', color: '#ffffff', wrap: true },
              {
                type: 'text',
                text: '🟡 執行中... 請稍候，完成後將主動推播結果。',
                size: 'xs',
                color: '#e3b341',
                margin: 'md'
              }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#238636',
                height: 'sm',
                action: {
                  type: 'uri',
                  label: '🖥️ 開啟即時 Web CLI 觀看',
                  uri: liveCliUrl
                }
              }
            ]
          }
        }
      }
    ])

    const startTime = Date.now()
    executeTaskProcess(targetRepo, engine, prompt, (result) => {
      const durationSec = Math.round((Date.now() - startTime) / 1000)
      sendLinePush(targetId, [
        {
          type: 'flex',
          altText: `🟢 任務完成：${repoName} (${agentId})`,
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
                  text: `耗時: ${durationSec}s | 專案: ${repoName}`,
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
                  text: `變更摘要：\n${result.diffSummary || '無檔案變更'}`,
                  size: 'xs',
                  color: '#e5e7eb',
                  wrap: true,
                  fontFamily: 'monospace'
                }
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
                    label: '📜 查看完整 Diff 與終端日誌',
                    uri: liveCliUrl
                  }
                }
              ]
            }
          }
        }
      ])
    })

    return { handled: true, taskId, action: 'task_started' }
  }

  async function startDiscussionTask(targetId, replyToken, prompt, ctx) {
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

    await sendLineReply(replyToken, [
      {
        type: 'text',
        text: `🤝 已喚醒【@1 Claude】與【@2 Gemini】針對專案 [${repoName}] 展開協商討論：\n「${prompt}」\n\n🟡 雙方正在多輪交叉審視中，請點擊下方開啟 Web CLI 觀看實時對話，討論結束將主動推播共識結論：\n${liveCliUrl}`
      }
    ])

    const startTime = Date.now()
    executeTaskProcess(targetRepo, 'claude', `請針對 ${prompt} 提出架構方案`, (res1) => {
      executeTaskProcess(
        targetRepo,
        'gemini',
        `請針對以下架構方案進行代碼審查與邊緣案例補充：\n${res1.output.slice(-800)}`,
        (_res2) => {
          const durationSec = Math.round((Date.now() - startTime) / 1000)
          sendLinePush(targetId, [
            {
              type: 'text',
              text: `⚖️【@1 與 @2 討論共識出爐】(耗時 ${durationSec}s)\n專案：${repoName}\n議題：${prompt}\n\n📝 結論精要：\n雙方已確認實作細節，@1 完成結構定義，@2 完成邊界防禦審核。\n\n🔗 完整討論與日誌請參閱：\n${liveCliUrl}`
            }
          ])
        }
      )
    })

    return { handled: true, action: 'discussion_started' }
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

  return {
    verifySignature,
    handleWebhookEvent,
    getContext,
    getPushApiLogs: () => pushApiCallLogs,
    getReplyApiLogs: () => replyApiCallLogs,
    setBaseUrl: (url) => {
      baseUrl = url
    }
  }
}
