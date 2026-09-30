import fs from 'node:fs'
import path from 'node:path'

export function createGeminiBrain(options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY || ''
  const modelName = options.modelName || 'gemini-2.5-flash'
  const memoryFilePath =
    options.memoryFilePath ||
    path.join(path.dirname(new URL(import.meta.url).pathname), '.gemini-brain-memory.json')

  let memoryData = { groups: {} }

  try {
    if (fs.existsSync(memoryFilePath)) {
      const raw = fs.readFileSync(memoryFilePath, 'utf8')
      memoryData = JSON.parse(raw || '{"groups":{}}')
    }
  } catch {}

  function persistMemory() {
    try {
      fs.writeFileSync(memoryFilePath, JSON.stringify(memoryData, null, 2), 'utf8')
    } catch {}
  }

  function getGroupMemory(groupId) {
    const gid = groupId || 'default'
    if (!memoryData.groups[gid]) {
      memoryData.groups[gid] = {
        history: [],
        lastActive: Date.now()
      }
    }
    return memoryData.groups[gid]
  }

  function buildSystemPrompt(context = {}) {
    const { activeRepo, currentModel, lastUploadedFile, boundRepos = [] } = context
    const repoList = boundRepos.map((r) => r.split('/').pop()).join(', ')

    let fileContext = '無'
    if (lastUploadedFile) {
      fileContext = `檔名: ${lastUploadedFile.fileName}, 大小: ${lastUploadedFile.fileSize} bytes\n內容摘要:\n${lastUploadedFile.content.slice(0, 800)}`
    }

    return `你是「Twin3 矩陣協同大腦（Twin3 Agentic Brain）」，專為 Ming 及其團隊提供全天候深度智力的群組對話助手與指揮核心。

【你的性格與角色】
• 使用親切、精準、專業的繁體中文回應。
• 你具備長時間連續對話記憶（Long-term Intelligence Brain），深刻理解團隊討論的上下文、業務脈絡與工程細節。
• 熟悉 Twin3 四大核心專案：
  1. 🪪 xagent.id: 自主 AI Agent 身份協議、ERC-8004 機器身分憑證、Web MCP 自動發現與 A2A 通訊。
  2. 👤 xhuman.id: 生物特徵人類數位身分、零知識證明、去中心化真實身分憑據。
  3. ⚡ twin3.sdk: Twin3 核心 SDK，提供極速 Agentic 通訊與跨鏈調用架構。
  4. 🐝 bitbee: Web3 移動賺幣與任務應用，整合 IMEI 裝置驗證、LINE Points 與 USDT 回饋。

【當前運行即時環境】
• 當前鎖定專案: ${activeRepo ? `${activeRepo.name} (${activeRepo.branch || 'main'})` : 'xagent.id'}
• 專案路徑: ${activeRepo?.path || '/Users/cis2042/APP/agent-id'}
• 當前設定模型: ${currentModel || 'Claude Opus 5.5 (Medium)'}
• 最新上傳檔案上下文: ${fileContext}
• 系統已綁定專案清單: ${repoList || 'xagent.id, xhuman.id, twin3.sdk, bitbee'}

【回覆準則】
1. 嚴格貫徹全中文原則：所有英文內容（包括 PR 標題、Git Commit、任務狀態與錯誤訊息）一律翻譯為專業流暢的繁體中文，保留專案識別碼、PR 編號與數值。
2. 若用戶在群組內一般對話、探討架構或詢問專案細節：結合歷史對話與專案專業知識深入解答，簡明扼要。
3. 若用戶提及要修改代碼、執行測試或調查問題：先理解需求，給出你的架構判斷或建議，並主動提示用戶可隨時發送「@1 任務...」由 Claude Opus 規劃，或發送「@2」由 GPT 6 Sol 實作，或點擊下方快捷按鈕。
4. 語氣自然、專業、富同理心且具建設性。不需多餘的客套廢話。`
  }

  async function chat(params = {}) {
    const { groupId, text, activeRepo, currentModel, lastUploadedFile, boundRepos } = params
    if (!apiKey) {
      return {
        text: `🧠【Twin3 智慧大腦】已收到您的訊息：「${text}」\n（提示：請配置 GEMINI_API_KEY 以啟用完整自然對話智力）`,
        raw: null
      }
    }

    const groupMem = getGroupMemory(groupId)
    const systemPrompt = buildSystemPrompt({
      activeRepo,
      currentModel,
      lastUploadedFile,
      boundRepos
    })

    groupMem.history.push({
      role: 'user',
      parts: [{ text }]
    })

    if (groupMem.history.length > 20) {
      groupMem.history = groupMem.history.slice(-20)
    }

    const contents = groupMem.history.map((h) => ({
      role: h.role,
      parts: h.parts
    }))

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        thinkingConfig: { thinkingBudget: 0 }
      }
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000)
      })

      if (!res.ok) {
        const errText = await res.text()
        return {
          text: `🧠【Twin3 智慧大腦】我理解您的需求，目前正在消化上下文。您可輸入「@1 ${text}」直接指派 AI 執行，或點擊下方查看進度。`,
          error: errText
        }
      }

      const data = await res.json()
      const replyText =
        data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        '🧠【Twin3 智慧大腦】已接收並理解您的對話脈絡。'

      groupMem.history.push({
        role: 'model',
        parts: [{ text: replyText }]
      })
      groupMem.lastActive = Date.now()
      persistMemory()

      return {
        text: replyText,
        raw: data
      }
    } catch (e) {
      return {
        text: `🧠【Twin3 智慧大腦】已接收您的訊息：「${text}」。\n系統目前正持續監控專案狀態，您隨時可輸入 @1、@2 分派核心任務或發送 /help 查閱指令。`,
        error: e.message
      }
    }
  }

  function clearMemory(groupId) {
    if (groupId && memoryData.groups[groupId]) {
      delete memoryData.groups[groupId]
    } else {
      memoryData.groups = {}
    }
    persistMemory()
  }

  async function summarizeRemoteProgress(data = {}) {
    const { projects = [], openPrs = [], recentTask = null } = data

    const projectSections = []
    if (Array.isArray(projects) && projects.length > 0) {
      for (const p of projects) {
        const mergedLines =
          p.recentMerged && p.recentMerged.length > 0
            ? `${p.mergedCount || p.recentMerged.length} 個 PR 合入，其中 ${p.recentMerged.map((m) => `#${m.number}`).join(' ')} 已合入。`
            : '目前無近期合入記錄。'

        let openLines = '無待驗收 PR。'
        if (p.openPrs && p.openPrs.length > 0) {
          openLines = p.openPrs
            .map(
              (pr) =>
                `* #${pr.number} ${pr.title} (進度: ${pr.progress})${pr.url ? `\n  🔗 ${pr.url}` : ''}`
            )
            .join('\n')
        }

        projectSections.push(
          `${p.light} ${p.icon} ${p.name}　${p.tickets} 張票 · ${p.openCount} 個 PR\n現在到哪：${mergedLines}\n\n待驗收：\n${openLines}`
        )
      }
    } else if (Array.isArray(openPrs) && openPrs.length > 0) {
      const openLines = openPrs
        .map(
          (p) =>
            `* ${p.repo} #${p.number}: ${p.title} (進度: ${p.progress})${p.url ? `\n  🔗 ${p.url}` : ''}`
        )
        .join('\n')
      projectSections.push(`📋【Open PR 清單】\n${openLines}`)
    } else {
      projectSections.push('• 目前無 Open PR')
    }

    const fallbackText = projectSections.join('\n\n')

    if (!apiKey) {
      return fallbackText
    }

    const prompt = `請將以下專案數據整理成一份符合工程總監戰報標準的 LINE 回報。
約束條件（必須嚴格遵守）：
1. 嚴禁任何問候詞（嚴禁「Ming 您好」或任何稱呼）。
2. 嚴禁任何開場白、導言、說明或總結結尾。
3. 嚴禁提及「Orca Bridge」或「終端」。
4. 結構必須精確符合以下範例格式：
{燈號} {圖示} {專案名}　{票數} 張票 · {PR數} 個 PR
現在到哪：{簡潔描述合入進度、最新合入 PR 編號、關鍵特性}

待驗收：
* #{PR編號} {繁體中文核心功能說明} (進度: {進度數值})
  🔗 {GitHub URL}

5. 必須將所有內容（包含所有 PR 標題、英文詞彙與工作指示）一律翻譯為專業流暢的繁體中文。保留專案代碼、PR 編號（如 #1266）與進度數據。
6. 待驗收中列出的每一條 open PR 都必須附上對應的 GitHub 連結（url）。
7. 若有多個專案（如 xAgent.id、xHuman.id），請依序分區塊輸出，中間空一行。

數據：
專案與 PR 數據：
${JSON.stringify(projects.length > 0 ? projects : openPrs, null, 2)}

Session 最近執行：
${JSON.stringify(recentTask, null, 2)}`

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1200,
            thinkingConfig: { thinkingBudget: 0 }
          }
        }),
        signal: AbortSignal.timeout(10000)
      })
      if (res.ok) {
        const d = await res.json()
        let text = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (text) {
          text = text.replace(/^(Ming[，, ]*您好[！!，,\n]*|您好[！!，,\n]*)/i, '').trim()
          return text
        }
      }
    } catch {}

    return fallbackText
  }

  return {
    chat,
    summarizeRemoteProgress,
    clearMemory,
    getHistory: (groupId) => getGroupMemory(groupId).history,
    hasApiKey: () => Boolean(apiKey)
  }
}
