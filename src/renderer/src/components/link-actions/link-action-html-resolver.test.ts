// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { openHtmlPreview, resolveHtmlPreview } from './link-action-html-resolver'
import type { LinkActionRequest } from './link-action-request'

const mocks = vi.hoisted(() => ({
  createBrowserTab: vi.fn(),
  activateAndRevealWorktree: vi.fn(),
  openFileInBrowserTab: vi.fn(),
  toastSuccess: vi.fn()
}))

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess }
}))

vi.mock('@/lib/worktree-activation', () => ({
  activateAndRevealWorktree: mocks.activateAndRevealWorktree
}))

vi.mock('@/lib/file-preview', () => ({
  openFileInBrowserTab: mocks.openFileInBrowserTab
}))

const mockWorktrees = [
  { id: 'wt-zoo', path: '/Users/cis2042/orca/projects/zoo group' },
  { id: 'wt-main', path: '/Users/cis2042/orca/projects/1/orca' }
]

vi.mock('@/store', () => ({
  useAppStore: {
    getState: () => ({
      activeWorktreeId: 'wt-main',
      allWorktrees: () => mockWorktrees,
      getKnownWorktreeById: (id: string) => mockWorktrees.find((w) => w.id === id),
      createBrowserTab: mocks.createBrowserTab
    })
  }
}))

describe('link-action-html-resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('correctly resolves file URI with spaces and matches owning worktree', () => {
    const rawDestination = 'file:///Users/cis2042/orca/projects/zoo group/zoo_financial_pitch.html'
    const resolved = resolveHtmlPreview(rawDestination)

    expect(resolved).not.toBeNull()
    expect(resolved?.filePath).toBe(
      '/Users/cis2042/orca/projects/zoo group/zoo_financial_pitch.html'
    )
    expect(resolved?.url).toBe(
      'file:///Users/cis2042/orca/projects/zoo%20group/zoo_financial_pitch.html'
    )
    expect(resolved?.title).toBe('zoo_financial_pitch.html')
    expect(resolved?.worktreeId).toBe('wt-zoo')
  })

  it('correctly resolves encoded file URI', () => {
    const rawDestination =
      'file:///Users/cis2042/orca/projects/zoo%20group/zoo_financial_pitch.html'
    const resolved = resolveHtmlPreview(rawDestination)

    expect(resolved).not.toBeNull()
    expect(resolved?.filePath).toBe(
      '/Users/cis2042/orca/projects/zoo group/zoo_financial_pitch.html'
    )
    expect(resolved?.url).toBe(
      'file:///Users/cis2042/orca/projects/zoo%20group/zoo_financial_pitch.html'
    )
    expect(resolved?.title).toBe('zoo_financial_pitch.html')
    expect(resolved?.worktreeId).toBe('wt-zoo')
  })

  it('resolves relative html path against active worktree path', () => {
    const rawDestination = './subfolder/preview.html'
    const resolved = resolveHtmlPreview(rawDestination)

    expect(resolved).not.toBeNull()
    expect(resolved?.filePath).toBe('/Users/cis2042/orca/projects/1/orca/subfolder/preview.html')
    expect(resolved?.url).toBe('file:///Users/cis2042/orca/projects/1/orca/subfolder/preview.html')
    expect(resolved?.title).toBe('preview.html')
    expect(resolved?.worktreeId).toBe('wt-main')
  })

  it('resolves absolute POSIX path and extracts clean title', () => {
    const rawDestination = '/tmp/test_report.html?query=1#section'
    const resolved = resolveHtmlPreview(rawDestination)

    expect(resolved).not.toBeNull()
    expect(resolved?.filePath).toBe('/tmp/test_report.html?query=1#section')
    expect(resolved?.title).toBe('test_report.html')
  })

  it('resolves web http URL without mutating into file URL', () => {
    const rawDestination = 'http://localhost:3000/demo.html'
    const resolved = resolveHtmlPreview(rawDestination)

    expect(resolved).not.toBeNull()
    expect(resolved?.filePath).toBeNull()
    expect(resolved?.url).toBe('http://localhost:3000/demo.html')
    expect(resolved?.title).toBe('demo.html')
  })

  it('activates worktree and opens file in browser tab when clicked', () => {
    mocks.openFileInBrowserTab.mockReturnValue({
      status: 'browser-tab',
      url: 'file://...',
      title: 'pitch'
    })
    const request: LinkActionRequest = {
      anchorX: 10,
      anchorY: 20,
      destination: 'file:///Users/cis2042/orca/projects/zoo group/zoo_financial_pitch.html',
      kind: 'url',
      primary: { label: 'Open', run: vi.fn() },
      restoreFocus: vi.fn()
    }
    const onClose = vi.fn()

    openHtmlPreview(request, onClose)

    expect(onClose).toHaveBeenCalledOnce()
    expect(request.restoreFocus).toHaveBeenCalledOnce()
    expect(mocks.activateAndRevealWorktree).toHaveBeenCalledWith('wt-zoo', {
      providesInitialSurface: true
    })
    expect(mocks.openFileInBrowserTab).toHaveBeenCalledWith({
      filePath: '/Users/cis2042/orca/projects/zoo group/zoo_financial_pitch.html',
      worktreeId: 'wt-zoo'
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      '🌐 已在內建瀏覽器開啟: zoo_financial_pitch.html'
    )
    expect(mocks.createBrowserTab).not.toHaveBeenCalled()
  })

  it('falls back to createBrowserTab if openFileInBrowserTab is unsupported', () => {
    mocks.openFileInBrowserTab.mockReturnValue({
      status: 'unsupported',
      message: 'error',
      reason: 'no-channel'
    })
    const request: LinkActionRequest = {
      anchorX: 10,
      anchorY: 20,
      destination: 'file:///Users/cis2042/orca/projects/zoo group/zoo_financial_pitch.html',
      kind: 'url',
      primary: { label: 'Open', run: vi.fn() },
      restoreFocus: vi.fn()
    }
    const onClose = vi.fn()

    openHtmlPreview(request, onClose)

    expect(mocks.createBrowserTab).toHaveBeenCalledWith(
      'wt-zoo',
      'file:///Users/cis2042/orca/projects/zoo%20group/zoo_financial_pitch.html',
      { title: 'zoo_financial_pitch.html', activate: true }
    )
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      '🌐 已在內建瀏覽器開啟: zoo_financial_pitch.html'
    )
  })
})
