export const repoMetaMap = {
  'agent-id': { name: 'xagent.id', icon: 'Ag', iconFile: 'xagent.png' },
  XHuman_ID: { name: 'xhuman.id', icon: 'Hu', iconFile: 'xhuman.png' },
  'twin3-sdk': { name: 'twin3.sdk', icon: 'T3', iconFile: 'twin3.png' },
  twin3_bitbee: { name: 'bitbee', icon: 'Be', iconFile: 'bitbee.png' }
}

export const modelMetaMap = {
  claude: {
    key: 'claude',
    name: 'Claude Opus 5.5',
    short: 'Claude Opus',
    tier: 'Medium',
    icon: '✳️',
    iconFile: 'claude.png',
    statusLight: '🟢',
    statusText: '額度正常',
    prefix: '@1',
    engineCmd: 'claude'
  },
  gpt: {
    key: 'gpt',
    name: 'GPT 6 Sol',
    short: 'GPT 6 Sol',
    tier: 'Medium',
    icon: '⚛️',
    iconFile: 'gpt.png',
    statusLight: '🟢',
    statusText: '額度正常',
    prefix: '@2',
    engineCmd: 'gpt'
  },
  gemini: {
    key: 'gemini',
    name: 'Gemini 3.8 Flash',
    short: 'Gemini 3.8',
    tier: 'Medium',
    icon: '✨',
    iconFile: 'gemini.png',
    statusLight: '🟢',
    statusText: '額度正常',
    prefix: '@3',
    engineCmd: 'gemini'
  }
}

export function getRepoMeta(repoPath) {
  const base = repoPath.split('/').pop()
  return repoMetaMap[base] || { name: base, icon: '📦', iconFile: 'xagent.png' }
}

export const agentMetaMap = {
  '@1': { name: 'Agent 1', icon: '1️⃣', iconFile: 'agent-1.png', modelKey: 'claude' },
  '@2': { name: 'Agent 2', icon: '2️⃣', iconFile: 'agent-2.png', modelKey: 'gpt' },
  '@3': { name: 'Agent 3', icon: '3️⃣', iconFile: 'agent-3.png', modelKey: 'gemini' }
}

export function getAgentMeta(agentId) {
  return agentMetaMap[agentId] || agentMetaMap['@1']
}

export function getMessageSender(repoPath, baseUrl, agentId) {
  if (agentId && agentMetaMap[agentId]) {
    const aMeta = agentMetaMap[agentId]
    const isHttps = baseUrl && baseUrl.startsWith('https://')
    const iconUrl = isHttps
      ? `${baseUrl}/icons/${aMeta.iconFile}`
      : `https://raw.githubusercontent.com/twin3/brand/main/icons/${aMeta.iconFile}`
    return {
      name: aMeta.name,
      iconUrl
    }
  }
  const meta = getRepoMeta(repoPath)
  const iconFile = meta.iconFile || 'xagent.png'
  const isHttps = baseUrl && baseUrl.startsWith('https://')
  const iconUrl = isHttps
    ? `${baseUrl}/icons/${iconFile}`
    : `https://raw.githubusercontent.com/twin3/brand/main/icons/${iconFile}`
  return {
    name: meta.name.slice(0, 20),
    iconUrl
  }
}

export function getModelMeta(modelKey) {
  return modelMetaMap[modelKey] || modelMetaMap.claude
}

export function makeQuickReplyRepos(boundRepos) {
  const items = boundRepos.map((repo, idx) => {
    const meta = getRepoMeta(repo)
    return {
      type: 'action',
      action: {
        type: 'message',
        label: `${meta.icon} ${meta.name}`,
        text: `/set_repo ${idx}`
      }
    }
  })
  return { items }
}

export function makeQuickReplyModels() {
  return {
    items: [
      {
        type: 'action',
        action: { type: 'message', label: '🟢 ✳️ Claude Opus 5.5', text: '/set_model claude' }
      },
      {
        type: 'action',
        action: { type: 'message', label: '🟢 ⚛️ GPT 6 Sol', text: '/set_model gpt' }
      },
      {
        type: 'action',
        action: { type: 'message', label: '🟢 ✨ Gemini 3.8 Flash', text: '/set_model gemini' }
      }
    ]
  }
}

export function formatStatusHeader(repoPath, modelKey) {
  const repoMeta = getRepoMeta(repoPath)
  const modelMeta = getModelMeta(modelKey)
  return `📌 當前環境：${repoMeta.icon} ${repoMeta.name} | ${modelMeta.statusLight} ${modelMeta.icon} ${modelMeta.name}`
}

