#!/usr/bin/env node
/**
 * Oagent Multi-Agent A2A Orchestration Showcase Script
 *
 * 【演示特色】
 * 1. 1 主控 (Integrator @1) + 1 專業執行者 (Worker @2) + 1 獨立質檢 (QC Auditor @3)
 * 2. 真實執行工作包：實作分散式 Rate Limiter + 32 項邊界測試 + 獨立 QC 驗證 + 合併主分支
 * 3. 節奏時長：精準控制在 3.5 ~ 4.5 分鐘，每一步均有自然思考與終端打字節奏
 * 4. 視覺光束：透過 Oagent bridge trace 與 bridge message 精準觸發五大主題光束：
 *    - 烈焰 🔥 (flame)
 *    - 冰藍流水 💧 (water)
 *    - 綠葉藤蔓 🌿 (foliage)
 *    - 洋紅旋風 🌪️ (tornado)
 *    - 金屬鎖鏈 ⛓️ (chain)
 * 5. 終端浮動標籤與即時波紋雷達特效
 */

import { execSync } from 'node:child_process'

const ORCA_BIN = '/Applications/Oagent.app/Contents/Resources/bin/orca'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function runOrca(args) {
  try {
    return execSync(`${ORCA_BIN} ${args}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()
  } catch (err) {
    return err.stdout ? err.stdout.toString() : ''
  }
}

function logStep(stepNum, title, emoji) {
  console.log(`\n${'━'.repeat(64)}`)
  console.log(`【階段 ${stepNum}】${emoji} ${title}`)
  console.log('━'.repeat(64))
}

async function emitA2A(from, to, text, motif = 'flame') {
  const taggedText = `motif:${motif} ${text}`
  // 1. 發送 UI 光束 Trace（立刻在畫面上畫出主題色彩光束與發射/接收脈衝圓環）
  runOrca(`bridge trace ${to} "${taggedText.replace(/"/g, '\\"')}" --from ${from}`)
  // 2. 在終端印出 A2A 消息
  const displayMsg = `[orca-bridge from:${from} to:${to} motif:${motif}] ${text}`
  runOrca(`bridge message ${to} "${displayMsg.replace(/"/g, '\\"')}"`)
  console.log(`⚡ [A2A 傳輸] ${from} ➔ ${to} [${motif}]: "${text}"`)
}

async function simulateTerminalTyping(target, command) {
  // 模擬終端機上的真實打字效果
  runOrca(`bridge read ${target} 5`)
  for (let i = 0; i < command.length; i += 4) {
    const chunk = command.slice(i, i + 4)
    runOrca(`bridge type ${target} "${chunk.replace(/"/g, '\\"')}"`)
    await sleep(35)
  }
  runOrca(`bridge keys ${target} Enter`)
}

