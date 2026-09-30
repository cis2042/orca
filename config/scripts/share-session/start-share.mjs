import { createShareGateway } from './server.mjs'
import { createCloudRunnerFromEnv } from './cloud-agent-runner.mjs'
import { spawn } from 'node:child_process'
import path from 'node:path'

const envPath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../..',
  '.env.local'
)
try {
  process.loadEnvFile(envPath)
} catch {
  try {
    process.loadEnvFile('.env.local')
  } catch {}
}

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    port: 3788,
    password: null,
    repos: [],
    tunnel: false,
    lineChannelSecret: process.env.LINE_CHANNEL_SECRET || null,
    lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || null,
    allowedGroups: process.env.LINE_ALLOWED_GROUPS
      ? process.env.LINE_ALLOWED_GROUPS.split(',').map((s) => s.trim())
      : []
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--port' && args[i + 1]) {
      options.port = Number.parseInt(args[++i], 10)
    } else if (arg === '--password' && args[i + 1]) {
      options.password = args[++i]
    } else if (arg === '--repos' && args[i + 1]) {
      options.repos = args[++i].split(',').map((r) => r.trim())
    } else if (arg === '--tunnel') {
      options.tunnel = true
    } else if (arg === '--twin3') {
      options.twin3 = true
    } else if (arg === '--line-secret' && args[i + 1]) {
      options.lineChannelSecret = args[++i]
    } else if (arg === '--line-token' && args[i + 1]) {
      options.lineChannelAccessToken = args[++i]
    } else if (arg === '--allowed-groups' && args[i + 1]) {
      options.allowedGroups = args[++i].split(',').map((r) => r.trim())
    }
  }

  if (options.twin3 || options.repos.length === 0) {
    options.repos = [
      '/Users/cis2042/APP/agent-id',
      '/Users/cis2042/APP/XHuman_ID',
      '/Users/cis2042/APP/twin3-sdk',
      '/Users/cis2042/APP/twin3_bitbee'
    ]
  }

  return options
}

