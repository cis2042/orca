import type { A2AConnectionMotif } from './A2AConnectionEffects'

export type DemoAgent = {
  id: string
  index: number
  handle: string
  name: string
  role: string
  model: string
  vendor: 'Anthropic' | 'OpenAI' | 'Google' | 'DeepSeek' | 'xAI' | 'Alibaba'
  vendorColor: string
  themeColor: string
  avatarBadge: string
}

export type DemoStep = {
  step: number
  fromIndex: number
  toIndex: number
  motif: A2AConnectionMotif
  phase:
    | 'DELEGATE'
    | 'RESEARCH'
    | 'REASONING'
    | 'IMPLEMENT'
    | 'TELEMETRY'
    | 'SECURITY'
    | 'VERIFY'
    | 'CONSENSUS'
  title: string
  summary: string
  commandText: string
  verificationText: string
  metricLabel: string
  durationMs: number
}

export const DEMO_AGENTS: readonly DemoAgent[] = [
  {
    id: 'agent-1',
    index: 1,
    handle: '@1',
    name: 'Lead Architect',
    role: 'Orchestrator & Consensus',
    model: 'Claude 3.7 Sonnet',
    vendor: 'Anthropic',
    vendorColor: '#f97316',
    themeColor: '#f8fafc',
    avatarBadge: '🏛️'
  },
  {
    id: 'agent-2',
    index: 2,
    handle: '@2',
    name: 'Core Systems',
    role: 'Execution & Low-Latency Kernel',
    model: 'GPT-4.5 Ultra',
    vendor: 'OpenAI',
    vendorColor: '#10b981',
    themeColor: '#ff6b00',
    avatarBadge: '⚡'
  },
  {
    id: 'agent-3',
    index: 3,
    handle: '@3',
    name: 'Context Miner',
    role: 'AST & Knowledge Graph',
    model: 'Gemini 2.5 Pro',
    vendor: 'Google',
    vendorColor: '#3b82f6',
    themeColor: '#38bdf8',
    avatarBadge: '🌐'
  },
  {
    id: 'agent-4',
    index: 4,
    handle: '@4',
    name: 'Algo Theorist',
    role: 'Formal Verification & Math',
    model: 'DeepSeek R1',
    vendor: 'DeepSeek',
    vendorColor: '#8b5cf6',
    themeColor: '#a855f7',
    avatarBadge: '🧠'
  },
  {
    id: 'agent-5',
    index: 5,
    handle: '@5',
    name: 'UI Specialist',
    role: 'Interactive Canvas & Ergonomics',
    model: 'Qwen 2.5 Coder',
    vendor: 'Alibaba',
    vendorColor: '#ec4899',
    themeColor: '#72ff5a',
    avatarBadge: '🎨'
  },
  {
    id: 'agent-6',
    index: 6,
    handle: '@6',
    name: 'Security Red-Team',
    role: 'Zero-Trust Boundary Auditor',
    model: 'Claude 3.7 Thinking',
    vendor: 'Anthropic',
    vendorColor: '#ef4444',
    themeColor: '#c7d2fe',
    avatarBadge: '🛡️'
  },
  {
    id: 'agent-7',
    index: 7,
    handle: '@7',
    name: 'Stream Telemetry',
    role: 'Socket Throughput & P99 SLA',
    model: 'Grok 3',
    vendor: 'xAI',
    vendorColor: '#06b6d4',
    themeColor: '#d946ef',
    avatarBadge: '📡'
  },
  {
    id: 'agent-8',
    index: 8,
    handle: '@8',
    name: 'QA Gatekeeper',
    role: 'Automated E2E Certification',
    model: 'OpenAI o3-mini',
    vendor: 'OpenAI',
    vendorColor: '#eab308',
    themeColor: '#fbbf24',
    avatarBadge: '✅'
  }
]

