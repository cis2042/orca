const DEFAULT_POLL_INTERVAL_MS = 10000
const DEFAULT_PROGRESS_INTERVAL_MS = 3000
const REQUEST_TIMEOUT_MS = 15000

export function createCloudAgentRunner(options = {}) {
  const baseUrl = String(options.baseUrl || '').replace(/\/+$/, '')
  const token = options.token || ''
  const runTask = options.runTask
  const fetchImpl = options.fetchImpl || fetch
  const intervalMs = options.intervalMs || DEFAULT_POLL_INTERVAL_MS
  const progressIntervalMs = options.progressIntervalMs || DEFAULT_PROGRESS_INTERVAL_MS
  const logger = options.logger || console
  const inFlight = new Map()
  const unsentCompletions = new Map()
  let timer = null
  let polling = false

  async function request(pathname, init = {}) {
    const res = await fetchImpl(`${baseUrl}${pathname}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
    if (!res.ok) {
      throw new Error(`${init.method || 'GET'} ${pathname} -> ${res.status}`)
    }
    return res.json()
  }

  async function reportCompletion(taskId, output) {
    try {
      await request(`/api/agent/tasks/${encodeURIComponent(taskId)}/complete`, {
        method: 'POST',
        body: JSON.stringify({ output })
      })
      unsentCompletions.delete(taskId)
    } catch (e) {
      unsentCompletions.set(taskId, output)
      logger.log(`[cloud-runner] 回報任務 ${taskId} 失敗，稍後重試: ${e.message}`)
    }
  }

  function createProgressPublisher(taskId) {
    let latest = null
    let sent = null
    const flush = async () => {
      if (latest === null || latest === sent) {
        return
      }
      const snapshot = latest
      try {
        await request(`/api/agent/tasks/${encodeURIComponent(taskId)}/output`, {
          method: 'POST',
          body: JSON.stringify({ output: snapshot })
        })
        sent = snapshot
      } catch (e) {
        logger.log(`[cloud-runner] 同步 CLI 畫面失敗 ${taskId}: ${e.message}`)
      }
    }
    const timer = setInterval(flush, progressIntervalMs)
    return {
      update(screen) {
        latest = screen
      },
      async close() {
        clearInterval(timer)
        await flush()
      }
    }
  }

  function startTask(task) {
    logger.log(
      `[cloud-runner] 認領任務 ${task.id} ${task.agentId} ${task.engine || ''} @ ${task.repoKey}: ${task.text}`
    )
    const progress = createProgressPublisher(task.id)
    const execution = Promise.resolve()
      .then(() => runTask(task, { onProgress: progress.update }))
      .then(
        (result) => {
          if (result?.screen) {
            progress.update(result.screen)
          }
          return result?.output || '任務已完成'
        },
        (e) => `任務執行失敗: ${e.message}`
      )
      .then(async (output) => {
        await progress.close()
        await reportCompletion(task.id, output)
      })
      .finally(() => inFlight.delete(task.id))
    inFlight.set(task.id, execution)
  }

  async function pollOnce() {
    if (polling) {
      return { skipped: true }
    }
    polling = true
    try {
      for (const [taskId, output] of unsentCompletions) {
        await reportCompletion(taskId, output)
      }
      const body = await request('/api/agent/tasks')
      const tasks = Array.isArray(body.tasks) ? body.tasks : []
      for (const task of tasks) {
        if (!inFlight.has(task.id)) {
          startTask(task)
        }
      }
      return { claimed: tasks.length }
    } catch (e) {
      logger.log(`[cloud-runner] 輪詢失敗: ${e.message}`)
      return { error: e.message }
    } finally {
      polling = false
    }
  }

  return {
    pollOnce,
    start() {
      if (!timer) {
        pollOnce()
        timer = setInterval(pollOnce, intervalMs)
      }
    },
    stop() {
      clearInterval(timer)
      timer = null
    },
    waitForIdle: () => Promise.all(inFlight.values()),
    getInFlightCount: () => inFlight.size,
    getUnsentCount: () => unsentCompletions.size
  }
}

export function createCloudRunnerFromEnv(env, lineBot, overrides = {}) {
  if (!env.BRIDGE_CLOUD_URL || !env.BRIDGE_AGENT_TOKEN) {
    return null
  }
  return createCloudAgentRunner({
    baseUrl: env.BRIDGE_CLOUD_URL,
    token: env.BRIDGE_AGENT_TOKEN,
    runTask: (task, hooks) => lineBot.runRemoteTask(task, hooks),
    ...overrides
  })
}
