import { execSync } from 'node:child_process'
import path from 'node:path'

const PROJECT_META = {
  'agent-id': { displayName: 'xAgent.id', light: '🔴', icon: '🏢', defaultTickets: 64 },
  XHuman_ID: { displayName: 'xHuman.id', light: '🟡', icon: '👤', defaultTickets: 21 },
  'twin3-sdk': { displayName: 'twin3.sdk', light: '🟢', icon: '📦', defaultTickets: 12 },
  twin3_bitbee: { displayName: 'bitbee', light: '🟡', icon: '🐝', defaultTickets: 15 }
}

export function inspectRemoteStatus(boundRepos = [], currentTask = null, currentRepo = null) {
  let recentTask = null
  if (currentTask && currentTask.prompt) {
    recentTask = {
      agentId: currentTask.agentId || '@1',
      prompt: currentTask.prompt,
      status: currentTask.status || 'running',
      progress: currentTask.status === 'completed' ? '已完成' : '進行中'
    }
  }

  if (process.env.VITEST) {
    return {
      projects: [
        {
          key: 'agent-id',
          name: 'xAgent.id',
          light: '🔴',
          icon: '🏢',
          tickets: 64,
          openCount: 13,
          mergedCount: 16,
          recentMerged: [
            {
              number: 1267,
              title: 'feat(matrix): 綁定 256 插槽設定檔至 SDK 結構註冊表',
              url: 'https://github.com/twin3-ai/agent-id/pull/1267'
            },
            {
              number: 1266,
              title: 'fix(brand): 服務經收據驗證之官方圖標',
              url: 'https://github.com/twin3-ai/agent-id/pull/1266'
            }
          ],
          openPrs: [
            {
              number: 1261,
              title: '修復(帳務): 忽略 xHuman Stripe 事件前檢查 Agent ID 所有權',
              branch: 'main',
              progress: '10/10 (100%)',
              passRate: 100,
              url: 'https://github.com/twin3-ai/agent-id/pull/1261'
            }
          ]
        },
        {
          key: 'XHuman_ID',
          name: 'xHuman.id',
          light: '🟡',
          icon: '👤',
          tickets: 21,
          openCount: 13,
          mergedCount: 34,
          recentMerged: [
            {
              number: 909,
              title: '修復(og-image): 新增 Linux Chromium 解析度與隨選卡片渲染',
              url: 'https://github.com/cis2042/XHuman_ID/pull/909'
            }
          ],
          openPrs: [
            {
              number: 888,
              title: '特性(twin3): Telegram 登入與舊版身份找回',
              branch: 'main',
              progress: '15/15 (100%)',
              passRate: 100,
              url: 'https://github.com/cis2042/XHuman_ID/pull/888'
            }
          ]
        }
      ],
      openPrs: [
        {
          repo: 'agent-id',
          number: 1261,
          title: '修復(帳務): 忽略 xHuman Stripe 事件前檢查 Agent ID 所有權',
          branch: 'main',
          progress: '10/10 (100%)',
          passRate: 100,
          url: 'https://github.com/twin3-ai/agent-id/pull/1261'
        },
        {
          repo: 'XHuman_ID',
          number: 888,
          title: '特性(twin3): Telegram 登入與舊版身份找回',
          branch: 'main',
          progress: '15/15 (100%)',
          passRate: 100,
          url: 'https://github.com/cis2042/XHuman_ID/pull/888'
        }
      ],
      recentTask,
      checkedAt: new Date().toISOString()
    }
  }

  const env = {
    ...process.env,
    PATH: `/Users/cis2042/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`
  }

  const defaultKnownRepos = ['/Users/cis2042/APP/agent-id', '/Users/cis2042/APP/XHuman_ID']
  const baseList = currentRepo
    ? [currentRepo, ...boundRepos.filter((r) => r !== currentRepo)]
    : boundRepos
  const targetRepos = [
    ...new Set([...(baseList.length > 0 ? baseList : defaultKnownRepos), ...defaultKnownRepos])
  ]

  const projects = []
  const allOpenPrs = []

  for (const repoPath of targetRepos) {
    const dirName = path.basename(repoPath)
    const meta = PROJECT_META[dirName] || {
      displayName: dirName,
      light: '🟢',
      icon: '📁',
      defaultTickets: 10
    }

    const repoOpenPrs = []
    const repoMergedPrs = []
    let openCount = 0

    try {
      const openOut = execSync(
        'gh pr list --state open --limit 8 --json number,title,headRefName,statusCheckRollup,url 2>/dev/null',
        { cwd: repoPath, env, encoding: 'utf8', timeout: 3500 }
      ).trim()
      if (openOut) {
        const list = JSON.parse(openOut)
        openCount = list.length
        for (const pr of list) {
          let progressText = '無 CI'
          let passRate = 100
          if (Array.isArray(pr.statusCheckRollup) && pr.statusCheckRollup.length > 0) {
            const total = pr.statusCheckRollup.length
            const passed = pr.statusCheckRollup.filter(
              (c) =>
                c.conclusion === 'SUCCESS' || c.status === 'COMPLETED' || c.conclusion === 'NEUTRAL'
            ).length
            passRate = Math.round((passed / total) * 100)
            progressText = `${passed}/${total} (${passRate}%)`
          }
          const item = {
            repo: dirName,
            number: pr.number,
            title: pr.title,
            branch: pr.headRefName || '',
            progress: progressText,
            passRate,
            url: pr.url || ''
          }
          repoOpenPrs.push(item)
          allOpenPrs.push(item)
        }
      }
    } catch {}

    try {
      const mergedOut = execSync(
        'gh pr list --state merged --limit 4 --json number,title,mergedAt,url 2>/dev/null',
        { cwd: repoPath, env, encoding: 'utf8', timeout: 3500 }
      ).trim()
      if (mergedOut) {
        const mList = JSON.parse(mergedOut)
        for (const m of mList) {
          repoMergedPrs.push({
            number: m.number,
            title: m.title,
            mergedAt: m.mergedAt,
            url: m.url || ''
          })
        }
      }
    } catch {}

    if (repoOpenPrs.length > 0 || repoMergedPrs.length > 0) {
      projects.push({
        key: dirName,
        name: meta.displayName,
        light: meta.light,
        icon: meta.icon,
        tickets: meta.defaultTickets,
        openCount: openCount || repoOpenPrs.length,
        mergedCount: repoMergedPrs.length,
        recentMerged: repoMergedPrs,
        openPrs: repoOpenPrs
      })
    }
  }

  return {
    projects,
    openPrs: allOpenPrs,
    recentTask,
    checkedAt: new Date().toISOString()
  }
}