export const DEMO_STEPS: readonly DemoStep[] = [
  {
    step: 1,
    fromIndex: 1,
    toIndex: 2,
    motif: 'flame',
    phase: 'DELEGATE',
    title: 'TASK DISPATCH: High-Concurrency Kernel Protocol',
    summary: '@1 Claude 3.7 issues Contract-First task package to @2 GPT-4.5',
    commandText: 'a2a dispatch --contract "ring-buffer-v2" --priority critical',
    verificationText: 'Contract acknowledged. PTY allocated, isolation worktree branch ready.',
    metricLabel: 'Contract SLA: < 2.0ms',
    durationMs: 3200
  },
  {
    step: 2,
    fromIndex: 2,
    toIndex: 3,
    motif: 'water',
    phase: 'RESEARCH',
    title: 'AST & DEPENDENCY MAPPING: Context Graph Query',
    summary: '@2 GPT-4.5 queries @3 Gemini 2.5 Pro for AST dependents across 1,420 modules',
    commandText: 'graphify query --entry "src/kernel" --depth 4 --format json',
    verificationText: '1,420 symbols parsed. Zero circular dependencies found.',
    metricLabel: 'Graph Index: 1.4k Nodes',
    durationMs: 3000
  },
  {
    step: 3,
    fromIndex: 2,
    toIndex: 4,
    motif: 'thunder',
    phase: 'REASONING',
    title: 'MATHEMATICAL PROOF: Deadlock-Free Guarantee',
    summary: '@2 GPT-4.5 delegates non-blocking algorithm proof to @4 DeepSeek R1',
    commandText: 'deepseek proof --algo "lock-free-ring" --safety formal-liveness',
    verificationText:
      'Formal proof complete. P99 latency bounded at 1.14ms. Deadlock probability = 0.',
    metricLabel: 'Formal Proof: Q.E.D.',
    durationMs: 3400
  },
  {
    step: 4,
    fromIndex: 2,
    toIndex: 5,
    motif: 'foliage',
    phase: 'IMPLEMENT',
    title: 'COMPONENT SYNTHESIS: 60FPS Hologram Canvas',
    summary: '@2 GPT-4.5 assigns responsive reactive UI view to @5 Qwen 2.5 Coder',
    commandText: 'generate-component --name "A2AHologram" --fps 60 --theme dark-sleek',
    verificationText: 'Component bundled. React 19 tree rendered with zero redundant repaints.',
    metricLabel: 'Render: 60.0 FPS',
    durationMs: 3000
  },
  {
    step: 5,
    fromIndex: 2,
    toIndex: 7,
    motif: 'tornado',
    phase: 'TELEMETRY',
    title: 'STREAM TELEMETRY: Live Socket Throughput Validation',
    summary: '@2 GPT-4.5 pipes real-time telemetry stream to @7 Grok 3',
    commandText: 'grok stream --pipe "tcp://127.0.0.1:4020" --sample-rate 100khz',
    verificationText: '48,200 msg/sec sustained throughput. Zero packet drop under peak load.',
    metricLabel: 'Throughput: 48.2k msg/s',
    durationMs: 3200
  },
  {
    step: 6,
    fromIndex: 6,
    toIndex: 2,
    motif: 'chain',
    phase: 'SECURITY',
    title: 'RED-TEAM AUDIT: Sandboxing & PTY Escape Inspection',
    summary: '@6 Claude 3.7 Thinking performs read-only red-teaming and memory boundary audit',
    commandText: 'security-audit --sandbox zero-escape --fuzz-inputs 50000',
    verificationText: '0 CVEs detected. Memory leak = 0. All 50,000 fuzz vectors rejected safely.',
    metricLabel: 'Security: 100% Secure',
    durationMs: 3400
  },
  {
    step: 7,
    fromIndex: 2,
    toIndex: 8,
    motif: 'thunder',
    phase: 'VERIFY',
    title: 'ACCEPTANCE GATE: Automated End-to-End Regression',
    summary: '@2 GPT-4.5 submits candidate artifact to @8 o3-mini for final QA sign-off',
    commandText: 'qa-run --suite "e2e-integration" --strict-exit-codes',
    verificationText: '142 of 142 integration tests green. Vitest + Oxlint 0 errors.',
    metricLabel: 'Tests: 142/142 Passed',
    durationMs: 3200
  },
  {
    step: 8,
    fromIndex: 8,
    toIndex: 1,
    motif: 'gold',
    phase: 'VERIFY',
    title: 'CERTIFICATION REPORT: Production Merge Authorized',
    summary: '@8 o3-mini returns verified evidence receipt to @1 Lead Architect',
    commandText: 'sign-off --certificate "SHA256:7f56ca" --verdict APPROVED',
    verificationText:
      'Evidence cryptographic hash signed. PR ready for automatic fast-forward merge.',
    metricLabel: 'Verdict: APPROVED 🟢',
    durationMs: 3200
  },
  {
    step: 9,
    fromIndex: 1,
    toIndex: 8,
    motif: 'moonlight',
    phase: 'CONSENSUS',
    title: 'GLOBAL CONSENSUS: 8-Agent Mesh Fully Synchronized',
    summary: '@1 Claude 3.7 broadcasts consensus lock to all 8 collaborative nodes',
    commandText: 'mesh broadcast --consensus 2PC --commit-sha "7f56ca51c8"',
    verificationText:
      'Consensus finalized across 8 agents (6 AI architectures). Live deployment green.',
    metricLabel: 'Mesh State: 100% SYNC',
    durationMs: 3600
  }
]