async function main() {
  process.env.PATH = `/Users/cis2042/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`
  const options = parseArgs()
  const gateway = createShareGateway(options)

  await gateway.listen()

  const cloudBridgeUrl = process.env.BRIDGE_CLOUD_URL || ''
  const cloudRunner = createCloudRunnerFromEnv(process.env, gateway.lineBot)
  const isCloudMode = Boolean(cloudRunner)
  if (cloudRunner) {
    cloudRunner.start()
  }

  const localUrl = `http://localhost:${gateway.port}/s/${gateway.sessionId}?token=${gateway.token}`

  console.log('====================================================')
  console.log('⚡ Twin3 Session Share Gateway (MVP Online)')
  console.log('====================================================')
  console.log(`🔑 Session ID    : ${gateway.sessionId}`)
  console.log(`🔐 訪問密碼 (PW) : ${gateway.password}`)
  console.log(`🌐 本地測試網址  : ${localUrl}`)
  console.log('📦 綁定 Repos    :')
  gateway.boundRepos.forEach((r, idx) => console.log(`   [${idx + 1}] ${r}`))
  console.log('🤖 支援模型引擎  : Claude Code, Gemini CLI, Codex CLI, Cursor Agent')
  console.log(
    `🔒 授權群組鎖定  : ${
      gateway.lineBot.getAllowedGroups().length > 0
        ? gateway.lineBot.getAllowedGroups().join(', ')
        : '自動鎖定首個互動群組'
    }`
  )
  console.log(
    `☁️ 雲端中樞模式  : ${isCloudMode ? `已啟用，輪詢 ${cloudBridgeUrl}（LINE Webhook 由雲端承接，不自動覆寫）` : '未啟用'}`
  )
  console.log('----------------------------------------------------')

  if (options.tunnel) {
    console.log('🚀 正在透過 Cloudflare Tunnel 建立公網安全通道...')
    let cloudflared = null
    let currentTunnelUrl = ''
    let isTerminating = false
    let failCount = 0

    const syncWebhookToLine = async (webhookUrl, retryCount = 0) => {
      if (!options.lineChannelAccessToken || isCloudMode) {
        return false
      }
      try {
        const r = await fetch('https://api.line.me/v2/bot/channel/webhook/endpoint', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${options.lineChannelAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ endpoint: webhookUrl })
        })
        if (r.ok) {
          const testRes = await fetch('https://api.line.me/v2/bot/channel/webhook/test', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${options.lineChannelAccessToken}`
            }
          })
          const testData = await testRes.json().catch(() => ({}))
          console.log(
            `✅ 已自動同步更新 LINE Webhook: ${webhookUrl} (連線檢驗: ${testData.success ? '成功' : testData.reason || '失敗'})`
          )
          return testData.success
        }
        if (retryCount < 3) {
          setTimeout(() => syncWebhookToLine(webhookUrl, retryCount + 1), 3000)
        }
      } catch {
        if (retryCount < 3) {
          setTimeout(() => syncWebhookToLine(webhookUrl, retryCount + 1), 3000)
        }
      }
      return false
    }

    const launchTunnel = () => {
      if (isTerminating) {
        return
      }
      try {
        currentTunnelUrl = ''
        cloudflared = spawn('/opt/homebrew/bin/cloudflared', [
          'tunnel',
          '--url',
          `http://127.0.0.1:${gateway.port}`
        ])

        const onData = (data) => {
          const text = data.toString()
          const matches = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/g)
          if (matches) {
            for (const m of matches) {
              if (!m.includes('api.trycloudflare.com') && m !== currentTunnelUrl) {
                currentTunnelUrl = m
                failCount = 0
                gateway.setPublicUrl(currentTunnelUrl)
                const publicShareUrl = `${currentTunnelUrl}/s/${gateway.sessionId}?token=${gateway.token}`
                const webhookUrl = `${currentTunnelUrl}/api/line/webhook`
                console.log('\n🎉 公網分享專用安全連結已生成：')
                console.log(`🔗 網址: ${publicShareUrl}`)
                console.log(`🔐 密碼: ${gateway.password}`)
                console.log(`📡 LINE Webhook: ${webhookUrl}`)
                console.log('====================================================\n')
                syncWebhookToLine(webhookUrl)
                break
              }
            }
          }
        }

        cloudflared.stderr.on('data', onData)
        cloudflared.stdout.on('data', onData)
        cloudflared.on('error', (err) => {
          console.log(`⚠️ cloudflared 異常: ${err.message}`)
        })
        cloudflared.on('close', (code) => {
          if (!isTerminating) {
            console.log(`⚠️ cloudflared 連線關閉 (code: ${code})，2 秒後重啟自癒...`)
            setTimeout(launchTunnel, 2000)
          }
        })
      } catch (e) {
        console.log(`⚠️ Cloudflare Tunnel 啟動失敗: ${e.message}`)
      }
    }

    launchTunnel()

    const healthInterval = setInterval(async () => {
      if (isTerminating || !currentTunnelUrl) {
        return
      }
      try {
        const res = await fetch(`${currentTunnelUrl}/health`, { signal: AbortSignal.timeout(4000) })
        if (res.ok) {
          failCount = 0
          return
        }
        failCount++
      } catch {
        failCount++
      }

      if (failCount >= 2) {
        console.log(`⚠️ 偵測到 Tunnel 域名失效 (${currentTunnelUrl})，正在重啟通道以自癒保活...`)
        failCount = 0
        if (cloudflared) {
          cloudflared.kill('SIGKILL')
        }
      }
    }, 20000)

    process.on('SIGINT', () => {
      isTerminating = true
      clearInterval(healthInterval)
      if (cloudflared) {
        cloudflared.kill()
      }
      gateway.close()
      process.exit(0)
    })
  } else {
    process.on('SIGINT', async () => {
      await gateway.close()
      process.exit(0)
    })
  }
}

main().catch(console.error)
