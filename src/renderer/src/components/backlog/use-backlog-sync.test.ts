// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useBacklogSync } from './use-backlog-sync'
import { useAppStore } from '@/store'
import { useBacklogStore } from '../../store/backlog-store'
import type { GitHubWorkItem } from '../../../../shared/github/work-item-types'
import type { Worktree } from '../../../../shared/worktree/types'
import type { Repo } from '../../../../shared/repo-types'

describe('useBacklogSync', () => {
  const mockRepo: Repo = {
    id: 'repo-twin3',
    path: '/path/to/twin3-sdk',
    displayName: 'twin3-sdk',
    badgeColor: '#00aa00',
    addedAt: Date.now()
  }

  const mockWorktree = {
    id: 'repo-twin3::/path/to/twin3-sdk',
    repoId: 'repo-twin3',
    path: '/path/to/twin3-sdk',
    displayName: 'twin3-sdk-main',
    comment: '',
    linkedIssue: 42,
    linkedPR: null,
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: Date.now(),
    branch: 'feat/twin3-agent-bridge'
  } as unknown as Worktree

  const mockGhItems: GitHubWorkItem[] = [
    {
      id: 'gh-pr-123',
      type: 'pr',
      number: 123,
      title: 'feat: add agent message routing',
      state: 'open',
      url: 'https://github.com/twin3/sdk/pull/123',
      labels: ['agent', 'core'],
      updatedAt: '2026-09-20T05:00:00Z',
      author: 'ming',
      branchName: 'feat/twin3-agent-bridge',
      repoId: 'repo-twin3'
    },
    {
      id: 'gh-issue-42',
      type: 'issue',
      number: 42,
      title: 'Issue 42: Support multi-agent dispatch queue',
      state: 'open',
      url: 'https://github.com/twin3/sdk/issues/42',
      labels: ['enhancement'],
      updatedAt: '2026-09-20T04:00:00Z',
      author: 'ming',
      repoId: 'repo-twin3'
    },
    {
      id: 'gh-pr-99',
      type: 'pr',
      number: 99,
      title: 'chore: bump dependencies',
      state: 'closed',
      url: 'https://github.com/twin3/sdk/pull/99',
      labels: ['dependencies'],
      updatedAt: '2026-09-19T10:00:00Z',
      author: 'dependabot',
      branchName: 'chore/deps',
      repoId: 'repo-twin3'
    }
  ]

  beforeEach(() => {
    useBacklogStore.setState({
      items: [],
      customItems: [],
      isBacklogOpen: false
    })

    useAppStore.setState({
      activeWorktreeId: mockWorktree.id,
      repos: [mockRepo],
      allWorktrees: () => [mockWorktree],
      tabsByWorktree: {
        [mockWorktree.id]: [
          { id: 'tab-1', title: '@1 Supervisor' },
          { id: 'tab-2', title: '@2 exec-cursor' }
        ] as never
      },
      fetchWorkItems: vi.fn().mockResolvedValue(mockGhItems) as never
    })
  })

  it('correctly maps GitHub items into BacklogItem and sets statuses based on branch/linked info', async () => {
    const { result } = renderHook(() => useBacklogSync())

    await waitFor(() => {
      expect(result.current.items.length).toBeGreaterThan(0)
    })

    expect(result.current.sessionInfo.repoName).toBe('twin3-sdk')
    expect(result.current.sessionInfo.branch).toBe('feat/twin3-agent-bridge')

    const items = result.current.items
    // 1. Check current branch item
    const branchItem = items.find((i) => i.kind === 'branch' && i.ref === 'feat/twin3-agent-bridge')
    expect(branchItem).toBeDefined()
    expect(branchItem?.status).toBe('in_progress')

    // 2. Check PR matching current branch
    const matchingPr = items.find((i) => i.kind === 'pr' && i.number === 123)
    expect(matchingPr).toBeDefined()
    expect(matchingPr?.status).toBe('in_progress')
    expect(matchingPr?.title).toContain('PR #123')
    expect(matchingPr?.url).toBe('https://github.com/twin3/sdk/pull/123')

    // 3. Check Linked Issue
    const linkedIssue = items.find((i) => i.kind === 'issue' && i.number === 42)
    expect(linkedIssue).toBeDefined()
    expect(linkedIssue?.status).toBe('in_progress')
    expect(linkedIssue?.assignedAgent).toBeDefined()

    // 4. Check Closed PR
    const closedPr = items.find((i) => i.kind === 'pr' && i.number === 99)
    expect(closedPr).toBeDefined()
    expect(closedPr?.status).toBe('completed')
  })

  it('dispatches task to agent terminal PTY via sendA2ALink', async () => {
    const sendA2ALinkMock = vi.fn().mockResolvedValue({ success: true })
    window.api = {
      ui: {
        sendA2ALink: sendA2ALinkMock
      }
    } as never

    const { result } = renderHook(() => useBacklogSync())

    const dummyItem = {
      id: 'gh-pr-123',
      kind: 'pr' as const,
      title: 'PR #123: feat: add agent message routing',
      status: 'in_progress' as const
    }

    let ok = false
    await act(async () => {
      ok = await result.current.dispatchTaskToAgent(dummyItem, 2)
    })

    expect(ok).toBe(true)
    expect(sendA2ALinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '@2',
        toIndex: 2,
        dispatch: true,
        text: expect.stringContaining('PR #123')
      })
    )
  })
})
