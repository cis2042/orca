import { toast } from 'sonner'
import { absolutePathToFileUri } from '@/components/editor/markdown-internal-links'
import { openFileInBrowserTab } from '@/lib/file-preview'
import { isPathInsideWorktree } from '@/lib/terminal-links'
import { activateAndRevealWorktree } from '@/lib/worktree-activation'
import { fileUriToFilesystemPath } from '../../../../shared/file-uri-path'
import { useAppStore } from '@/store'
import type { LinkActionRequest } from './link-action-request'

export type ResolvedHtmlPreview = {
  url: string
  title: string
  filePath: string | null
  worktreeId: string
}

function resolveFilePathFromUri(uri: string): { filePath: string | null; url: string } {
  try {
    const parsed = new URL(uri)
    const filePath = fileUriToFilesystemPath(parsed)
    return { filePath, url: parsed.toString() }
  } catch {
    const raw = uri.replace(/^file:\/\//i, '')
    const decoded = decodeURIComponent(raw.startsWith('/') ? raw : `/${raw}`)
    return { filePath: decoded, url: absolutePathToFileUri(decoded) }
  }
}

export function resolveHtmlPreview(rawDestination: string): ResolvedHtmlPreview | null {
  if (!rawDestination || typeof rawDestination !== 'string') {
    return null
  }

  const destination = rawDestination.trim()
  let url = ''
  let filePath: string | null = null

  if (/^file:\/\//i.test(destination)) {
    const resolved = resolveFilePathFromUri(destination)
    filePath = resolved.filePath
    url = resolved.url
  } else if (/^https?:\/\//i.test(destination)) {
    url = destination
    filePath = null
  } else {
    const isAbsolute =
      destination.startsWith('/') ||
      /^[a-zA-Z]:[/\\]/.test(destination) ||
      destination.startsWith('\\\\')
    if (isAbsolute) {
      filePath = destination
      url = absolutePathToFileUri(destination)
    } else {
      let rootPath: string | null = null
      try {
        const store = useAppStore.getState()
        const activeWorktreeId = store.activeWorktreeId
        if (activeWorktreeId) {
          const activeWorktree = store.getKnownWorktreeById(activeWorktreeId)
          rootPath = activeWorktree?.path ?? null
        }
      } catch {}
      const combined = rootPath
        ? `${rootPath.replace(/[/\\]+$/, '')}/${destination.replace(/^\.[/\\]/, '')}`
        : destination
      filePath = combined
      url = absolutePathToFileUri(combined)
    }
  }

  let worktreeId = ''
  try {
    const store = useAppStore.getState()
    const allWorktrees = typeof store.allWorktrees === 'function' ? store.allWorktrees() : []
    if (filePath) {
      const match = allWorktrees.find((w) => w.path && isPathInsideWorktree(filePath!, w.path))
      if (match?.id) {
        worktreeId = match.id
      }
    }
    if (!worktreeId) {
      worktreeId = store.activeWorktreeId ?? allWorktrees[0]?.id ?? ''
    }
  } catch {}

  const rawName = (filePath ?? destination).split(/[/\\]/).pop()?.split(/[?#]/)[0] ?? 'HTML Preview'
  const title = decodeURIComponent(rawName) || 'HTML Preview'

  return {
    url,
    title,
    filePath,
    worktreeId
  }
}

export function openHtmlPreview(request: LinkActionRequest, onClose: () => void): void {
  onClose()
  request.restoreFocus()
  const resolved = resolveHtmlPreview(request.destination)
  if (!resolved) {
    return
  }

  const store = useAppStore.getState()
  if (resolved.worktreeId) {
    activateAndRevealWorktree(resolved.worktreeId, { providesInitialSurface: true })
  }

  if (resolved.filePath) {
    try {
      const plan = openFileInBrowserTab({
        filePath: resolved.filePath,
        worktreeId: resolved.worktreeId
      })
      if (plan.status !== 'unsupported') {
        toast.success(`🌐 已在內建瀏覽器開啟: ${resolved.title}`)
        return
      }
    } catch {}
  }

  store.createBrowserTab(resolved.worktreeId, resolved.url, {
    title: resolved.title,
    activate: true
  })
  toast.success(`🌐 已在內建瀏覽器開啟: ${resolved.title}`)
}
