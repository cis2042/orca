// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { computeProjectRailSummary, ProjectIconRail } from './ProjectIconRail'
import type { Worktree } from '../../../../shared/worktree/types'
import type { Repo } from '../../../../shared/repo-types'
import type { ProjectGroup } from '../../../../shared/project-group-types'
import type { WorktreeStatus } from '@/lib/worktree-status'

const mocks = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  setActiveWorktree: vi.fn(),
  setSidebarOpen: vi.fn(),
  openSettingsPage: vi.fn(),
  reorderRepos: vi.fn(),
  moveProjectToGroup: vi.fn(),
  updateProjectGroup: vi.fn(),
  toggleCollapsedGroup: vi.fn(),
  createProjectGroup: vi.fn(),
  deleteProjectGroupWithContainedProjects: vi.fn(),
  allWorktrees: [] as Worktree[],
  statuses: new Map<string, WorktreeStatus>()
}))

vi.mock('@/store', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) => selector(mocks.state)
}))

vi.mock('@/store/selectors', () => ({
  useAllWorktrees: () => mocks.allWorktrees
}))

vi.mock('./use-worktree-activity-statuses', () => ({
  useWorktreeActivityStatuses: () => mocks.statuses
}))

describe('computeProjectRailSummary', () => {
  it('identifies running status when any worktree is working, monitoring, or needs permission', () => {
    const worktree1: Partial<Worktree> = { id: 'wt-1', isUnread: false }
    const worktree2: Partial<Worktree> = { id: 'wt-2', isUnread: true }
    const statuses = new Map<string, WorktreeStatus>([
      ['wt-1', 'working'],
      ['wt-2', 'active']
    ])

    const summary = computeProjectRailSummary([worktree1, worktree2] as Worktree[], statuses)
    expect(summary.status).toBe('running')
    expect(summary.runningCount).toBe(1)
    expect(summary.unreadCount).toBe(1)
    expect(summary.totalCount).toBe(2)
  })

  it('identifies completed status with unread bell when not running and has unread/done', () => {
    const worktree1: Partial<Worktree> = { id: 'wt-1', isUnread: true }
    const worktree2: Partial<Worktree> = { id: 'wt-2', isUnread: false }
    const statuses = new Map<string, WorktreeStatus>([
      ['wt-1', 'active'],
      ['wt-2', 'done']
    ])

    const summary = computeProjectRailSummary([worktree1, worktree2] as Worktree[], statuses)
    expect(summary.status).toBe('completed')
    expect(summary.runningCount).toBe(0)
    expect(summary.unreadCount).toBe(2)
  })

  it('identifies idle status when no worktree is working or unread', () => {
    const worktree1: Partial<Worktree> = { id: 'wt-1', isUnread: false }
    const statuses = new Map<string, WorktreeStatus>([['wt-1', 'active']])

    const summary = computeProjectRailSummary([worktree1] as Worktree[], statuses)
    expect(summary.status).toBe('idle')
    expect(summary.runningCount).toBe(0)
    expect(summary.unreadCount).toBe(0)
  })
})

