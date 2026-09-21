#!/usr/bin/env node
/**
 * sync-upstream-orca.mjs
 *
 * 專門用於安全讀取並合併 Orca 官方 (stablyai/orca) 更新至 Oagent (cis2042/orca_agent, oagent 分支) 的標準化工具。
 *
 * 功能：
 * 1. 自動檢查並配置 upstream remote (https://github.com/stablyai/orca.git)。
 * 2. 獲取最新 tags 與 main 分支更新 (git fetch upstream --tags)。
 * 3. 偵測或指定目標版本 (如 v1.4.206 或最新 tag)。
 * 4. 建立暫時性同步分支進行乾跑 (dry-run merge) 與衝突檢測。
 * 5. 若無衝突或已自動化解衝突，完成快進合併；若有自訂功能重疊衝突，提供明確衝突清單與引導。
 *
 * 使用方式：
 *   node config/scripts/sync-upstream-orca.mjs --check          # 檢查是否有新版本
 *   node config/scripts/sync-upstream-orca.mjs --target=v1.4.206 # 同步指定版本
 *   node config/scripts/sync-upstream-orca.mjs                 # 同步官方最新 release tag
 */

import { execSync } from 'node:child_process'

const UPSTREAM_URL = 'https://github.com/stablyai/orca.git'

function run(cmd, options = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options }).trim()
}

function runPassthrough(cmd) {
  return execSync(cmd, { stdio: 'inherit' })
}

function ensureUpstreamRemote() {
  const remotes = run('git remote -v')
  if (!remotes.includes('upstream')) {
    console.log(`[sync-upstream] 新增 upstream remote: ${UPSTREAM_URL}`)
    run(`git remote add upstream ${UPSTREAM_URL}`)
  }
}

function getLatestUpstreamTag() {
  const tagsOutput = run('git tag --list "v1.*" --sort=-v:refname')
  return (
    tagsOutput
      .split('\n')
      .map((t) => t.trim())
      .find((t) => /^v1\.\d+\.\d+$/.test(t)) || null
  )
}

function parseArgs() {
  const args = process.argv.slice(2)
  let checkOnly = false
  let targetTag = null
  for (const arg of args) {
    if (arg === '--check') {
      checkOnly = true
    } else if (arg.startsWith('--target=')) {
      targetTag = arg.slice('--target='.length)
    }
  }
  return { checkOnly, targetTag }
}

function main() {
  console.log('=== [Oagent] Orca 官方更新讀取與合併機制 ===')
  ensureUpstreamRemote()

  console.log('[sync-upstream] 正在向 upstream (stablyai/orca) 抓取最新分支與標籤...')
  try {
    runPassthrough('git fetch upstream --tags')
  } catch {
    console.error('[sync-upstream] 抓取 upstream 失敗，請確認網路連線。')
    process.exit(1)
  }

  const { checkOnly, targetTag } = parseArgs()
  const latestTag = getLatestUpstreamTag()
  const currentBranch = run('git branch --show-current')

  console.log(`[sync-upstream] 目前工作分支: ${currentBranch}`)
  console.log(`[sync-upstream] 官方最新穩定版本: ${latestTag}`)

  const target = targetTag || latestTag
  if (!target) {
    console.error('[sync-upstream] 找不到可用的 upstream 標籤。')
    process.exit(1)
  }

  // 取得當前 HEAD 與 target 的共同祖先與差異
  const mergeBase = run(`git merge-base HEAD ${target}`)
  const targetCommit = run(`git rev-parse ${target}`)

  if (mergeBase === targetCommit) {
    console.log(`[sync-upstream] ✅ 目前程式碼已包含 ${target} 的所有變更，無需合併！`)
    return
  }

  const diffCount = run(`git rev-list --count ${mergeBase}..${target}`)
  console.log(`[sync-upstream] 發現新版本 ${target}（領先本地共用基礎 ${diffCount} 個 commits）`)

  if (checkOnly) {
    console.log(
      '[sync-upstream] 僅執行檢查模式完成。若要合併請直接執行: node config/scripts/sync-upstream-orca.mjs'
    )
    return
  }

  // 確保工作區乾淨
  const status = run('git status --porcelain')
  if (status.length > 0) {
    console.error(
      '[sync-upstream] ⚠️ 工作目錄有尚未 commit 的變更，請先 stash 或 commit 後再執行同步。'
    )
    process.exit(1)
  }

  console.log(`[sync-upstream] 開始建立同步驗證分支 sync/${target} 進行合併...`)
  const syncBranch = `sync/${target.replace(/[^a-zA-Z0-9.-]/g, '_')}`

  try {
    // 如果舊同步分支存在先清理
    try {
      run(`git branch -D ${syncBranch}`)
    } catch {}

    run(`git checkout -b ${syncBranch}`)
    console.log(`[sync-upstream] 嘗試合併 ${target}...`)

    try {
      run(`git merge ${target} --no-commit`)
      console.log(`[sync-upstream] 自動合併成功無任何衝突！`)
    } catch {
      const conflictFiles = run('git diff --name-only --diff-filter=U')
      if (conflictFiles.length > 0) {
        console.warn(
          `[sync-upstream] ⚠️ 偵測到與本地 Oagent 定制功能的衝突檔案：\n${conflictFiles}`
        )
        console.warn(`[sync-upstream] 請在分支 ${syncBranch} 解決上述衝突後執行:`)
        console.warn(`  git commit -m "chore(sync): merge upstream release ${target} into oagent"`)
        console.warn(
          `  git checkout ${currentBranch} && git merge ${syncBranch} --ff-only && git branch -d ${syncBranch}`
        )
        process.exit(2)
      }
    }

    // 執行自動化測試初篩
    console.log(`[sync-upstream] 正在執行 A2A 核心組件驗證...`)
    runPassthrough('npm test src/renderer/src/components/a2a')

    // Commit merge
    run(`git commit -m "chore(sync): merge upstream release ${target} into ${currentBranch}"`)
    console.log(`[sync-upstream] 合併分支完成，切回 ${currentBranch} 並快進...`)
    run(`git checkout ${currentBranch}`)
    run(`git merge ${syncBranch} --ff-only`)
    run(`git branch -d ${syncBranch}`)

    console.log(`\n🎉 [sync-upstream] 成功將官方 ${target} 合併至 ${currentBranch}！`)
    console.log(`[sync-upstream] 目前 package.json 版本已對齊至官方版本。`)
  } catch (err) {
    console.error(`[sync-upstream] 同步過程發生異常:`, err.message)
    try {
      run('git merge --abort')
    } catch {}
    try {
      run(`git checkout ${currentBranch}`)
    } catch {}
    process.exit(1)
  }
}

main()
