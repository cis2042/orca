import { describe, expect, it } from 'vitest'
import type { Worktree } from '../../../shared/worktree/types'
import { planIdleWorktreeRemovals } from './idle-worktree-auto-removal'

const HOUR = 60 * 60 * 1000
const NOW = 10 * HOUR

function wt(id: string, overrides: Partial<Worktree> = {}): Worktree {
  return {
    id,
    isMainWorktree: false,
    isPinned: false,
    lastActivityAt: NOW - 2 * HOUR,
    ...overrides
  } as Worktree
}

function plan(
  worktrees: Worktree[],
  extra: Partial<Parameters<typeof planIdleWorktreeRemovals>[0]> = {}
) {
  return planIdleWorktreeRemovals({
    worktrees,
    activeWorktreeId: null,
    deletingWorktreeIds: new Set(),
    isActive: () => false,
    skippedWorktreeIds: new Set(),
    idleMs: HOUR,
    now: NOW,
    ...extra
  }).map((w) => w.id)
}

describe('planIdleWorktreeRemovals', () => {
  it('removes worktrees idle past the window', () => {
    expect(plan([wt('old'), wt('recent', { lastActivityAt: NOW - 10 * 60 * 1000 })])).toEqual([
      'old'
    ])
  })

  it('keeps main, pinned, remote-owned, active, deleting, and skipped worktrees', () => {
    const rows = [
      wt('main', { isMainWorktree: true }),
      wt('pinned', { isPinned: true }),
      wt('remote', { runtimeOwnerEnvironmentId: 'env' }),
      wt('focused'),
      wt('deleting'),
      wt('skipped'),
      wt('live')
    ]
    expect(
      plan(rows, {
        activeWorktreeId: 'focused',
        deletingWorktreeIds: new Set(['deleting']),
        skippedWorktreeIds: new Set(['skipped']),
        isActive: (id) => id === 'live'
      })
    ).toEqual([])
  })

  it('treats unknown activity time as not idle and honours a fresh createdAt', () => {
    expect(
      plan([wt('unknown', { lastActivityAt: 0 }), wt('new', { createdAt: NOW - 60 * 1000 })])
    ).toEqual([])
  })
})