describe('ProjectIconRail UI', () => {
  let container: HTMLDivElement | null = null
  let root: Root | null = null

  const repos: Repo[] = [
    {
      id: 'repo-1',
      displayName: 'xHuman-id',
      badgeColor: '#10b981',
      repoIcon: { type: 'emoji', emoji: '🌐' },
      path: '/path/to/repo1',
      addedAt: Date.now()
    },
    {
      id: 'repo-2',
      displayName: 'Pitch',
      badgeColor: '#f43f5e',
      repoIcon: { type: 'emoji', emoji: '🚀' },
      path: '/path/to/repo2',
      addedAt: Date.now()
    },
    {
      id: 'repo-3',
      displayName: 'Zoo',
      badgeColor: '#eab308',
      repoIcon: { type: 'emoji', emoji: '🐣' },
      path: '/path/to/repo3',
      addedAt: Date.now()
    }
  ]

  const worktrees: Worktree[] = [
    {
      id: 'wt-1',
      repoId: 'repo-1',
      displayName: 'main',
      isUnread: false,
      isMainWorktree: true,
      path: '/path/to/repo1/main',
      head: 'hash1',
      branch: 'main',
      isBare: false,
      comment: '',
      linkedIssue: null,
      linkedPR: null,
      linkedLinearIssue: null,
      isArchived: false,
      isPinned: false,
      sortOrder: 0,
      lastActivityAt: Date.now()
    },
    {
      id: 'wt-2',
      repoId: 'repo-2',
      displayName: 'main',
      isUnread: true,
      isMainWorktree: true,
      path: '/path/to/repo2/main',
      head: 'hash2',
      branch: 'main',
      isBare: false,
      comment: '',
      linkedIssue: null,
      linkedPR: null,
      linkedLinearIssue: null,
      isArchived: false,
      isPinned: false,
      sortOrder: 0,
      lastActivityAt: Date.now()
    },
    {
      id: 'wt-3',
      repoId: 'repo-3',
      displayName: 'main',
      isUnread: false,
      isMainWorktree: true,
      path: '/path/to/repo3/main',
      head: 'hash3',
      branch: 'main',
      isBare: false,
      comment: '',
      linkedIssue: null,
      linkedPR: null,
      linkedLinearIssue: null,
      isArchived: false,
      isPinned: false,
      sortOrder: 0,
      lastActivityAt: Date.now()
    }
  ]

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    mocks.setActiveWorktree.mockClear()
    mocks.setSidebarOpen.mockClear()
    mocks.openSettingsPage.mockClear()
    mocks.reorderRepos.mockClear()
    mocks.moveProjectToGroup.mockClear()
    mocks.updateProjectGroup.mockClear()
    mocks.toggleCollapsedGroup.mockClear()

    mocks.allWorktrees = worktrees
    mocks.statuses = new Map<string, WorktreeStatus>([
      ['wt-1', 'working'], // repo-1 is running
      ['wt-2', 'active'], // repo-2 is completed (isUnread: true)
      ['wt-3', 'inactive'] // repo-3 is idle
    ])

    mocks.state = {
      repos,
      projectGroups: [] as ProjectGroup[],
      collapsedGroups: new Set<string>(),
      activeWorktreeId: 'wt-3',
      setActiveWorktree: mocks.setActiveWorktree,
      setSidebarOpen: mocks.setSidebarOpen,
      openSettingsPage: mocks.openSettingsPage,
      reorderRepos: mocks.reorderRepos,
      moveProjectToGroup: mocks.moveProjectToGroup,
      updateProjectGroup: mocks.updateProjectGroup,
      toggleCollapsedGroup: mocks.toggleCollapsedGroup,
      createProjectGroup: mocks.createProjectGroup,
      deleteProjectGroupWithContainedProjects: mocks.deleteProjectGroupWithContainedProjects
    }
  })

  afterEach(() => {
    if (root && container) {
      act(() => {
        root?.unmount()
      })
      container.remove()
    }
  })

  it('renders all projects with their status badges in the rail', () => {
    act(() => {
      root?.render(
        <TooltipProvider delayDuration={0}>
          <ProjectIconRail />
        </TooltipProvider>
      )
    })

    const rail = container?.querySelector('[data-project-icon-rail="true"]')
    expect(rail).not.toBeNull()

    const item1 = container?.querySelector('[data-project-rail-item="repo-1"]')
    expect(item1).not.toBeNull()
    expect(item1?.getAttribute('data-project-rail-status')).toBe('running')

    const item2 = container?.querySelector('[data-project-rail-item="repo-2"]')
    expect(item2).not.toBeNull()
    expect(item2?.getAttribute('data-project-rail-status')).toBe('completed')

    const item3 = container?.querySelector('[data-project-rail-item="repo-3"]')
    expect(item3).not.toBeNull()
    expect(item3?.getAttribute('data-project-rail-status')).toBe('idle')
  })

  it('expands sidebar when the top expand button is clicked', () => {
    act(() => {
      root?.render(
        <TooltipProvider delayDuration={0}>
          <ProjectIconRail />
        </TooltipProvider>
      )
    })

    const expandBtn = container?.querySelector(
      'button[aria-label="Expand sidebar"]'
    ) as HTMLButtonElement | null
    expect(expandBtn).not.toBeNull()

    act(() => {
      expandBtn?.click()
    })

    expect(mocks.setSidebarOpen).toHaveBeenCalledWith(true)
  })

  it('does not render the accidental full-hide button', () => {
    act(() => {
      root?.render(
        <TooltipProvider delayDuration={0}>
          <ProjectIconRail />
        </TooltipProvider>
      )
    })

    const hideBtn = container?.querySelector(
      'button[aria-label="Hide sidebar completely"]'
    ) as HTMLButtonElement | null
    expect(hideBtn).toBeNull()
  })

  it('activates target worktree when clicking a non-active project', () => {
    act(() => {
      root?.render(
        <TooltipProvider delayDuration={0}>
          <ProjectIconRail />
        </TooltipProvider>
      )
    })

    const item1 = container?.querySelector(
      '[data-project-rail-item="repo-1"]'
    ) as HTMLButtonElement | null
    act(() => {
      item1?.click()
    })

    expect(mocks.setActiveWorktree).toHaveBeenCalledWith('wt-1')
  })

  it('renders projects grouped by project group when projectGroups are present', () => {
    const projectGroups: ProjectGroup[] = [
      {
        id: 'group-a',
        name: 'Backend Group',
        color: '#3b82f6',
        tabOrder: 0,
        isCollapsed: false,
        parentGroupId: null,
        parentPath: null,
        createdFrom: 'manual',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]

    const groupedRepos: Repo[] = [
      { ...repos[0], projectGroupId: 'group-a', projectGroupOrder: 0 },
      { ...repos[1], projectGroupId: 'group-a', projectGroupOrder: 1 },
      { ...repos[2], projectGroupId: null } // ungrouped
    ]

    mocks.state = {
      ...mocks.state,
      repos: groupedRepos,
      projectGroups
    }

    act(() => {
      root?.render(
        <TooltipProvider delayDuration={0}>
          <ProjectIconRail />
        </TooltipProvider>
      )
    })

    const groupHeader = container?.querySelector('[data-project-rail-group="group-a"]')
    expect(groupHeader).not.toBeNull()
    expect(groupHeader?.getAttribute('data-project-rail-group-collapsed')).toBe('false')

    // Both grouped items and ungrouped item exist
    expect(container?.querySelector('[data-project-rail-item="repo-1"]')).not.toBeNull()
    expect(container?.querySelector('[data-project-rail-item="repo-2"]')).not.toBeNull()
    expect(container?.querySelector('[data-project-rail-item="repo-3"]')).not.toBeNull()
  })

  it('toggles group collapse when group header is clicked', () => {
    const projectGroups: ProjectGroup[] = [
      {
        id: 'group-a',
        name: 'Backend Group',
        color: '#3b82f6',
        tabOrder: 0,
        isCollapsed: false,
        parentGroupId: null,
        parentPath: null,
        createdFrom: 'manual',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]

    const groupedRepos: Repo[] = [{ ...repos[0], projectGroupId: 'group-a', projectGroupOrder: 0 }]

    mocks.state = {
      ...mocks.state,
      repos: groupedRepos,
      projectGroups
    }

    act(() => {
      root?.render(
        <TooltipProvider delayDuration={0}>
          <ProjectIconRail />
        </TooltipProvider>
      )
    })

    const groupHeader = container?.querySelector(
      '[data-project-rail-group="group-a"]'
    ) as HTMLDivElement | null
    expect(groupHeader).not.toBeNull()

    act(() => {
      groupHeader?.click()
    })

    expect(mocks.toggleCollapsedGroup).toHaveBeenCalledWith('project-group:group-a')
  })

  it('hides contained items when group is collapsed in collapsedGroups set', () => {
    const projectGroups: ProjectGroup[] = [
      {
        id: 'group-a',
        name: 'Backend Group',
        color: '#3b82f6',
        tabOrder: 0,
        isCollapsed: false,
        parentGroupId: null,
        parentPath: null,
        createdFrom: 'manual',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]

    const groupedRepos: Repo[] = [{ ...repos[0], projectGroupId: 'group-a', projectGroupOrder: 0 }]

    mocks.state = {
      ...mocks.state,
      repos: groupedRepos,
      projectGroups,
      collapsedGroups: new Set(['project-group:group-a'])
    }

    act(() => {
      root?.render(
        <TooltipProvider delayDuration={0}>
          <ProjectIconRail />
        </TooltipProvider>
      )
    })

    const groupHeader = container?.querySelector('[data-project-rail-group="group-a"]')
    expect(groupHeader).not.toBeNull()
    expect(groupHeader?.getAttribute('data-project-rail-group-collapsed')).toBe('true')

    // Contained item is not rendered when collapsed
    expect(container?.querySelector('[data-project-rail-item="repo-1"]')).toBeNull()
  })

  it('triggers reorderRepos on drag and drop between items', () => {
    act(() => {
      root?.render(
        <TooltipProvider delayDuration={0}>
          <ProjectIconRail />
        </TooltipProvider>
      )
    })

    const item1 = container?.querySelector('[data-project-rail-item="repo-1"]')
    const item1Wrapper = item1?.closest('[draggable="true"]')
    const item3 = container?.querySelector('[data-project-rail-item="repo-3"]')
    const item3Wrapper = item3?.closest('[draggable="true"]')
    expect(item1Wrapper).not.toBeNull()
    expect(item3Wrapper).not.toBeNull()

    const dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn().mockReturnValue('repo-1'),
      effectAllowed: 'move',
      dropEffect: 'move'
    }

    act(() => {
      const dragStartEvt = new Event('dragstart', { bubbles: true })
      Object.defineProperty(dragStartEvt, 'dataTransfer', { value: dataTransfer })
      item1Wrapper?.dispatchEvent(dragStartEvt)
    })

    act(() => {
      const dragOverEvt = new Event('dragover', { bubbles: true })
      Object.defineProperty(dragOverEvt, 'dataTransfer', { value: dataTransfer })
      Object.defineProperty(dragOverEvt, 'clientY', { value: 100 })
      item3Wrapper?.dispatchEvent(dragOverEvt)

      const dropEvt = new Event('drop', { bubbles: true })
      Object.defineProperty(dropEvt, 'dataTransfer', { value: dataTransfer })
      item3Wrapper?.dispatchEvent(dropEvt)
    })

    expect(mocks.reorderRepos).toHaveBeenCalled()
  })
})
