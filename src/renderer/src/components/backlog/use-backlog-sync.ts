import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { parseTerminalIndex, type A2ALinkEvent } from '../../../../shared/terminal-a2a-link'
import type {
  AssignedAgentInfo,
  BacklogItem,
  BacklogItemStatus
} from '../../../../shared/backlog-types'
import { useBacklogStore } from '../../store/backlog-store'

export function useBacklogSync(): {
  sessionInfo: { repoName: string; branch: string; worktreePath: string }
  activeAgents: AssignedAgentInfo[]
  items: BacklogItem[]
  loading: boolean
  refresh: () => Promise<void>
  dispatchTaskToAgent: (item: BacklogItem, agentIndex: number) => Promise<boolean>
} {
  const activeWorktreeId = useAppStore((s) => s.activeWorktreeId)
  const allWorktrees = useAppStore((s) => s.allWorktrees)
  const tabsByWorktree = useAppStore((s) => s.tabsByWorktree)
  const repos = useAppStore((s) => s.repos)
  const fetchWorkItems = useAppStore((s) => s.fetchWorkItems)
  const items = useBacklogStore((s) => s.items)
  const customItems = useBacklogStore((s) => s.customItems)
  const setItems = useBacklogStore((s) => s.setItems)
  const [loading, setLoading] = useState(false)

  // Current session context
  const activeWorktree = useMemo(() => {
    if (!activeWorktreeId || typeof allWorktrees !== 'function') {
      return null
    }
    return allWorktrees().find((w) => w.id === activeWorktreeId) ?? null
  }, [activeWorktreeId, allWorktrees])

  const targetRepo = useMemo(() => {
    if (!activeWorktree) {
      return repos[0] ?? null
    }
    return repos.find((r) => r.id === activeWorktree.repoId) ?? repos[0] ?? null
  }, [activeWorktree, repos])

  const sessionInfo = useMemo(() => {
    const worktreePath = activeWorktree?.path ?? targetRepo?.path ?? ''
    const repoName =
      targetRepo?.displayName ||
      (worktreePath ? worktreePath.split(/[/\\]/).pop() : '') ||
      'orca-workspace'
    const branch = activeWorktree?.branch || 'main'
    return { repoName, branch, worktreePath }
  }, [activeWorktree, targetRepo])

  // Active agents in current worktree
  const activeAgents = useMemo<AssignedAgentInfo[]>(() => {
    const tabs = activeWorktreeId ? (tabsByWorktree[activeWorktreeId] ?? []) : []
    const agents: AssignedAgentInfo[] = []

    tabs.forEach((tab, index) => {
      const parsed = parseTerminalIndex(tab.title) ?? index + 1
      const label = tab.title
        ? `@${parsed} ${tab.title.replace(/^@?\d+[:\s]*/, '')}`
        : `@${parsed} Agent`
      agents.push({
        index: parsed,
        label: label.trim(),
        terminalHandle: tab.id
      })
    })

    if (agents.length === 0) {
      agents.push({ index: 1, label: '@1 Supervisor' })
      agents.push({ index: 2, label: '@2 exec-cursor' })
      agents.push({ index: 4, label: '@4 Grok' })
    }

    return agents
  }, [activeWorktreeId, tabsByWorktree])

  // Fetch real backlog items from GitHub PRs, Issues, and Branches
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const fetchedItems: BacklogItem[] = []
      const currentBranch = sessionInfo.branch

      // 1. Current active branch
      if (currentBranch) {
        fetchedItems.push({
          id: `branch-${currentBranch}`,
          kind: 'branch',
          title: `Branch: ${currentBranch}`,
          ref: currentBranch,
          status: 'in_progress',
          assignedAgent: activeAgents.find((a) => a.index === 2) ?? activeAgents[0],
          updatedAt: Date.now()
        })
      }

      // Upstream tracking branch
      if (currentBranch !== 'main') {
        fetchedItems.push({
          id: 'branch-main',
          kind: 'branch',
          title: 'Branch: main (upstream tracking)',
          ref: 'main',
          status: 'completed',
          updatedAt: Date.now() - 3600000
        })
      }

      // Other open worktree branches
      if (typeof allWorktrees === 'function') {
        const otherTrees = allWorktrees().filter(
          (w) =>
            w.id !== activeWorktreeId &&
            w.branch &&
            w.branch !== currentBranch &&
            w.branch !== 'main'
        )
        for (const tree of otherTrees.slice(0, 4)) {
          fetchedItems.push({
            id: `branch-${tree.id}`,
            kind: 'branch',
            title: `Branch: ${tree.branch}`,
            ref: tree.branch!,
            status: tree.workspaceStatus === 'active' ? 'in_progress' : 'todo',
            updatedAt: tree.lastActivityAt || Date.now()
          })
        }
      }

      // 2. Fetch real GitHub PRs & Issues from active repository
      const repoId = targetRepo?.id ?? activeWorktree?.repoId
      const repoPath = targetRepo?.path ?? activeWorktree?.path
      if (repoId && repoPath && typeof fetchWorkItems === 'function') {
        try {
          const ghItems = await fetchWorkItems(repoId, repoPath, 30, '', { force: true })
          if (Array.isArray(ghItems)) {
            for (const ghItem of ghItems) {
              const isPr = ghItem.type === 'pr'
              const isCompleted = ghItem.state === 'closed' || ghItem.state === 'merged'
              const isCurrentBranch = Boolean(
                ghItem.branchName && ghItem.branchName === currentBranch
              )
              const isLinked = isPr
                ? activeWorktree?.linkedPR === ghItem.number
                : activeWorktree?.linkedIssue === ghItem.number

              let status: BacklogItemStatus = 'todo'
              if (isCompleted) {
                status = 'completed'
              } else if (isPr || isCurrentBranch || isLinked) {
                status = 'in_progress'
              }

              let assignedAgent: AssignedAgentInfo | undefined
              if (isCurrentBranch || isLinked) {
                assignedAgent = activeAgents.find((a) => a.index === 2) ?? activeAgents[0]
              }

              fetchedItems.push({
                id: `gh-${ghItem.type}-${ghItem.number}`,
                kind: isPr ? 'pr' : 'issue',
                title: `${isPr ? 'PR' : 'Issue'} #${ghItem.number}: ${ghItem.title}`,
                number: ghItem.number,
                ref: ghItem.branchName,
                url: ghItem.url,
                status,
                assignedAgent,
                labels: ghItem.labels,
                author: ghItem.author ?? undefined,
                updatedAt: ghItem.updatedAt ? new Date(ghItem.updatedAt).getTime() : Date.now()
              })
            }
          }
        } catch (err: unknown) {
          console.warn('[BacklogSync] Failed to fetch GitHub items for repo:', repoId, err)
        }
      }

      setItems(fetchedItems)
    } catch (err: unknown) {
      console.warn('[BacklogSync] Failed to refresh backlog items:', err)
    } finally {
      setLoading(false)
    }
  }, [
    sessionInfo.branch,
    activeAgents,
    allWorktrees,
    activeWorktreeId,
    targetRepo,
    activeWorktree,
    fetchWorkItems,
    setItems
  ])

  useEffect(() => {
    void refresh()
  }, [activeWorktreeId, refresh])

  // Dispatch a backlog task to a specific agent terminal PTY
  const dispatchTaskToAgent = useCallback(
    async (item: BacklogItem, agentIndex: number): Promise<boolean> => {
      const target = `@${agentIndex}`
      const instruction = `[Backlog Task Assignment] 請接手處理項目: [${item.kind.toUpperCase()}] ${item.title}`
      if (!activeWorktreeId) {
        toast.error('A2A 派工只送到目前這個 Session。請先選取一個 Session。')
        return false
      }

      if (typeof window !== 'undefined' && window.api?.ui?.sendA2ALink) {
        try {
          const event: A2ALinkEvent = {
            id: `backlog-dispatch-${Date.now()}`,
            from: '@backlog-agent',
            to: target,
            fromIndex: 0,
            toIndex: agentIndex,
            fromLabel: 'Backlog Agent',
            toLabel: `Agent ${target}`,
            type: 'send',
            text: instruction,
            timestamp: Date.now(),
            dispatch: true,
            worktreeId: activeWorktreeId
          }
          await window.api.ui.sendA2ALink(event)
          toast.success(`🟢 已將「${item.title}」派工給 ${target} PTY 執行！`)
          return true
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          toast.error(`派工至 ${target} 失敗: ${msg}`)
          return false
        }
      }
      toast.info(`已指派「${item.title}」至 ${target}`)
      return true
    },
    [activeWorktreeId]
  )

  const combinedItems = useMemo(() => {
    return [...customItems, ...items]
  }, [customItems, items])

  return {
    sessionInfo,
    activeAgents,
    items: combinedItems,
    loading,
    refresh,
    dispatchTaskToAgent
  }
}
