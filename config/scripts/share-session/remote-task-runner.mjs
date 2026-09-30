import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { stripAnsi } from './line-transport.mjs'
import { createClaudeStreamParser } from './cli-stream-format.mjs'

const ENGINE_BY_AGENT = { '@1': 'claude', '@2': 'gpt', '@3': 'gemini' }
const KNOWN_ENGINES = new Set(['claude', 'gpt', 'gemini'])
const MAX_PLAIN_OUTPUT = 30000

export function materializeAttachment(
  taskId,
  attachmentName,
  attachmentContent,
  baseDir = os.tmpdir()
) {
  if (!attachmentName || !attachmentContent) {
    return null
  }
  const safeName =
    path.basename(attachmentName).replace(/[^\p{L}\p{N}._-]/gu, '_') || 'attachment.txt'
  const dir = path.join(baseDir, 'twin3-line-attachments', path.basename(taskId))
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, safeName)
  fs.writeFileSync(filePath, attachmentContent, 'utf8')
  return filePath
}

export function buildTaskPrompt(text, attachmentName, attachmentPath) {
  if (!attachmentPath) {
    return text
  }
  return `【附件】使用者在 LINE 上傳了「${attachmentName}」，完整內容已存於：${attachmentPath}\n請先完整閱讀這個檔案，「上方的檔案」「這份 .md」等說法都是指它。\n\n【指示】${text}`
}

function resolveBin(preferredPath, fallback) {
  return fs.existsSync(preferredPath) ? preferredPath : fallback
}

export function buildEngineCommand(engine, prompt) {
  if (engine === 'gpt') {
    return { cmd: resolveBin('/opt/homebrew/bin/codex', 'codex'), args: ['exec', prompt] }
  }
  if (engine === 'gemini') {
    return {
      cmd: resolveBin('/opt/homebrew/bin/gemini', 'gemini'),
      args: ['-p', prompt, '--skip-trust', '--approval-mode', 'yolo']
    }
  }
  return {
    cmd: resolveBin('/Users/cis2042/.local/bin/claude', 'claude'),
    args: [
      '-p',
      prompt,
      '--output-format',
      'stream-json',
      '--verbose',
      '--dangerously-skip-permissions'
    ]
  }
}

function createPlainScreen() {
  let text = ''
  return {
    push(chunk) {
      text = stripAnsi(text + chunk).slice(-MAX_PLAIN_OUTPUT)
    },
    end() {},
    getScreen: () => text,
    getFinalResult: () => null,
    isError: () => false
  }
}

export function createRemoteTaskRunner({
  boundRepos,
  getContext,
  spawnImpl = spawn,
  attachmentDir
}) {
  function resolveRepoPath(repoKey) {
    return boundRepos.find((repoPath) => path.basename(repoPath) === repoKey) || boundRepos[0]
  }

  return function runRemoteTask(task, hooks = {}) {
    const {
      id,
      agentId,
      engine: requestedEngine,
      text,
      repoKey,
      attachmentName,
      attachmentContent
    } = task
    const targetRepo = resolveRepoPath(repoKey)
    const attachmentPath = materializeAttachment(
      id,
      attachmentName,
      attachmentContent,
      attachmentDir
    )
    const prompt = buildTaskPrompt(text, attachmentName, attachmentPath)
    const engine = KNOWN_ENGINES.has(requestedEngine)
      ? requestedEngine
      : ENGINE_BY_AGENT[agentId] || 'claude'
    const taskRecord = {
      id,
      prompt: text,
      agentId,
      engine,
      targetRepo,
      status: 'running',
      startTime: Date.now(),
      completedTime: null,
      latestOutput: '',
      resultSummary: ''
    }
    const ctx = getContext('cloud')
    ctx.currentTask = taskRecord
    ctx.agentTasks[agentId] = taskRecord

    const screen = engine === 'claude' ? createClaudeStreamParser() : createPlainScreen()
    const header = `$ ${engine} @ ${path.basename(targetRepo)}\n> ${text}\n${attachmentPath ? `📎 ${attachmentName} → ${attachmentPath}\n` : ''}`
    let stderrText = ''
    const publish = () => {
      taskRecord.latestOutput = `${header}\n${screen.getScreen()}`
      hooks.onProgress?.(taskRecord.latestOutput)
    }

    return new Promise((resolve) => {
      let settled = false
      const finish = (exitCode, extraLine = '') => {
        if (settled) {
          return
        }
        settled = true
        screen.end()
        const stderrTail = stripAnsi(stderrText).trim().split('\n').slice(-15).join('\n')
        const failed = exitCode !== 0 || screen.isError()
        const failureBlock = failed && stderrTail ? `\n\n[stderr]\n${stderrTail}` : ''
        const exitLine = `\n[進程結束: 狀態碼 ${exitCode}]${extraLine}`
        taskRecord.latestOutput = `${header}\n${screen.getScreen()}${failureBlock}${exitLine}`
        hooks.onProgress?.(taskRecord.latestOutput)
        taskRecord.status = 'completed'
        taskRecord.completedTime = Date.now()
        const finalResult = screen.getFinalResult() ?? screen.getScreen().trim()
        taskRecord.resultSummary =
          finalResult ||
          (failed ? `任務失敗（狀態碼 ${exitCode}）${failureBlock}` : '任務已順利完成')
        resolve({ output: taskRecord.resultSummary, screen: taskRecord.latestOutput })
      }

      let child
      try {
        const { cmd, args } = buildEngineCommand(engine, prompt)
        child = spawnImpl(cmd, args, {
          cwd: targetRepo,
          env: {
            ...process.env,
            PATH: `/Users/cis2042/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
            CI: 'true'
          },
          stdio: ['ignore', 'pipe', 'pipe']
        })
      } catch (e) {
        finish(1, `\n[啟動失敗] ${e.message}`)
        return
      }
      publish()
      child.stdout.on('data', (chunk) => {
        screen.push(chunk.toString('utf8'))
        publish()
      })
      child.stderr.on('data', (chunk) => {
        stderrText = (stderrText + chunk.toString('utf8')).slice(-8000)
        if (engine !== 'claude') {
          screen.push(chunk.toString('utf8'))
          publish()
        }
      })
      child.on('error', (err) => finish(1, `\n[進程異常] ${err.message}`))
      child.on('close', (code) => finish(code ?? 0))
    })
  }
}
