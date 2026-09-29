import { createShareGateway } from './server.mjs'
import { spawn } from 'node:child_process'

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    port: 3788,
    password: null,
    repos: [],
    tunnel: false
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
    }
  }

  if (options.repos.length === 0) {
    options.repos = [process.cwd()]
  }

  return options
}

async function main() {
  const options = parseArgs()
  const gateway = createShareGateway(options)

  await gateway.listen()

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
  console.log('----------------------------------------------------')

  if (options.tunnel) {
    console.log('🚀 正在透過 Cloudflare Tunnel 建立公網安全通道...')
    try {
      const cloudflared = spawn('/opt/homebrew/bin/cloudflared', [
        'tunnel',
        '--url',
        `http://127.0.0.1:${gateway.port}`
      ])

      let tunnelUrl = ''
      cloudflared.stderr.on('data', (data) => {
        const line = data.toString()
        const match = line.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/)
        if (match && !tunnelUrl) {
          tunnelUrl = match[0]
          const publicShareUrl = `${tunnelUrl}/s/${gateway.sessionId}?token=${gateway.token}`
          console.log('\n🎉 公網分享專用安全連結已生成：')
          console.log(`🔗 網址: ${publicShareUrl}`)
          console.log(`🔐 密碼: ${gateway.password}`)
          console.log('====================================================\n')
        }
      })

      process.on('SIGINT', () => {
        cloudflared.kill()
        gateway.close()
        process.exit(0)
      })
    } catch (e) {
      console.log(`⚠️ Cloudflare Tunnel 啟動失敗: ${e.message}`)
    }
  }

  process.on('SIGINT', async () => {
    await gateway.close()
    process.exit(0)
  })
}

main().catch(console.error)