export function makeImagemapLiveView(baseUrl, targetCliUrl) {
  return {
    type: 'imagemap',
    baseUrl: `${baseUrl}/imagemap/live-stream`,
    altText: '🖥️ 即時觀看終端串流（點擊開啟）',
    baseSize: {
      width: 1040,
      height: 480
    },
    actions: [
      {
        type: 'uri',
        linkUri: targetCliUrl,
        area: {
          x: 0,
          y: 0,
          width: 1040,
          height: 480
        }
      }
    ]
  }
}

export function makeStandardQuickReplies(
  ctx,
  liveCliUrl,
  groupId,
  boundRepos,
  generateGroupCliTicket,
  options = {}
) {
  const items = [
    {
      type: 'action',
      action: { type: 'message', label: '🔄 查看進度', text: '/progress' }
    },
    {
      type: 'action',
      action: { type: 'message', label: 'Agent 1', text: '@1 狀態' }
    },
    {
      type: 'action',
      action: { type: 'message', label: 'Agent 2', text: '@2 狀態' }
    },
    {
      type: 'action',
      action: { type: 'message', label: 'Agent 3', text: '@3 狀態' }
    }
  ]
  if (options.showLiveView && liveCliUrl) {
    const ticket = groupId && generateGroupCliTicket ? generateGroupCliTicket(groupId) : ''
    const targetUri = ticket ? `${liveCliUrl}&ticket=${ticket}` : liveCliUrl
    items.push({
      type: 'action',
      action: { type: 'uri', label: '🖥️ 即時觀看', uri: targetUri }
    })
  }
  return { items }
}

export function makeProgressFlexMessage(task, repoMeta, modelMeta, targetCliUrl) {
  const totalSec = Math.round((task.completedTime - task.startTime) / 1000)
  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: `🟢 進度已經更新 [${task.agentId} ${modelMeta.icon} ${modelMeta.name}]`,
          weight: 'bold',
          color: '#3fb950',
          size: 'md'
        },
        {
          type: 'text',
          text: `總耗時: ${totalSec}s | 專案: ${repoMeta.icon} ${repoMeta.name}`,
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
          text: '📝 執行成果：',
          weight: 'bold',
          size: 'xs',
          color: '#58a6ff'
        },
        {
          type: 'text',
          text: task.resultSummary || '任務已順利執行完成。',
          size: 'sm',
          color: '#f0f6fc',
          wrap: true,
          margin: 'sm'
        },
        ...(task.diffSummary
          ? [
              {
                type: 'text',
                text: `\n📦 檔案變更：\n${task.diffSummary}`,
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
            label: '🖥️ 即時觀看終端紀錄',
            uri: targetCliUrl
          }
        }
      ]
    }
  }
}

export function makeFileQuickReplies(fileName, targetCliUrl) {
  return {
    items: [
      {
        type: 'action',
        action: {
          type: 'message',
          label: '✳️ @1 依此規劃',
          text: `@1 請依據最新上傳的 ${fileName} 規劃架構與需求對齊`
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '⚛️ @2 依此審查',
          text: `@2 請針對 ${fileName} 進行架構與邊界審查`
        }
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '✨ @3 依此實作',
          text: `@3 依據 ${fileName} 實作代碼與測試`
        }
      },
      { type: 'action', action: { type: 'message', label: '🔄 查看進度', text: '/progress' } },
      { type: 'action', action: { type: 'uri', label: '🖥️ 即時觀看', uri: targetCliUrl } }
    ]
  }
}

export const helpCommandText = `⚡ Twin3 多 Agent 協作指令清單：

【當前環境狀態】
• 每則訊息常駐提示當前專案與模型狀態燈號
• /project：切換 4 大專案（🪪 xagent.id, 👤 xhuman.id, ⚡ twin3.sdk, 🐝 bitbee）
• /model：挑選模型引擎（🟢 ✳️ Claude Opus 5.5, 🟢 ⚛️ GPT 6 Sol, 🟢 ✨ Gemini 3.8 Flash）

【Agent 指揮派工（支援多 Agent 並行）】
• @1 <任務>：指派給 Agent 1（Claude Opus 5.5）
• @2 <任務>：指派給 Agent 2（GPT 6 Sol）
• @3 <任務>：指派給 Agent 3（Gemini 3.8 Flash）
• 未指派時 Agent 處於待命狀態；可在同一環境中連續使用 @1、@2 分別派工

【真實進度與即時觀看】
• 點擊「🔄 查看進度」：由 Gemini 語言模型即時檢視遠端活躍 session、PR 與各大專案 Git 狀態並產出綜整回報（0 推播費用）
• @1 狀態、@2 狀態、@3 狀態：查詢該 Agent 當前背景執行進度
• 任務啟動後會提供專屬 Imagemap 畫面進入即時終端觀看

【自然語言交談與群組長效智力】
• 在群內直接發言提問、討論技術方案或諮詢專案，Gemini 智慧大腦將結合長時間對話記憶與專案脈絡深入回覆
• /clear：清除本群組長效對話記憶`