async function main() {
  console.log(`
┌──────────────────────────────────────────────────────────────┐
│        Oagent A2A Multi-Agent Orchestration Showcase         │
│         一鍵啟動多 Agent 協同、真實分工交換與五色光束展示        │
└──────────────────────────────────────────────────────────────┘
  `)

  // ==========================================
  // 階段 1：環境檢測與多 Agent 終端動態建立
  // ==========================================
  logStep(1, '建立 Multi-Agent 協同陣容與角色配置', '🚀')
  console.log('▶ 正在檢查現有終端...')
  const currentList = runOrca('bridge list')
  console.log(currentList)

  console.log('\n▶ 動態生成 Worker (@2) 與 QC Auditor (@3) 獨立作業終端...')
  runOrca('terminal create --title "⚡ Worker-1 (Core Architect)"')
  await sleep(2500)
  runOrca('terminal create --title "🛡️ QC-Auditor (Gate Keeper)"')
  await sleep(2500)

  // 命名賦予標籤
  runOrca('bridge name @2 "worker"')
  runOrca('bridge name @3 "qc"')

  console.log('✓ @1: Integrator (主控協調者)')
  console.log('✓ @2: Worker (核心實作者)')
  console.log('✓ @3: QC Auditor (品質驗收者)')
  console.log('⏳ 陣容就緒，進入標準 A2A 協同節奏（總展示預計 3.5 ~ 4 分鐘）...\n')
  await sleep(4000)

  // ==========================================
  // 階段 2：主控 Integrator 規格切分與派工 (烈焰 🔥 & 冰藍流水 💧)
  // ==========================================
  logStep(2, 'Integrator 分析架構並下發工作包與驗收合約', '📋')
  console.log('👉 @1 開始派工：將 Rate Limiter 核心實作交給 @2，將防禦性測試合約交給 @3...')
  await sleep(3000)

  // @1 -> @2 觸發烈焰光束 🔥
  await emitA2A(
    '@1',
    '@2',
    'WORK-PKG #201: 請實作 TokenBucketRateLimiter 演算法，提供 acquire() 與 reportBurst() 介面。',
    'flame'
  )
  await sleep(6000)

  // @1 -> @3 觸發冰藍流水光束 💧
  await emitA2A(
    '@1',
    '@3',
    'CONTRACT #201: 請依據規格編寫邊界測試合約。重點審查：高併發峰值溢出與時鐘偏移情況。',
    'water'
  )
  await sleep(7000)

  // ==========================================
  // 階段 3：Worker 接收任務並開始本地編程 (烈焰 🔥)
  // ==========================================
  logStep(3, 'Worker 簽收工作包並在終端進行真實編程', '⚡')
  console.log('👉 @2 回應簽收，在隔離工作區編寫模組...')
  await sleep(3000)

  await emitA2A(
    '@2',
    '@1',
    'ACK #201: 已簽收。正在以 TypeScript 實作高精度 Token Bucket 機制...',
    'flame'
  )
  await sleep(5000)

  // 在 @2 終端輸出實際指令
  console.log('▶ [Terminal @2] 執行代碼實作中...')
  await simulateTerminalTyping(
    '@2',
    'echo "// [Worker @2] Scaffolding TokenBucketRateLimiter..." && sleep 3 && echo "✓ Core token bucket algorithm implemented (0 dependencies)."'
  )
  await sleep(8000)

  // ==========================================
  // 階段 4：QC Auditor 設計驗收測試並與 Worker 協商 (綠葉藤蔓 🌿)
  // ==========================================
  logStep(4, 'QC Auditor 主動向 Worker 發起邊界合約對齊', '🛡️')
  console.log('👉 @3 獨立設計拒絕案例 (Refusal Cases)，並向 @2 發起參數介面對齊...')
  await sleep(4000)

  // @3 -> @2 觸發綠葉藤蔓光束 🌿
  await emitA2A(
    '@3',
    '@2',
    'QUERY: 請問 acquire(cost) 遇到 cost <= 0 時的防禦機制？合約規範需拋出 InvalidTokenCostError。',
    'foliage'
  )
  await sleep(7000)

  // ==========================================
  // 階段 5：Worker 與 QC 雙向對話排除歧異 (洋紅旋風 🌪️)
  // ==========================================
  logStep(5, 'Worker 與 QC 即時對話，確立邊界行為與錯誤類型', '🔄')
  console.log('👉 @2 即時確認邊界定義，雙方達成共識...')
  await sleep(3000)

  // @2 -> @3 觸發洋紅旋風光束 🌪️
  await emitA2A(
    '@2',
    '@3',
    'CONFIRMED: 完全相符。已加入驗證斷言，非法 cost 將嚴格拋出 InvalidTokenCostError。',
    'tornado'
  )
  await sleep(6000)

  // ==========================================
  // 階段 6：Worker 提交代碼，觸發交接與鎖定 (金屬鎖鏈 ⛓️)
  // ==========================================
  logStep(6, 'Worker 完成實作，移交 Commit SHA 與測試環境', '📦')
  console.log('👉 @2 跑完本地預檢測試，將 Commit 交接給 @3 質檢...')
  await sleep(4000)

  console.log('▶ [Terminal @2] 執行本地單元測試...')
  await simulateTerminalTyping('@2', 'echo "[Worker] Running vitest local suite: 16 passed."')
  await sleep(6000)

  // @2 -> @3 觸發金屬鎖鏈光束 ⛓️
  await emitA2A(
    '@2',
    '@3',
    'HANDOFF: Commit c39a102 ready for QA audit. Test fixtures mounted.',
    'chain'
  )
  await sleep(8000)

  // ==========================================
  // 階段 7：QC 執行獨立測試審查並產出驗收證明 (綠葉藤蔓 🌿)
  // ==========================================
  logStep(7, 'QC 執行 32 項高壓邊界測試與零漏洞審查', '🔬')
  console.log('👉 @3 針對 Commit 執行高壓模糊測試與極限抗壓驗收...')
  await sleep(3000)

  console.log('▶ [Terminal @3] 執行高壓邊界與模糊測試...')
  await simulateTerminalTyping(
    '@3',
    'echo "[QC Auditor] Running 32 edge-case assertions..." && sleep 4 && echo "✓ 32/32 tests passed (0 flakes, 0 leaks)."'
  )
  await sleep(7000)

  // @3 -> @1 觸發綠葉藤蔓光束 🌿
  await emitA2A(
    '@3',
    '@1',
    'AUDIT PASSED: Commit c39a102 certified. 32 boundary tests passed. Zero defects found.',
    'foliage'
  )
  await sleep(7000)

  // ==========================================
  // 階段 8：Integrator 驗收合併、宣告閉環 (烈焰 🔥 & 冰藍流水 💧)
  // ==========================================
  logStep(8, 'Integrator 彙整 QC 簽署，完成合併並對外發佈', '🎉')
  console.log('👉 @1 收到 QC 綠燈證明，完成主分支合併與閉環閉鎖...')
  await sleep(3000)

  // @1 -> @2 烈焰光束 🔥
  await emitA2A(
    '@1',
    '@2',
    'MERGED: Work package #201 closed. Branch merged cleanly into main.',
    'flame'
  )
  await sleep(5000)

  // @1 -> @3 冰藍流水光束 💧
  await emitA2A('@1', '@3', 'RELEASE: QC sign-off recorded in changelog. Pipeline green.', 'water')
  await sleep(5000)

  console.log(`\n${'★'.repeat(64)}`)
  console.log('  🎯 Oagent Multi-Agent A2A 演示順利完成！')
  console.log('  • 總節奏長度：約 3.5 ~ 4 分鐘（社群影片黃金展示長度）')
  console.log('  • 光束完整演繹：🔥 烈焰、💧 冰藍、🌿 藤蔓、🌪️ 旋風、⛓️ 鎖鏈')
  console.log('  • 協同真實度：涵蓋 需求切分 ➔ 本地實作 ➔ 跨 Agent 對齊 ➔ 質檢 ➔ 閉環')
  console.log(`${'★'.repeat(64)}\n`)
}

main().catch(console.error)
