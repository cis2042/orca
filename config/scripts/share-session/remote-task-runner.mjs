import path from 'node:path'
import { stripAnsi } from './line-transport.mjs'

const ENGINE_BY_AGENT = { '@1': 'claude', '@2': 'gpt', '@3': 'gemini' }

export function createRemoteTaskRunner({ boundRepos, getContext, executeTaskProcess }) {
  function resolveRepoPath(repoKey) {
    return boundRepos.find((repoPath) => path.basename(repoPath) === repoKey) || boundRepos[0]
  }

  return function runRemoteTask({ id, agentId, text, repoKey }) {
    const targetRepo = resolveRepoPath(repoKey)
    const engine = ENGINE_BY_AGENT[agentId] || 'claude'
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
      resultSummary: '',
      diffSummary: ''
    }
    const ctx = getContext('cloud')
    ctx.currentTask = taskRecord
    ctx.agentTasks[agentId] = taskRecord
    return new Promise((resolve) => {
      executeTaskProcess(targetRepo, engine, text, taskRecord, (result) => {
        taskRecord.status = 'completed'
        taskRecord.completedTime = Date.now()
        const cleanOutput = stripAnsi(result.output || '').trim()
        taskRecord.resultSummary = cleanOutput || '任務已順利完成'
        taskRecord.diffSummary = result.diffSummary || ''
        const diffBlock = taskRecord.diffSummary
          ? `\n\n📊 Git 異動:\n${taskRecord.diffSummary}`
          : ''
        resolve({ output: `${taskRecord.resultSummary}${diffBlock}` })
      })
    })
  }
}
