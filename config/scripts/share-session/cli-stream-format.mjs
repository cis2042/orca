const MAX_TOOL_SUMMARY = 160
const MAX_RESULT_LINES = 4

function clip(text, max) {
  const value = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  return value.length > max ? `${value.slice(0, max)}…` : value
}

function summarizeToolInput(input = {}) {
  const primary =
    input.command ||
    input.file_path ||
    input.pattern ||
    input.url ||
    input.query ||
    input.description
  return clip(primary || JSON.stringify(input), MAX_TOOL_SUMMARY)
}

function summarizeToolResult(content) {
  const text = Array.isArray(content)
    ? content.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('\n')
    : String(content ?? '')
  const lines = text.split('\n').filter((line) => line.trim())
  const shown = lines.slice(0, MAX_RESULT_LINES).map((line) => clip(line, MAX_TOOL_SUMMARY))
  const more =
    lines.length > MAX_RESULT_LINES ? [`… 另有 ${lines.length - MAX_RESULT_LINES} 行`] : []
  return [...shown, ...more]
}

export function formatClaudeStreamEvent(event) {
  if (!event || typeof event !== 'object') {
    return { lines: [] }
  }
  if (event.type === 'system' && event.subtype === 'init') {
    return { lines: [`▶ Claude Code 啟動${event.model ? `（${event.model}）` : ''}`] }
  }
  if (event.type === 'assistant') {
    const lines = []
    for (const part of event.message?.content || []) {
      if (part.type === 'text' && part.text?.trim()) {
        lines.push(part.text.trim())
      } else if (part.type === 'tool_use') {
        lines.push(`⏺ ${part.name}(${summarizeToolInput(part.input)})`)
      }
    }
    return { lines }
  }
  if (event.type === 'user') {
    const lines = []
    for (const part of event.message?.content || []) {
      if (part.type === 'tool_result') {
        const marker = part.is_error ? '  ⎿ ❌ ' : '  ⎿ '
        const resultLines = summarizeToolResult(part.content)
        resultLines.forEach((line, idx) =>
          lines.push(idx === 0 ? `${marker}${line}` : `     ${line}`)
        )
        if (resultLines.length === 0) {
          lines.push(`${marker}（無輸出）`)
        }
      }
    }
    return { lines }
  }
  if (event.type === 'result') {
    const seconds = event.duration_ms ? Math.round(event.duration_ms / 1000) : 0
    const status = event.is_error ? '❌ 失敗' : '✅ 完成'
    const turns = event.num_turns ? `${event.num_turns} 回合，` : ''
    return {
      lines: ['', `━━ ${status}（${turns}${seconds}s）━━`],
      finalResult: String(event.result ?? '').trim(),
      isError: Boolean(event.is_error)
    }
  }
  return { lines: [] }
}

export function createClaudeStreamParser() {
  let buffer = ''
  const screen = []
  let finalResult = null
  let isError = false

  function consumeLine(line) {
    if (!line.trim()) {
      return
    }
    let event
    try {
      event = JSON.parse(line)
    } catch {
      screen.push(line)
      return
    }
    const formatted = formatClaudeStreamEvent(event)
    screen.push(...formatted.lines)
    if (formatted.finalResult !== undefined) {
      finalResult = formatted.finalResult
      isError = formatted.isError
    }
  }

  return {
    push(chunk) {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop()
      lines.forEach(consumeLine)
    },
    end() {
      consumeLine(buffer)
      buffer = ''
    },
    getScreen: () => screen.join('\n'),
    getFinalResult: () => finalResult,
    isError: () => isError
  }
}
