#!/usr/bin/env node
/**
 * Oagent Autonomous 6-Agent A2A Collaboration & Recording Demo (English Edition)
 *
 * 6-Agent Roles Architecture:
 * - @1: Integrator & Dispatcher 👑 (Flock Lead / Architecture Authority)
 * - @2: Architect & Contract Designer 📐 (Contract-First / Interface Schemas)
 * - @3: Core Engine Worker ⚡ (Algorithm Implementation / Token Bucket Engine)
 * - @4: Network & Transport Worker 🌐 (Distributed Sync & Exponential Backoff)
 * - @5: QA & Fuzzing Auditor 🛡️ (Boundary Checks / Chaos Testing)
 * - @6: Security & Compliance Auditor 🔒 (Defect Analysis & Final Sign-off)
 *
 * Visual Highlights:
 * - Complete 5 motif beams: 🔥 flame, 💧 water, 🌿 foliage, 🌪️ tornado, ⛓️ chain
 * - Natural collaboration cadence (approx. 3.5 ~ 4.5 minutes)
 * - Auto screen recording support via macOS native screencapture
 */

import { execSync, spawn } from 'node:child_process'
import * as path from 'node:path'
import * as fs from 'node:fs'

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

function logStage(num, title, emoji) {
  console.log(`\n${'━'.repeat(66)}`)
  console.log(`[STAGE ${num}] ${emoji} ${title}`)
  console.log('━'.repeat(66))
}

async function emitA2A(from, to, text, motif = 'flame') {
  const taggedText = `motif:${motif} ${text}`
  // 1. Emit SVG connection beam & pulse rings in Oagent UI
  runOrca(`bridge trace ${to} "${taggedText.replace(/"/g, '\\"')}" --from ${from}`)
  // 2. Transmit bridge message to destination terminal
  const displayMsg = `[orca-bridge from:${from} to:${to} motif:${motif}] ${text}`
  runOrca(`bridge message ${to} "${displayMsg.replace(/"/g, '\\"')}"`)
  console.log(`📡 [A2A Transmit] ${from} ➔ ${to} (${motif}): "${text}"`)
}

async function simulateTerminalTyping(target, command) {
  runOrca(`bridge read ${target} 5`)
  for (let i = 0; i < command.length; i += 5) {
    const chunk = command.slice(i, i + 5)
    runOrca(`bridge type ${target} "${chunk.replace(/"/g, '\\"')}"`)
    await sleep(35)
  }
  runOrca(`bridge keys ${target} Enter`)
}

