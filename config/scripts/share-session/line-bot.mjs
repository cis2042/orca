import fs from 'node:fs'
import path from 'node:path'
import { spawn, execSync } from 'node:child_process'
import {
  getRepoMeta,
  getModelMeta,
  getMessageSender,
  formatStatusHeader,
  makeQuickReplyRepos,
  makeQuickReplyModels,
  makeStandardQuickReplies,
  makeFileQuickReplies,
  makeProgressFlexMessage,
  helpCommandText
} from './line-templates.mjs'
import {
  verifySignature as checkSignature,
  stripAnsi,
  sendLineReply as postReply,
  sendLinePush as postPush,
  createGroupTicketManager,
  createDefaultContentFetcher
} from './line-transport.mjs'
import { createGeminiBrain } from './gemini-brain.mjs'
import { inspectRemoteStatus } from './remote-inspector.mjs'

export function createLineBotHandler(options = {}) {
  const channelAccessToken =
    options.channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
  const channelSecret = options.channelSecret || process.env.LINE_CHANNEL_SECRET || ''
  const boundRepos = options.boundRepos || []
  let baseUrl = options.baseUrl || 'http://localhost:3788'
  const sessionId = options.sessionId || ''
  const sessionToken = options.sessionToken || ''
  const executor = options.executor || null
  const broadcast = options.broadcast || (() => {})
  const geminiBrain = options.geminiBrain || createGeminiBrain(options.geminiBrainOptions || {})
  const contentFetcher = createDefaultContentFetcher(channelAccessToken, options.contentFetcher)
  const allowedGroups = new Set(
    (
      options.allowedGroups ||
      (process.env.LINE_ALLOWED_GROUPS ? process.env.LINE_ALLOWED_GROUPS.split(',') : [])
    )
      .map((s) => s.trim())
      .filter(Boolean)
  )
  const autoLockFirstGroup = options.autoLockFirstGroup !== false
  const ticketManager = createGroupTicketManager(allowedGroups)
  const userContexts = new Map()
  const pushApiCallLogs = []
  const replyApiCallLogs = []
  let activeRepoIndex = 0
  let activeModel = 'claude'

  function getContext(targetId) {
    if (!userContexts.has(targetId)) {
      userContexts.set(targetId, {
        currentRepoIndex: 0,
        currentModel: 'claude',
        activeTasks: new Map(),
        currentTask: null,
        agentTasks: { '@1': null, '@2': null, '@3': null },
        lastUploadedFile: null
      })
    }
    return userContexts.get(targetId)
  }

  function sendLineReply(replyToken, messages, targetRepo, agentId) {
    const repo = targetRepo || boundRepos[0]
    const sender = getMessageSender(repo, baseUrl, agentId)
    const decorated = messages.map((m) => (m.sender || !sender ? m : { ...m, sender }))
    return postReply(channelAccessToken, replyToken, decorated, replyApiCallLogs)
  }

  function replyText(replyToken, text, quickReply, repo, agentId) {
    const msg = { type: 'text', text }
    if (quickReply) {
      msg.quickReply = quickReply
    }
    return sendLineReply(replyToken, [msg], repo, agentId)
  }

  const sendLinePush = (to, messages) => postPush(channelAccessToken, to, messages, pushApiCallLogs)
  const getStandardQuickReplies = (ctx, liveCliUrl, groupId, opt = {}) =>
    makeStandardQuickReplies(
      ctx,
      liveCliUrl,
      groupId,
      boundRepos,
      ticketManager.generateTicket,
      opt
    )
  const runTaskAsync = (targetRepo, engine, prompt, taskRecord) =>
    new Promise((resolve) => executeTaskProcess(targetRepo, engine, prompt, taskRecord, resolve))

  async function handleWebhookEvent(event) {
    if (
      event.type !== 'message' ||
      !event.message ||
      (event.message.type !== 'text' && event.message.type !== 'file')
    ) {
      return { handled: false }
    }

    const replyToken = event.replyToken
    const groupId = event.source.groupId || ''
    const userId = event.source.userId || ''
    const targetId = groupId || event.source.roomId || userId
    const isMasterUser = userId === 'Ufc250cf8f5c9a0538ad8d397fd2a8853'

    if (!isMasterUser) {
      if (allowedGroups.size > 0) {
        if (!groupId || !allowedGroups.has(groupId)) {
          await replyText(
            replyToken,
            '🔒【安全鎖定】此功能已鎖定僅限授權群組使用。群外對話或未授權群組無法調用。'
          )
          return { handled: true, action: 'blocked_unauthorized_group', groupId }
        }
      } else {
        if (groupId && autoLockFirstGroup) {
          allowedGroups.add(groupId)
        } else if (!groupId) {
          await replyText(
            replyToken,
            '🔒【安全鎖定】服務尚未鎖定群組。請將 Bot 加入專屬群組並在群內發送指令以完成鎖定。'
          )
          return { handled: true, action: 'blocked_no_group_locked' }
        }
      }
    } else if (groupId && autoLockFirstGroup && allowedGroups.size === 0) {
      allowedGroups.add(groupId)
    }

    const ctx = getContext(targetId)
    const currentRepo = boundRepos[ctx.currentRepoIndex] || boundRepos[0]
    const liveCliUrl = `${baseUrl}/s/${sessionId}?token=${sessionToken}`
    const ticket = targetId ? ticketManager.generateTicket(targetId) : ''
    const targetCliUrl = ticket ? `${liveCliUrl}&ticket=${ticket}` : liveCliUrl

    if (event.message.type === 'file') {
      const fileName = event.message.fileName || 'document.md'
      const fileSize = event.message.fileSize || 0
      const messageId = event.message.id

      const buffer = await contentFetcher(messageId)
      const fileText = buffer.toString('utf8')

      const targetRepo = boundRepos[ctx.currentRepoIndex] || boundRepos[0]
      const saveDir = path.join(targetRepo, '.twin3-uploads')
      try {
        fs.mkdirSync(saveDir, { recursive: true })
        fs.writeFileSync(path.join(saveDir, fileName), fileText)
      } catch {}

      ctx.lastUploadedFile = {
        id: messageId,
        fileName,
        fileSize,
        content: fileText,
        path: path.join(saveDir, fileName),
        timestamp: Date.now()
      }

      const preview = fileText.trim().slice(0, 160).replaceAll('\n', ' ')
      const repoMeta = getRepoMeta(targetRepo)

      await sendLineReply(replyToken, [
        {
          type: 'text',
          text: `📄【已接收文件：${fileName}】(${Math.round((fileSize / 1024) * 10) / 10} KB)\n專案：${repoMeta.icon} ${repoMeta.name}\n\n📝 前段預覽：\n${preview}...\n\n文件已載入上下文！請點選下方快捷指派 AI 處理，或在群中輸入「@1 請看這份文件...」：`,
          quickReply: makeFileQuickReplies(fileName, targetCliUrl)
        }
      ])
      return { handled: true, action: 'file_received', fileName, fileSize }
    }

    const text = event.message.text.trim()

    if (text === '/progress' || text === '查看進度' || text === '/status' || text === '進度') {
      const remoteData = inspectRemoteStatus(boundRepos, ctx.currentTask, currentRepo)
      const summaryText = await geminiBrain.summarizeRemoteProgress(remoteData)
      await replyText(
        replyToken,
        summaryText,
        getStandardQuickReplies(ctx, liveCliUrl, groupId, { showLiveView: false }),
        currentRepo
      )
      return { handled: true, action: 'progress_checked', status: 'remote_reported' }
    }

    if (text === '/cli') {
      await replyText(
        replyToken,
        `🖥️【手機 Web CLI 專屬授權通道】\n此專屬連結已綁定本群組安全授權，有效期間 24 小時：\n${targetCliUrl}`,
        getStandardQuickReplies(ctx, liveCliUrl, groupId)
      )
      return { handled: true, action: 'cli_link_generated' }
    }

    if (text === '/help' || text === '說明' || text === 'help' || text === '/?') {
      await replyText(
        replyToken,
        helpCommandText,
        getStandardQuickReplies(ctx, liveCliUrl, groupId),
        currentRepo
      )
      return { handled: true, action: 'show_help' }
    }

    if (text === '/project' || text === '/repos') {
      await replyText(
        replyToken,
        '請點選下方圖示切換欲操作的 Twin3 專案：',
        makeQuickReplyRepos(boundRepos),
        currentRepo
      )
      return { handled: true, action: 'select_project' }
    }

    if (text.startsWith('/set_repo ')) {
      const idx = Number.parseInt(text.replace('/set_repo ', ''), 10)
      if (idx >= 0 && idx < boundRepos.length) {
        ctx.currentRepoIndex = idx
        activeRepoIndex = idx
        const newRepo = boundRepos[idx]
        const meta = getRepoMeta(newRepo)
        const header = formatStatusHeader(newRepo, ctx.currentModel)
        await replyText(
          replyToken,
          `${header}\n\n🟢 已切換至專案：${meta.icon} ${meta.name}\n請直接輸入任務指示或使用 @1、@2 分派。`,
          getStandardQuickReplies(ctx, liveCliUrl, groupId),
          newRepo
        )
        return { handled: true, action: 'repo_set', repoIndex: idx }
      }
    }

    if (text === '/model') {
      await replyText(
        replyToken,
        '請選擇欲調用的 AI 引擎（鎖定 3 款旗艦，全 Medium 強度）：',
        makeQuickReplyModels()
      )
      return { handled: true, action: 'select_model' }
    }

    if (
      text.startsWith('/set_model ') ||
      text === '/claude' ||
      text === '/gpt' ||
      text === '/gemini'
    ) {
      const m = text.startsWith('/set_model ')
        ? text.replace('/set_model ', '').trim()
        : text.replace('/', '').trim()
      ctx.currentModel = m
      activeModel = m
      const meta = getModelMeta(m)
      const header = formatStatusHeader(currentRepo, m)
      await replyText(
        replyToken,
        `${header}\n\n🤖 已切換模型引擎為：${meta.icon} ${meta.name} [${meta.statusLight} ${meta.statusText}]`,
        getStandardQuickReplies(ctx, liveCliUrl, groupId)
      )
      return { handled: true, action: 'model_set', model: m }
    }

    if (text === '/clear' || text === '/reset' || text === '重設記憶') {
      geminiBrain.clearMemory(groupId || targetId)
      await replyText(
        replyToken,
        '🧠【Twin3 智慧大腦】本群組長效對話記憶已重設完成。',
        getStandardQuickReplies(ctx, liveCliUrl, groupId),
        currentRepo
      )
      return { handled: true, action: 'memory_cleared' }
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
      return startDiscussionTask(targetId, replyToken, prompt, ctx, groupId)
    }

    if (isTargetedAgent) {
      const match = text.match(/^(@\d)\s*(.*)/)
      if (match) {
        agentId = match[1]
        prompt = match[2]?.trim() || ''
      }
      engine = agentId === '@1' ? 'claude' : agentId === '@2' ? 'gpt' : 'gemini'
      activeModel = engine
      if (!prompt || prompt === '狀態' || prompt === 'status' || prompt === '進度') {
        return reportAgentStatus(targetId, replyToken, agentId, engine, ctx, groupId)
      }
      return startExecutionTask(targetId, replyToken, prompt, agentId, engine, ctx, groupId)
    }
    return startNaturalChat(targetId, replyToken, text, ctx, groupId)
  }

  async function reportAgentStatus(targetId, replyToken, agentId, engine, ctx, groupId) {
    const currentRepo = boundRepos[ctx.currentRepoIndex] || boundRepos[0]
    const repoMeta = getRepoMeta(currentRepo)
    const modelMeta = getModelMeta(engine)
    const statusHeader = formatStatusHeader(currentRepo, engine)
    const task = ctx.agentTasks?.[agentId]
    const liveCliUrl = `${baseUrl}/s/${sessionId}?token=${sessionToken}`
    const ticket = targetId ? ticketManager.generateTicket(targetId) : ''
    const targetCliUrl = ticket ? `${liveCliUrl}&ticket=${ticket}` : liveCliUrl

    if (!task || task.status === 'idle') {
      await replyText(
        replyToken,
        `${statusHeader}\n\n🟡【${agentId} 待命中】(Standby)\n引擎：${modelMeta.icon} ${modelMeta.name} (${modelMeta.tier}) [${modelMeta.statusLight} ${modelMeta.statusText}]\n專案：${repoMeta.icon} ${repoMeta.name}\n\n目前尚未指派即時任務。請直接在群組輸入「${agentId} <指示>」分派工作。`,
        getStandardQuickReplies(ctx, liveCliUrl, groupId, { showLiveView: false }),
        currentRepo,
        agentId
      )
      return { handled: true, action: 'agent_status_reported', agentId, status: 'standby' }
    }

    if (task.status === 'running') {
      const elapsed = Math.round((Date.now() - task.startTime) / 1000)
      const cleanOut = stripAnsi(task.latestOutput).trim()
      const preview =
        cleanOut.length > 280 ? `...${cleanOut.slice(-260)}` : cleanOut || '進程啟動並載入中...'
      const progressMsg = {
        type: 'text',
        text: `${statusHeader}\n\n⏳【${agentId} 執行中】(已耗時 ${elapsed}s)\n指示：${task.prompt}\n\n📝 最新終端片段：\n${preview}\n\n隨時點擊下方按鈕免費查看關鍵結論與待決策事項：`,
        quickReply: getStandardQuickReplies(ctx, liveCliUrl, groupId, { showLiveView: false })
      }
      await sendLineReply(replyToken, [progressMsg], currentRepo, agentId)
      return { handled: true, action: 'agent_status_reported', agentId, status: 'running' }
    }

    if (task.status === 'completed') {
      await sendLineReply(
        replyToken,
        [
          {
            type: 'flex',
            altText: `🟢【${agentId} 任務完成】成果回報`,
            quickReply: getStandardQuickReplies(ctx, liveCliUrl, groupId, { showLiveView: true }),
            contents: makeProgressFlexMessage(task, repoMeta, modelMeta, targetCliUrl)
          }
        ],
        currentRepo,
        agentId
      )
      return { handled: true, action: 'agent_status_reported', agentId, status: 'completed' }
    }
  }

  async function startExecutionTask(targetId, replyToken, prompt, agentId, engine, ctx, groupId) {
    const startTime = Date.now()
    const targetRepo = boundRepos[ctx.currentRepoIndex] || boundRepos[0]
    const modelMeta = getModelMeta(engine)
    const liveCliUrl = `${baseUrl}/s/${sessionId}?token=${sessionToken}`

    let execPrompt = prompt
    if (ctx.lastUploadedFile) {
      execPrompt = `【參考上下文文件: ${ctx.lastUploadedFile.fileName} (檔案路徑: ${ctx.lastUploadedFile.path})】\n${ctx.lastUploadedFile.content}\n\n【指示】: ${prompt}`
    }

    const taskRecord = {
      id: `task-${Date.now()}`,
      prompt,
      agentId,
      engine,
      targetRepo,
      status: 'running',
      startTime,
      completedTime: null,
      latestOutput: '',
      resultSummary: '',
      diffSummary: ''
    }
    ctx.currentTask = taskRecord
    ctx.agentTasks = ctx.agentTasks || {}
    ctx.agentTasks[agentId] = taskRecord

    executeTaskProcess(targetRepo, engine, execPrompt, taskRecord, (result) => {
      taskRecord.status = 'completed'
      taskRecord.completedTime = Date.now()
      const cleanOutput = stripAnsi(result.output).trim()
      taskRecord.resultSummary =
        cleanOutput.length > 1200
          ? `${cleanOutput.slice(0, 1100)}\n\n...（更多內容可點擊即時觀看按鈕查看）`
          : cleanOutput || '任務已順利完成'
      taskRecord.diffSummary = result.diffSummary || ''
    })

    const statusHeader = formatStatusHeader(targetRepo, engine)
    const taskMsg = {
      type: 'text',
      text: `${statusHeader}\n\n🚀【任務已啟動】${agentId} ${modelMeta.icon} ${modelMeta.name}\n指示：${prompt}${ctx.lastUploadedFile ? `\n📄 附帶文件：${ctx.lastUploadedFile.fileName}` : ''}\n\n任務正在背景運行中。隨時點擊下方按鈕或在群內發言，免費取得關鍵進度與待決策事項：`,
      quickReply: getStandardQuickReplies(ctx, liveCliUrl, groupId, { showLiveView: false })
    }
    await sendLineReply(replyToken, [taskMsg], targetRepo, agentId)

    return { handled: true, action: 'task_started', taskId: taskRecord.id }
  }

  async function startDiscussionTask(targetId, replyToken, prompt, ctx, groupId) {
    const startTime = Date.now()
    const targetRepo = boundRepos[ctx.currentRepoIndex] || boundRepos[0]
    const liveCliUrl = `${baseUrl}/s/${sessionId}?token=${sessionToken}`
    const taskRecord = {
      id: `task-${Date.now()}`,
      prompt,
      agentId: '@1 @2',
      engine: 'discussion',
      targetRepo,
      status: 'running',
      startTime,
      completedTime: null,
      latestOutput: '',
      resultSummary: '',
      diffSummary: ''
    }
    ctx.currentTask = taskRecord
    ctx.agentTasks = ctx.agentTasks || {}
    ctx.agentTasks['@1'] = taskRecord
    ctx.agentTasks['@2'] = taskRecord

    runTaskAsync(targetRepo, 'claude', `請針對 ${prompt} 提出架構方案`, taskRecord).then((res1) => {
      taskRecord.latestOutput += '\n[Claude 方案完成，GPT 6 Sol 審查中...]\n'
      return runTaskAsync(
        targetRepo,
        'gpt',
        `請針對以下架構方案進行代碼審查與邊緣案例補充：\n${res1.output.slice(-800)}`,
        taskRecord
      ).then((res2) => {
        taskRecord.status = 'completed'
        taskRecord.completedTime = Date.now()
        const clean1 = stripAnsi(res1.output).trim()
        const clean2 = stripAnsi(res2.output).trim()
        const brief1 = clean1.length > 500 ? `${clean1.slice(0, 480)}...` : clean1 || '架構規劃完成'
        const brief2 = clean2.length > 500 ? `${clean2.slice(0, 480)}...` : clean2 || '邊界審查通過'
        taskRecord.resultSummary = `1️⃣ Agent 1 (Claude Opus 5.5) 方案：\n${brief1}\n\n2️⃣ Agent 2 (GPT 6 Sol) 審查：\n${brief2}`
      })
    })

    const statusHeader = formatStatusHeader(targetRepo, ctx.currentModel)
    const discMsg = {
      type: 'text',
      text: `${statusHeader}\n\n⚖️【多 Agent 協商已受理】\n議題：${prompt}\n\n1️⃣ Agent 1 與 2️⃣ Agent 2 正在交叉審查討論中。隨時點擊下方按鈕或在群內發言，免費取得協商成果與待決策事項：`,
      quickReply: getStandardQuickReplies(ctx, liveCliUrl, groupId, { showLiveView: false })
    }
    await sendLineReply(replyToken, [discMsg], targetRepo, '@1')

    return { handled: true, action: 'discussion_started', taskId: taskRecord.id }
  }

  async function startNaturalChat(targetId, replyToken, text, ctx, groupId) {
    const targetRepo = boundRepos[ctx.currentRepoIndex] || boundRepos[0]
    const repoMeta = getRepoMeta(targetRepo)
    const currentModelMeta = getModelMeta(ctx.currentModel)
    const liveCliUrl = `${baseUrl}/s/${sessionId}?token=${sessionToken}`

    const brainRes = await geminiBrain.chat({
      groupId: groupId || targetId,
      text,
      activeRepo: {
        name: repoMeta.name,
        path: targetRepo,
        branch: repoMeta.branch || 'main'
      },
      currentModel: `${currentModelMeta.name} (${currentModelMeta.tier})`,
      lastUploadedFile: ctx.lastUploadedFile,
      boundRepos
    })

    const statusHeader = formatStatusHeader(targetRepo, ctx.currentModel)
    const replyBody = `${statusHeader}\n\n${brainRes.text}`
    const quickReplies = getStandardQuickReplies(ctx, liveCliUrl, groupId, { showLiveView: false })

    await replyText(replyToken, replyBody, quickReplies, targetRepo)

    return { handled: true, action: 'gemini_natural_chat', reply: brainRes.text }
  }

  function executeTaskProcess(targetRepo, engine, prompt, taskRecord, onDone) {
    if (executor) {
      executor(targetRepo, engine, prompt, (res) => {
        if (taskRecord) {
          taskRecord.latestOutput = res.output || ''
        }
        if (broadcast) {
          broadcast({ text: res.output || '', done: true })
        }
        onDone(res)
      })
      return
    }
    const resolveBin = (p, fallback) => (fs.existsSync(p) ? p : fallback)
    const cmdMap = {
      claude: {
        cmd: resolveBin('/Users/cis2042/.local/bin/claude', 'claude'),
        args: ['-p', prompt, '--dangerously-skip-permissions']
      },
      gemini: {
        cmd: resolveBin('/opt/homebrew/bin/gemini', 'gemini'),
        args: ['-p', prompt, '--skip-trust', '--approval-mode', 'yolo']
      },
      gpt: { cmd: resolveBin('/opt/homebrew/bin/codex', 'codex'), args: ['exec', prompt] }
    }
    const { cmd, args } = cmdMap[engine] || cmdMap.claude
    const customPath = `/Users/cis2042/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`

    try {
      if (broadcast) {
        const repoMeta = getRepoMeta(targetRepo)
        const modelMeta = getModelMeta(engine)
        const cmdText = `$ ${path.basename(cmd)} ${args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`
        broadcast({
          status: 'running',
          agent: taskRecord?.agentId || '@1',
          repo: repoMeta.name,
          repoPath: targetRepo,
          branch: repoMeta.branch || 'main',
          model: modelMeta.key,
          modelName: `${modelMeta.name} (${modelMeta.tier})`,
          modelQuota: `${modelMeta.statusLight} ${modelMeta.statusText}`,
          modelIcon: modelMeta.icon,
          modelIconFile: modelMeta.iconFile,
          text: `\n[任務啟動] ${taskRecord?.agentId || '@1'} ${modelMeta.name} @ ${repoMeta.name}\n${cmdText}\n${'─'.repeat(45)}\n`
        })
      }
      const child = spawn(cmd, args, {
        cwd: targetRepo,
        env: { ...process.env, PATH: customPath, CI: 'true' },
        stdio: ['ignore', 'pipe', 'pipe']
      })

      let output = ''
      let runningSec = 0
      const heartbeatTimer = setInterval(() => {
        runningSec += 3
        if (broadcast) {
          broadcast({
            heartbeat: true,
            status: 'running',
            text: `[${taskRecord?.agentId || '@1'} 檢索與分析代碼庫中... ${runningSec}s]\n`
          })
        }
      }, 3000)

      child.stdout.on('data', (d) => {
        const str = d.toString('utf8')
        output += str
        if (taskRecord) {
          taskRecord.latestOutput = output
        }
        if (broadcast) {
          broadcast({ text: str })
        }
      })

      child.stderr.on('data', (d) => {
        const str = d.toString('utf8')
        output += str
        if (taskRecord) {
          taskRecord.latestOutput = output
        }
        if (broadcast) {
          broadcast({ text: str })
        }
      })

      child.on('close', (code) => {
        clearInterval(heartbeatTimer)
        let diffSummary = ''
        try {
          diffSummary = execSync('git status --short', { cwd: targetRepo, encoding: 'utf8' }).trim()
        } catch {}
        if (broadcast) {
          broadcast({
            text: `\n${'─'.repeat(45)}\n[進程結束: 狀態碼 ${code ?? 0}]${diffSummary ? `\n📊 Git 異動:\n${diffSummary}` : ''}\n`,
            done: true,
            diff: diffSummary,
            status: 'completed'
          })
        }
        onDone({ output, diffSummary })
      })

      child.on('error', (err) => {
        clearInterval(heartbeatTimer)
        if (broadcast) {
          broadcast({ text: `\n[進程異常] ${err.message}\n`, done: true, status: 'completed' })
        }
        onDone({ output: `Error: ${err.message}`, diffSummary: '' })
      })
    } catch (e) {
      if (broadcast) {
        broadcast({ text: `\n[系統異常] ${e.message}\n`, done: true, status: 'completed' })
      }
      onDone({ output: `Spawn failure: ${e.message}`, diffSummary: '' })
    }
  }

  async function sendDeployNotification(to, info = {}) {
    const text = `🚀【CI/CD 部署通報】\n專案：${info.repo || 'twin3'}\n狀態：${info.status || 'Success'}\nCommit：${info.commit || 'HEAD'}${info.message ? `\n說明：${info.message}` : ''}${info.url ? `\n連結：${info.url}` : ''}`
    return sendLinePush(to, [{ type: 'text', text: text.trim() }])
  }

  return {
    verifySignature: (body, sig) => checkSignature(body, sig, channelSecret),
    handleWebhookEvent,
    getContext,
    getBrain: () => geminiBrain,
    getActiveRepoIndex: () => activeRepoIndex,
    getActiveModel: () => activeModel,
    getPushApiLogs: () => pushApiCallLogs,
    getReplyApiLogs: () => replyApiCallLogs,
    sendDeployNotification,
    generateGroupCliTicket: (gid) => ticketManager.generateTicket(gid),
    validateGroupTicket: (tk) => ticketManager.validateTicket(tk),
    hasGroupLock: () => allowedGroups.size > 0,
    getAllowedGroups: () => Array.from(allowedGroups),
    setBaseUrl: (url) => {
      baseUrl = url
    }
  }
}
