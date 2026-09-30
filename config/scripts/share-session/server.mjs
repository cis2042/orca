import http from 'node:http'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawn, execSync } from 'node:child_process'
import { createLineBotHandler } from './line-bot.mjs'

export function createShareGateway(options = {}) {
  const port = options.port || 3788
  const sessionId = options.sessionId || crypto.randomUUID()
  const token = options.token || crypto.randomBytes(16).toString('hex')
  const password = options.password || crypto.randomBytes(4).toString('hex')
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex')
  const boundRepos = (options.repos || [process.cwd()]).map((r) => path.resolve(r))

  const activeAuthTokens = new Set()
  const observerClients = new Set()
  let terminalBuffer = ''
  let currentTaskState = null

  function broadcastStream(data) {
    if (data.text) {
      terminalBuffer += data.text
      if (terminalBuffer.length > 250000) {
        terminalBuffer = terminalBuffer.slice(-200000)
      }
    }
    if (data.status || data.agent || data.repo || data.model) {
      currentTaskState = { ...currentTaskState, ...data }
    }
    const payload = `data: ${JSON.stringify(data)}\n\n`
    for (const client of observerClients) {
      try {
        client.write(payload)
      } catch {
        observerClients.delete(client)
      }
    }
  }

  const lineBot = createLineBotHandler({
    channelAccessToken:
      options.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: options.lineChannelSecret || process.env.LINE_CHANNEL_SECRET || '',
    allowedGroups:
      options.allowedGroups ||
      (process.env.LINE_ALLOWED_GROUPS ? process.env.LINE_ALLOWED_GROUPS.split(',') : []),
    boundRepos,
    baseUrl: options.baseUrl || `http://localhost:${port}`,
    sessionId,
    sessionToken: token,
    broadcast: broadcastStream
  })

  function getRepoMeta(repoPath) {
    const baseName = path.basename(repoPath)
    const aliasMap = {
      'agent-id': 'xagent.id',
      XHuman_ID: 'xhuman.id',
      'twin3-sdk': 'twin3.sdk',
      twin3_bitbee: 'bitbee'
    }
    const name = aliasMap[baseName] || baseName
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim()
      const commit = execSync('git log -1 --oneline', { cwd: repoPath, encoding: 'utf8' }).trim()
      const status = execSync('git status --porcelain', { cwd: repoPath, encoding: 'utf8' }).trim()
      return {
        path: repoPath,
        name,
        branch,
        commit,
        status: status ? `${status.split('\n').length} files changed` : 'Clean'
      }
    } catch {
      return { path: repoPath, name, branch: 'unknown', commit: '', status: 'Not a git repo' }
    }
  }

  function sanitizeEnv() {
    const cleanEnv = { ...process.env }
    return cleanEnv
  }

  const htmlContent = fs.readFileSync(
    path.join(path.dirname(new URL(import.meta.url).pathname), 'ui.html'),
    'utf8'
  )

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    const pathname = parsedUrl.pathname

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (
      pathname.startsWith('/imagemap/live-stream/') &&
      (req.method === 'GET' || req.method === 'HEAD')
    ) {
      const sizeParam = path.basename(pathname).replace(/\.png$/, '')
      const imagePath = path.join(
        path.dirname(new URL(import.meta.url).pathname),
        'assets',
        'imagemap',
        sizeParam
      )
      if (fs.existsSync(imagePath)) {
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400'
        })
        if (req.method === 'HEAD') {
          res.end()
          return
        }
        fs.createReadStream(imagePath).pipe(res)
        return
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Imagemap image not found')
      return
    }

    if (pathname.startsWith('/icons/') && (req.method === 'GET' || req.method === 'HEAD')) {
      const iconName = path.basename(pathname)
      const iconPath = path.join(
        path.dirname(new URL(import.meta.url).pathname),
        'assets',
        'icons',
        iconName
      )
      if (fs.existsSync(iconPath)) {
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400'
        })
        if (req.method === 'HEAD') {
          res.end()
          return
        }
        fs.createReadStream(iconPath).pipe(res)
        return
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Icon not found')
      return
    }

    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, timestamp: Date.now() }))
      return
    }

    if (pathname === `/s/${sessionId}`) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(htmlContent)
      return
    }

    if (pathname === `/api/s/${sessionId}/auth` && req.method === 'POST') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}')
          const submittedToken = payload.token
          const submittedPwd = payload.password
          const submittedTicket = payload.ticket || req.headers['x-group-ticket'] || ''
          const submittedHash = crypto
            .createHash('sha256')
            .update(submittedPwd || '')
            .digest('hex')

          if (lineBot.hasGroupLock() && !lineBot.validateGroupTicket(submittedTicket)) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(
              JSON.stringify({
                ok: false,
                blocked: true,
                error: '群外存取已被阻擋：Web CLI 僅限由授權 LINE 群組產生的連結存取'
              })
            )
            return
          }

          if (submittedToken !== token) {
            res.writeHead(403, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Token 無效或不匹配' }))
            return
          }

          if (submittedHash !== passwordHash) {
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: '密碼錯誤' }))
            return
          }

          const authToken = crypto.randomBytes(24).toString('hex')
          activeAuthTokens.add(authToken)

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, authToken }))
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: e.message }))
        }
      })
      return
    }

    if (pathname === '/api/line/webhook' && req.method === 'POST') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', async () => {
        try {
          const signature = req.headers['x-line-signature'] || ''
          if (!lineBot.verifySignature(body, signature)) {
            console.log('[LINE Webhook] 401 簽章無效')
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'Invalid signature' }))
            return
          }
          const payload = JSON.parse(body || '{}')
          const events = payload.events || []
          console.log(`[LINE Webhook] 收到事件數量: ${events.length}`)
          for (const ev of events) {
            console.log(
              `[LINE Webhook] 事件: ${ev.type}, 來源: ${JSON.stringify(ev.source)}, 內容: ${ev.message?.text || ev.message?.type || ''}`
            )
            const resAction = await lineBot.handleWebhookEvent(ev)
            console.log('[LINE Webhook] 處理結果:', resAction)
          }
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true }))
        } catch (e) {
          console.log(`[LINE Webhook] 異常: ${e.message}`)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: e.message }))
        }
      })
      return
    }

    if (pathname === '/api/line/notify-deploy' && req.method === 'POST') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}')
          const result = await lineBot.sendDeployNotification(payload.to, payload)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, result }))
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: e.message }))
        }
      })
      return
    }

    if (pathname === '/api/line/simulate' && req.method === 'POST') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}')
          const ev = {
            type: 'message',
            replyToken: `sim-reply-${crypto.randomUUID().slice(0, 8)}`,
            source: {
              groupId: payload.groupId || 'group-test-1',
              userId: payload.userId || 'user-test-1'
            },
            message: {
              type: 'text',
              text: payload.text || ''
            }
          }
          const result = await lineBot.handleWebhookEvent(ev)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              ok: true,
              result,
              replyLogs: lineBot.getReplyApiLogs(),
              pushLogs: lineBot.getPushApiLogs()
            })
          )
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: e.message }))
        }
      })
      return
    }

    const authHeader = req.headers['authorization'] || ''
    const reqToken = authHeader.replace(/^Bearer\s+/, '')
    const queryToken = parsedUrl.searchParams.get('token')
    const queryTicket = parsedUrl.searchParams.get('ticket') || req.headers['x-group-ticket'] || ''
    const hasValidTicket = queryTicket && lineBot.validateGroupTicket(queryTicket)
    const hasValidAuth =
      activeAuthTokens.has(reqToken) || Boolean(hasValidTicket) || queryToken === token

    if (pathname.startsWith(`/api/s/${sessionId}/`)) {
      const isBlocked = lineBot.hasGroupLock() && !hasValidTicket && queryToken !== token
      if (isBlocked) {
        res.writeHead(403, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            ok: false,
            blocked: true,
            error: '群外存取已被阻擋：Web CLI 僅限由授權 LINE 群組產生的連結存取'
          })
        )
        return
      }

      if (pathname === `/api/s/${sessionId}/live-stream`) {
        if (!hasValidAuth) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(
            JSON.stringify({
              ok: false,
              error: '未授權存取'
            })
          )
          return
        }

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive'
        })
        observerClients.add(res)
        res.write(
          `data: ${JSON.stringify({
            init: true,
            backlog: terminalBuffer,
            taskState: currentTaskState
          })}\n\n`
        )
        req.on('close', () => {
          observerClients.delete(res)
        })
        return
      }

      if (!hasValidAuth) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            ok: false,
            error: '未授權存取或密碼未解鎖'
          })
        )
        return
      }

      if (pathname === `/api/s/${sessionId}/status`) {
        const reposMeta = boundRepos.map(getRepoMeta)
        const currentRepoIdx = lineBot.getActiveRepoIndex ? lineBot.getActiveRepoIndex() : 0
        const activeRepo = reposMeta[currentRepoIdx] || reposMeta[0]
        const activeModel = lineBot.getActiveModel ? lineBot.getActiveModel() : 'claude'
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            ok: true,
            sessionId,
            activeRepo,
            activeModel,
            repos: [activeRepo],
            models: ['claude', 'gpt', 'gemini'],
            backlog: terminalBuffer,
            taskState: currentTaskState
          })
        )
        return
      }

      if (pathname === `/api/s/${sessionId}/files`) {
        const repoIdx = Number.parseInt(parsedUrl.searchParams.get('repoIndex') || '0', 10)
        const targetRepo = boundRepos[repoIdx]
        if (!targetRepo || !fs.existsSync(targetRepo)) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'Repo 目錄不存在' }))
          return
        }

        try {
          const rawEntries = fs.readdirSync(targetRepo, { withFileTypes: true })
          const files = rawEntries
            .filter((e) => !e.name.startsWith('.git') && e.name !== 'node_modules')
            .slice(0, 50)
            .map((e) => ({
              path: e.name,
              isDir: e.isDirectory()
            }))
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, files }))
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: e.message }))
        }
        return
      }

      if (pathname === `/api/s/${sessionId}/execute` && req.method === 'POST') {
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', () => {
          try {
            const { prompt, model, repoIndex } = JSON.parse(body || '{}')
            const targetRepo = boundRepos[repoIndex || 0]

            if (!targetRepo || !fs.existsSync(targetRepo)) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: '無效的 Repo 索引' }))
              return
            }

            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive'
            })

            let cmd = ''
            let args = []

            if (model === 'claude') {
              cmd = 'claude'
              args = ['-p', prompt, '--dangerously-skip-permissions']
            } else if (model === 'gemini') {
              cmd = 'gemini'
              args = ['-p', prompt, '--skip-trust', '--approval-mode', 'yolo']
            } else if (model === 'codex') {
              cmd = 'codex'
              args = ['exec', prompt]
            } else if (model === 'agent') {
              cmd = 'agent'
              args = ['-f', '--model', 'auto', prompt]
            } else {
              cmd = 'claude'
              args = ['-p', prompt]
            }

            const child = spawn(cmd, args, {
              cwd: targetRepo,
              env: sanitizeEnv()
            })

            child.stdout.on('data', (data) => {
              res.write(`data: ${JSON.stringify({ text: data.toString() })}\n\n`)
            })

            child.stderr.on('data', (data) => {
              res.write(`data: ${JSON.stringify({ text: data.toString() })}\n\n`)
            })

            child.on('close', (code) => {
              let diffSummary = ''
              try {
                diffSummary = execSync('git status --short', {
                  cwd: targetRepo,
                  encoding: 'utf8'
                }).trim()
              } catch {}
              res.write(
                `data: ${JSON.stringify({ done: true, exitCode: code, diff: diffSummary || 'No uncommitted changes' })}\n\n`
              )
              res.end()
            })

            child.on('error', (err) => {
              res.write(
                `data: ${JSON.stringify({ text: `[進程啟動失敗] ${err.message}\n`, done: true })}\n\n`
              )
              res.end()
            })
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
        })
        return
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  })

  return {
    server,
    port,
    sessionId,
    token,
    password,
    boundRepos,
    lineBot,
    setPublicUrl: (url) => lineBot.setBaseUrl(url),
    listen: () => new Promise((resolve) => server.listen(port, () => resolve(port))),
    close: () => new Promise((resolve) => server.close(resolve))
  }
}