async function main() {
  const isRecordMode = process.argv.includes('--record')
  const recordingsDir = path.resolve(process.cwd(), 'demos/a2a-orchestration/recordings')
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const recordFile = path.join(recordingsDir, `oagent-6agent-a2a-${timestamp}.mp4`)

  let recordProcess = null

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║        Oagent Autonomous 6-Agent A2A Orchestration Demo          ║
║            English Edition • Full Production Recording           ║
╚══════════════════════════════════════════════════════════════════╝
  `)

  if (isRecordMode) {
    console.log(`🎥 [Screen Recorder] Starting video capture: ${recordFile}`)
    console.log('   (Capturing Oagent workspace for 240 seconds)...')
    // Start screencapture in background
    recordProcess = spawn('screencapture', ['-v', '-V240', recordFile], {
      stdio: 'ignore',
      detached: true
    })
    recordProcess.unref()
    await sleep(2000)
  }

  // ==========================================
  // STAGE 1: Spawn & Orchestrate 6 Agents
  // ==========================================
  logStage(1, 'Spawning 6 Autonomous Agents in Parallel', '🚀')
  console.log('▶ Inspecting initial terminal status...')
  console.log(runOrca('bridge list'))

  console.log('\n▶ Spawning 5 specialized sub-agent terminals (@2 to @6)...')

  const agents = [
    { target: '@2', title: '📐 Architect & Schemas', name: 'architect' },
    { target: '@3', title: '⚡ Core Engine Worker', name: 'worker-core' },
    { target: '@4', title: '🌐 Network Transport', name: 'worker-net' },
    { target: '@5', title: '🛡️ QA Fuzzing Auditor', name: 'auditor-qa' },
    { target: '@6', title: '🔒 Security & Compliance', name: 'auditor-sec' }
  ]

  for (const ag of agents) {
    console.log(`  Spawning ${ag.target}: ${ag.title}...`)
    runOrca(`terminal create --title "${ag.title}"`)
    await sleep(1500)
  }

  // Assign clean addressable names
  for (const ag of agents) {
    runOrca(`bridge name ${ag.target} "${ag.name}"`)
  }

  console.log('\n✅ Swarm Ready:')
  console.log('   👑 @1: Integrator (Lead Orchestrator)')
  console.log('   📐 @2: Architect (Contract & Interface Design)')
  console.log('   ⚡ @3: Core Worker (High-performance Rate Limiter)')
  console.log('   🌐 @4: Network Worker (Distributed Sync & Retry)')
  console.log('   🛡️ @5: QA Auditor (Boundary & Chaos Testing)')
  console.log('   🔒 @6: Security Auditor (Safety Policy & Sign-off)')
  console.log('⏳ Entering production multi-agent collaboration cadence (~3.5 minutes)...\n')
  await sleep(4000)

  // ==========================================
  // STAGE 2: Task Packaging & Contract-First Dispatch
  // ==========================================
  logStage(2, 'Integrator Dispatches Work Packages (Contract-First)', '📋')
  console.log('👉 @1 analyzes system requirements and assigns work packages...')
  await sleep(2500)

  // @1 -> @2 (Flame 🔥): Architecture Spec
  await emitA2A(
    '@1',
    '@2',
    'WORK-PKG #301: Define unified TypeScript schema for Distributed Token Bucket. Enforce zero-leak guarantees.',
    'flame'
  )
  await sleep(5000)

  // @2 -> @1 (Water 💧): Schema Published
  console.log('👉 @2 drafts Interface Contracts and schemas...')
  runOrca('bridge read @2 5')
  await simulateTerminalTyping(
    '@2',
    'echo "// [Architect @2] Publishing ITokenBucket & RateLimitResult schemas..." && sleep 2 && echo "✓ Contracts published with zero-alloc footprint."'
  )
  await sleep(4000)
  await emitA2A(
    '@2',
    '@1',
    'SCHEMA READY: contracts/rate-limiter.ts committed. Hash lock 7d9a10.',
    'water'
  )
  await sleep(5000)

  // ==========================================
  // STAGE 3: Parallel Worker Execution (Core + Network)
  // ==========================================
  logStage(3, 'Parallel Worker Implementation: Core Engine & Network Sync', '⚡')
  console.log('👉 @1 dispatches implementation tasks to @3 and @4 concurrently...')
  await sleep(2000)

  // @1 -> @3 (Flame 🔥)
  await emitA2A(
    '@1',
    '@3',
    'TASK #301-A: Implement in-memory sliding window & refill rate math. Peak throughput target: 100k ops/sec.',
    'flame'
  )
  await sleep(4000)

  // @1 -> @4 (Tornado 🌪️)
  await emitA2A(
    '@1',
    '@4',
    'TASK #301-B: Implement cluster sync gossip & exponential jitter backoff transport.',
    'tornado'
  )
  await sleep(5000)

  // Workers execute
  console.log('▶ [Terminal @3] Implementing Core Sliding Window Engine...')
  await simulateTerminalTyping(
    '@3',
    'echo "// [Core Engine] Compiling sliding window ring buffer..." && sleep 3 && echo "✓ Core engine benchmark: 142k ops/sec."'
  )
  await sleep(4000)

  console.log('▶ [Terminal @4] Implementing Network Gossip Transport...')
  await simulateTerminalTyping(
    '@4',
    'echo "// [Network Transport] Binding UDP cluster gossip with decorrelated jitter..." && sleep 2 && echo "✓ Gossip mesh connected."'
  )
  await sleep(4000)

  // @3 -> @4 (Chain ⛓️): Inter-worker handshake
  await emitA2A(
    '@3',
    '@4',
    'SYNC: Core engine API bound to transport channel. Local state machine verified.',
    'chain'
  )
  await sleep(5000)

  // ==========================================
  // STAGE 4: QA & Security Auditors Engage
  // ==========================================
  logStage(4, 'QA & Security Auditors Deploy Boundary & Policy Checks', '🛡️')
  console.log('👉 @1 requests independent audit from @5 (QA) and @6 (Security)...')
  await sleep(2000)

  // @1 -> @5 (Foliage 🌿)
  await emitA2A(
    '@1',
    '@5',
    'AUDIT-REQ: Stress test sliding window boundaries, clock drift, and burst recovery.',
    'foliage'
  )
  await sleep(4000)

  // @1 -> @6 (Water 💧)
  await emitA2A(
    '@1',
    '@6',
    'AUDIT-REQ: Verify thread-safety, memory bounds, and denial-of-service resilience.',
    'water'
  )
  await sleep(5000)

  // @5 questions @3 (Foliage 🌿)
  await emitA2A(
    '@5',
    '@3',
    'CHALLENGE: How does engine handle negative token costs or NaN timestamps?',
    'foliage'
  )
  await sleep(4000)

  // @3 answers @5 (Tornado 🌪️)
  await emitA2A(
    '@3',
    '@5',
    'DEFENSE: Strict typeguard active. Invalid inputs throw NaNTokenRefusal with zero state mutation.',
    'tornado'
  )
  await sleep(4000)

  // ==========================================
  // STAGE 5: Independent Verification & Audit Sign-off
  // ==========================================
  logStage(5, 'Executing Test Harness & Generating Audit Certificates', '🔬')
  console.log('▶ [Terminal @5] Running automated fuzzing and boundary test harness...')
  await simulateTerminalTyping(
    '@5',
    'echo "[QA Auditor] Running 48 boundary fuzz test cases..." && sleep 3 && echo "✓ 48/48 tests passed (0 flakes, 0 drift)."'
  )
  await sleep(5000)

  console.log('▶ [Terminal @6] Performing security and leak analysis...')
  await simulateTerminalTyping(
    '@6',
    'echo "[Security] Scanning memory allocations & heap profiles..." && sleep 2 && echo "✓ 0 buffer overflows. Concurrency certified."'
  )
  await sleep(4000)

  // @5 -> @1 (Foliage 🌿)
  await emitA2A(
    '@5',
    '@1',
    'QA CERTIFIED: All 48 edge-case suites passed. No regressions detected.',
    'foliage'
  )
  await sleep(4000)

  // @6 -> @1 (Chain ⛓️)
  await emitA2A(
    '@6',
    '@1',
    'SECURITY PASS: Zero vulnerabilities found. Commit locked and authorized for main branch.',
    'chain'
  )
  await sleep(5000)

  // ==========================================
  // STAGE 6: Final Integration, Release & Clean Closure
  // ==========================================
  logStage(6, 'Integrator Merges, Releases, and Seals Workflow', '🎉')
  console.log(
    '👉 @1 consolidates audit reports, merges feature branches, and broadcasts release...'
  )
  await sleep(2500)

  // @1 -> @3 (Flame 🔥)
  await emitA2A(
    '@1',
    '@3',
    'MERGED: PR #301 merged into main branch. Thank you @worker-core.',
    'flame'
  )
  await sleep(3500)

  // @1 -> @4 (Tornado 🌪️)
  await emitA2A(
    '@1',
    '@4',
    'RELEASED: Distributed cluster package v2.4.0 published to registry.',
    'tornado'
  )
  await sleep(3500)

  // @1 -> @2 (Water 💧)
  await emitA2A(
    '@1',
    '@2',
    'CLOSED: System specifications sealed. Work package lifecycle complete.',
    'water'
  )
  await sleep(4000)

  if (isRecordMode && recordProcess) {
    console.log('\n🛑 [Screen Recorder] Finalizing video recording...')
    try {
      process.kill(-recordProcess.pid, 'SIGINT')
    } catch {
      recordProcess.kill('SIGINT')
    }
    await sleep(2000)
    console.log(`🎬 Video saved successfully at: ${recordFile}`)
  }

  console.log(`\n${'★'.repeat(66)}`)
  console.log('  🎯 Oagent 6-Agent Autonomous Demonstration Completed!')
  console.log('  • Swarm Size: 6 Fully Coordinated Autonomous Agents')
  console.log('  • Beams Demonstrated: 🔥 Flame, 💧 Water, 🌿 Foliage, 🌪️ Tornado, ⛓️ Chain')
  console.log('  • Architecture: 1 Integrator + 3 Specialist Workers + 2 Independent Auditors')
  console.log('  • Status: Closed-loop Verification with 100% Audit Pass')
  console.log(`${'★'.repeat(66)}\n`)
}

main().catch(console.error)
