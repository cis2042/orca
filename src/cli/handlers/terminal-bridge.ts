import type {
  BrowserClickResult,
  BrowserEvalResult,
  BrowserFillResult,
  BrowserSnapshotResult,
  BrowserTabListResult,
  BrowserTabShowResult,
  BrowserTypeResult,
  RuntimeTerminalListResult,
  RuntimeTerminalRead,
  RuntimeTerminalRename,
  RuntimeTerminalSend
} from '../../shared/runtime-types'
import { parseTerminalIndex } from '../../shared/terminal-a2a-link'
import type { CommandHandler, HandlerContext } from '../dispatch'
import { getOptionalPositiveIntegerFlag, getOptionalStringFlag } from '../flags'
import { formatSnapshot } from '../format'
import { RuntimeClientError } from '../runtime-client'
import {
  getBrowserWorktreeSelector,
  isBrowserTarget,
  resolveBrowserTarget,
  resolveTerminalTarget,
  type ResolvedBrowserTarget
} from '../selectors'
import {
  clearRead,
  formatBridgeList,
  KEY_MAP,
  markRead,
  requireRead
} from './terminal-bridge-guard'

type TargetResolution = {
  targetDisplay: string
  handle: string
  worktree: string | undefined
  isBrowser: boolean
  browserInfo?: ResolvedBrowserTarget
}

async function resolveTargetAndHandle(
  targetArg: string | undefined,
  ctx: HandlerContext
): Promise<TargetResolution> {
  if (!targetArg) {
    throw new RuntimeClientError(
      'invalid_argument',
      'Target is required (e.g. @1, @2 for terminals, or @b1, @b2 for browsers).'
    )
  }
  const worktree = await getBrowserWorktreeSelector(ctx.flags, ctx.cwd, ctx.client)
  if (isBrowserTarget(targetArg)) {
    const browserInfo = await resolveBrowserTarget(targetArg, worktree, ctx.client)
    return {
      targetDisplay: `@b${browserInfo.index}`,
      handle: browserInfo.browserPageId,
      worktree,
      isBrowser: true,
      browserInfo
    }
  }
  const handle = await resolveTerminalTarget(targetArg, worktree, ctx.client)
  return { targetDisplay: targetArg, handle, worktree, isBrowser: false }
}

async function resolveSenderIdentity(
  client: HandlerContext['client'],
  worktree: string | undefined
): Promise<{ from: string; handle: string; worktreeLabel: string }> {
  const envHandle = process.env.ORCA_TERMINAL_HANDLE || ''
  const envIndex = process.env.ORCA_TERMINAL_INDEX || ''
  const worktreeLabel = worktree ? worktree.replace(/^id:/, '') : 'current'

  if (envIndex) {
    return { from: `@${envIndex}`, handle: envHandle || 'unknown', worktreeLabel }
  }

  if (envHandle) {
    try {
      const list = await client.call<RuntimeTerminalListResult>(
        'terminal.list',
        worktree ? { worktree } : undefined
      )
      const found = list.result.terminals.find((t) => t.handle === envHandle)
      if (found?.target) {
        return { from: found.target, handle: envHandle, worktreeLabel }
      }
    } catch {
      // Fallback
    }
    return { from: envHandle, handle: envHandle, worktreeLabel }
  }

  return { from: 'orca-cli', handle: 'caller', worktreeLabel }
}

async function emitA2ATrace(
  client: HandlerContext['client'],
  args: {
    fromDisplay?: string
    fromLabel?: string
    targetDisplay: string
    handle: string
    type: 'send' | 'message' | 'type' | 'keys'
    text?: string
  }
): Promise<void> {
  try {
    const fromIndex = parseTerminalIndex(args.fromDisplay)
    const toIndex = parseTerminalIndex(args.targetDisplay)
    await client.call('terminal.a2aLink', {
      from: args.fromDisplay || 'caller',
      to: args.targetDisplay,
      fromIndex,
      toIndex,
      fromLabel: args.fromLabel,
      type: args.type,
      text: args.text ? args.text.slice(0, 120) : undefined,
      timestamp: Date.now()
    })
  } catch {
    // Non-blocking visual trace feedback: ignore failure if host lacks method or offline
  }
}

export const bridgeListHandler: CommandHandler = async (ctx) => {
  const worktree = await getBrowserWorktreeSelector(ctx.flags, ctx.cwd, ctx.client)
  const result = await ctx.client.call<RuntimeTerminalListResult>('terminal.list', {
    ...(worktree ? { worktree } : {}),
    limit: getOptionalPositiveIntegerFlag(ctx.flags, 'limit') ?? 100
  })
  let browserTabs: Array<{ browserPageId: string; index?: number; url: string; title?: string; active?: boolean }> = []
  try {
    const bRes = await ctx.client.call<BrowserTabListResult>(
      'browser.tabList',
      worktree ? { worktree } : {}
    )
    browserTabs = bRes.result?.tabs ?? []
  } catch {
    // Non-blocking: tab list might not be active or supported
  }
  if (ctx.json) {
    console.log(JSON.stringify({ ...result.result, browserTabs }))
  } else {
    console.log(formatBridgeList(result.result, browserTabs))
  }
}

export const bridgeIdHandler: CommandHandler = async (ctx) => {
  const worktree = await getBrowserWorktreeSelector(ctx.flags, ctx.cwd, ctx.client)
  const sender = await resolveSenderIdentity(ctx.client, worktree)
  if (ctx.json) {
    console.log(JSON.stringify({ target: sender.from, handle: sender.handle }))
  } else {
    console.log(sender.from)
  }
}

export const bridgeResolveHandler: CommandHandler = async (ctx) => {
  const target = getOptionalStringFlag(ctx.flags, 'target') || ctx.rawArgs?.[0]
  const resolved = await resolveTargetAndHandle(target, ctx)
  if (ctx.json) {
    console.log(JSON.stringify({ handle: resolved.handle, isBrowser: resolved.isBrowser }))
  } else {
    console.log(resolved.handle)
  }
}

export const bridgeReadHandler: CommandHandler = async (ctx) => {
  const target = getOptionalStringFlag(ctx.flags, 'target') || ctx.rawArgs?.[0]
  const linesArg = ctx.rawArgs?.[1]
  const lines = linesArg && /^\d+$/.test(linesArg) ? Number.parseInt(linesArg, 10) : 50
  const screen = ctx.flags.get('screen') === true
  const resolved = await resolveTargetAndHandle(target, ctx)

  if (resolved.isBrowser) {
    markRead(resolved.handle)
    try {
      const snap = await ctx.client.call<BrowserSnapshotResult>('browser.snapshot', {
        page: resolved.handle
      })
      if (ctx.json) {
        console.log(JSON.stringify(snap.result))
      } else {
        const titleStr = resolved.browserInfo?.title ? `${resolved.browserInfo.title} ` : ''
        const urlStr = resolved.browserInfo?.url ? `(${resolved.browserInfo.url})` : ''
        console.log(`[Browser Tab ${resolved.targetDisplay}] ${titleStr}${urlStr}`.trim())
        console.log(formatSnapshot(snap.result))
      }
    } catch {
      const tabShow = await ctx.client.call<BrowserTabShowResult>('browser.tabShow', {
        page: resolved.handle
      })
      if (ctx.json) {
        console.log(JSON.stringify(tabShow.result))
      } else {
        console.log(
          `[Browser Tab ${resolved.targetDisplay}] ${tabShow.result.tab.title} (${tabShow.result.tab.url})`
        )
      }
    }
    return
  }

  const result = await ctx.client.call<{ terminal: RuntimeTerminalRead }>('terminal.read', {
    terminal: resolved.handle,
    limit: lines,
    ...(screen ? { screen: true } : {})
  })

  markRead(resolved.handle)

  if (ctx.json) {
    console.log(JSON.stringify(result.result.terminal))
  } else {
    const output = result.result.terminal.tail
    if (output) {
      const text = Array.isArray(output) ? output.join('\n') : output
      process.stdout.write(text.endsWith('\n') ? text : `${text}\n`)
    }
  }
}

export const bridgeTypeHandler: CommandHandler = async (ctx) => {
  const target = getOptionalStringFlag(ctx.flags, 'target') || ctx.rawArgs?.[0]
  const text = getOptionalStringFlag(ctx.flags, 'text') ?? ctx.rawArgs?.slice(1).join(' ') ?? ''
  const noGuard = ctx.flags.get('no-read-guard') === true || ctx.flags.get('force') === true
  const resolved = await resolveTargetAndHandle(target, ctx)

  requireRead(resolved.handle, resolved.targetDisplay, noGuard)

  if (resolved.isBrowser) {
    clearRead(resolved.handle)
    await ctx.client.call<BrowserTypeResult>('browser.type', {
      text,
      page: resolved.handle
    })
    const sender = await resolveSenderIdentity(ctx.client, resolved.worktree)
    await emitA2ATrace(ctx.client, {
      fromDisplay: sender.from,
      targetDisplay: resolved.targetDisplay,
      handle: resolved.handle,
      type: 'type',
      text
    })
    if (ctx.json) {
      console.log(JSON.stringify({ ok: true, target: resolved.targetDisplay, typed: text }))
    } else {
      console.log(`[${resolved.targetDisplay}] Typed: ${text}`)
    }
    return
  }

  const result = await ctx.client.call<{ send: RuntimeTerminalSend }>('terminal.send', {
    terminal: resolved.handle,
    text,
    enter: false,
    client: { id: 'orca-bridge', type: 'desktop' }
  })

  clearRead(resolved.handle)

  if (result.result.send.accepted) {
    const sender = await resolveSenderIdentity(ctx.client, resolved.worktree)
    await emitA2ATrace(ctx.client, {
      fromDisplay: sender.from,
      targetDisplay: resolved.targetDisplay,
      handle: resolved.handle,
      type: 'type',
      text
    })
  }

  if (ctx.json) {
    console.log(JSON.stringify(result.result.send))
  } else if (!result.result.send.accepted) {
    throw new RuntimeClientError('internal_error', 'Terminal did not accept input')
  }
}

export const bridgeSendHandler: CommandHandler = async (ctx) => {
  const target = getOptionalStringFlag(ctx.flags, 'target') || ctx.rawArgs?.[0]
  const text = getOptionalStringFlag(ctx.flags, 'text') ?? ctx.rawArgs?.slice(1).join(' ') ?? ''
  const noGuard = ctx.flags.get('no-read-guard') === true || ctx.flags.get('force') === true
  const resolved = await resolveTargetAndHandle(target, ctx)

  requireRead(resolved.handle, resolved.targetDisplay, noGuard)

  if (resolved.isBrowser) {
    clearRead(resolved.handle)
    const sender = await resolveSenderIdentity(ctx.client, resolved.worktree)
    const trimmed = text.trim()
    let outcome = ''

    if (
      /^(?:goto|open)\s+/i.test(trimmed) ||
      /^https?:\/\//i.test(trimmed) ||
      /^about:/i.test(trimmed)
    ) {
      const destUrl = trimmed.replace(/^(?:goto|open)\s+/i, '').trim()
      await ctx.client.call('browser.openUrl', {
        url: destUrl,
        worktree: resolved.worktree
      })
      outcome = `Navigated to ${destUrl}`
    } else if (/^click\s+/i.test(trimmed)) {
      const selector = trimmed.slice(6).trim()
      const clickRes = await ctx.client.call<BrowserClickResult>('browser.click', {
        element: selector,
        page: resolved.handle
      })
      outcome = `Clicked ${clickRes.result.clicked}`
    } else if (/^fill\s+/i.test(trimmed)) {
      const fillMatch = /^fill\s+(\S+)\s+(.+)$/i.exec(trimmed)
      if (!fillMatch) {
        throw new RuntimeClientError(
          'invalid_argument',
          'Usage: bridge send @b1 "fill <selector> <value>"'
        )
      }
      const [, element, val] = fillMatch
      const fillRes = await ctx.client.call<BrowserFillResult>('browser.fill', {
        element,
        value: val,
        page: resolved.handle
      })
      outcome = `Filled ${fillRes.result.filled}`
    } else if (/^type\s+/i.test(trimmed)) {
      const textToType = trimmed.slice(5)
      await ctx.client.call<BrowserTypeResult>('browser.type', {
        text: textToType,
        page: resolved.handle
      })
      outcome = `Typed text`
    } else if (/^(?:eval|exec)\s+/i.test(trimmed)) {
      const script = trimmed.replace(/^(?:eval|exec)\s+/i, '').trim()
      const evalRes = await ctx.client.call<BrowserEvalResult>('browser.eval', {
        script,
        page: resolved.handle
      })
      outcome = evalRes.result?.result ?? 'Executed script'
    } else if (trimmed === 'reload') {
      await ctx.client.call('browser.reload', { page: resolved.handle })
      outcome = `Reloaded ${resolved.targetDisplay}`
    } else if (trimmed === 'back') {
      await ctx.client.call('browser.back', { page: resolved.handle })
      outcome = `Navigated back`
    } else if (trimmed === 'forward') {
      await ctx.client.call('browser.forward', { page: resolved.handle })
      outcome = `Navigated forward`
    } else {
      try {
        const evalRes = await ctx.client.call<BrowserEvalResult>('browser.eval', {
          script: trimmed,
          page: resolved.handle
        })
        outcome = evalRes.result?.result ?? 'Executed'
      } catch {
        await ctx.client.call('browser.openUrl', {
          url: trimmed,
          worktree: resolved.worktree
        })
        outcome = `Navigated to ${trimmed}`
      }
    }

    await emitA2ATrace(ctx.client, {
      fromDisplay: sender.from,
      targetDisplay: resolved.targetDisplay,
      handle: resolved.handle,
      type: 'send',
      text
    })

    if (ctx.json) {
      console.log(JSON.stringify({ ok: true, target: resolved.targetDisplay, outcome }))
    } else {
      console.log(`[${resolved.targetDisplay}] ${outcome}`)
    }
    return
  }

  const result = await ctx.client.call<{ send: RuntimeTerminalSend }>('terminal.send', {
    terminal: resolved.handle,
    text,
    enter: true,
    client: { id: 'orca-bridge', type: 'desktop' }
  })

  clearRead(resolved.handle)

  if (result.result.send.accepted) {
    const sender = await resolveSenderIdentity(ctx.client, resolved.worktree)
    await emitA2ATrace(ctx.client, {
      fromDisplay: sender.from,
      targetDisplay: resolved.targetDisplay,
      handle: resolved.handle,
      type: 'send',
      text
    })
  }

  if (ctx.json) {
    console.log(JSON.stringify(result.result.send))
  } else if (!result.result.send.accepted) {
    throw new RuntimeClientError('internal_error', 'Terminal did not accept input')
  }
}

export const bridgeMessageHandler: CommandHandler = async (ctx) => {
  const target = getOptionalStringFlag(ctx.flags, 'target') || ctx.rawArgs?.[0]
  const text = getOptionalStringFlag(ctx.flags, 'message') ?? ctx.rawArgs?.slice(1).join(' ') ?? ''
  const noGuard = ctx.flags.get('no-read-guard') === true || ctx.flags.get('force') === true
  const resolved = await resolveTargetAndHandle(target, ctx)

  requireRead(resolved.handle, resolved.targetDisplay, noGuard)

  if (resolved.isBrowser) {
    clearRead(resolved.handle)
    const sender = await resolveSenderIdentity(ctx.client, resolved.worktree)
    const destUrl =
      /^https?:\/\//i.test(text.trim()) || /^about:/i.test(text.trim())
        ? text.trim()
        : `https://www.google.com/search?q=${encodeURIComponent(text.trim())}`
    await ctx.client.call('browser.openUrl', {
      url: destUrl,
      worktree: resolved.worktree
    })
    await emitA2ATrace(ctx.client, {
      fromDisplay: sender.from,
      targetDisplay: resolved.targetDisplay,
      handle: resolved.handle,
      type: 'message',
      text: destUrl
    })
    if (ctx.json) {
      console.log(JSON.stringify({ ok: true, target: resolved.targetDisplay, navigated: destUrl }))
    } else {
      console.log(`[${resolved.targetDisplay}] Navigated to ${destUrl}`)
    }
    return
  }

  const sender = await resolveSenderIdentity(ctx.client, resolved.worktree)
  const header = `[orca-bridge from:${sender.from} handle:${sender.handle} at:${sender.worktreeLabel} — reply via orca bridge msg ${sender.from} "<text>"]`
  const messageWithHeader = `${header} ${text}`

  const result = await ctx.client.call<{ send: RuntimeTerminalSend }>('terminal.send', {
    terminal: resolved.handle,
    text: messageWithHeader,
    enter: true,
    client: { id: 'orca-bridge', type: 'desktop' }
  })

  clearRead(resolved.handle)

  if (result.result.send.accepted) {
    await emitA2ATrace(ctx.client, {
      fromDisplay: sender.from,
      targetDisplay: resolved.targetDisplay,
      handle: resolved.handle,
      type: 'message',
      text
    })
  }

  if (ctx.json) {
    console.log(JSON.stringify(result.result.send))
  } else if (!result.result.send.accepted) {
    throw new RuntimeClientError('internal_error', 'Terminal did not accept message')
  }
}

export const bridgeKeysHandler: CommandHandler = async (ctx) => {
  const target = getOptionalStringFlag(ctx.flags, 'target') || ctx.rawArgs?.[0]
  const keys = ctx.rawArgs?.slice(1) ?? []
  if (keys.length === 0) {
    throw new RuntimeClientError(
      'invalid_argument',
      'At least one key is required (e.g. Enter, Escape, C-c).'
    )
  }
  const noGuard = ctx.flags.get('no-read-guard') === true || ctx.flags.get('force') === true
  const resolved = await resolveTargetAndHandle(target, ctx)

  requireRead(resolved.handle, resolved.targetDisplay, noGuard)

  if (resolved.isBrowser) {
    clearRead(resolved.handle)
    for (const key of keys) {
      await ctx.client.call('browser.keypress', {
        key,
        page: resolved.handle
      })
    }
    const sender = await resolveSenderIdentity(ctx.client, resolved.worktree)
    await emitA2ATrace(ctx.client, {
      fromDisplay: sender.from,
      targetDisplay: resolved.targetDisplay,
      handle: resolved.handle,
      type: 'keys',
      text: keys.join(' ')
    })
    if (ctx.json) {
      console.log(JSON.stringify({ accepted: true, keys }))
    } else {
      console.log(`[${resolved.targetDisplay}] Sent keys: ${keys.join(' ')}`)
    }
    return
  }

  for (const key of keys) {
    const resolvedKey = KEY_MAP[key] ?? key
    const isEnter = resolvedKey === '\r'
    await ctx.client.call<{ send: RuntimeTerminalSend }>('terminal.send', {
      terminal: resolved.handle,
      text: isEnter ? '' : resolvedKey,
      enter: isEnter,
      client: { id: 'orca-bridge', type: 'desktop' }
    })
  }

  clearRead(resolved.handle)

  const sender = await resolveSenderIdentity(ctx.client, resolved.worktree)
  await emitA2ATrace(ctx.client, {
    fromDisplay: sender.from,
    targetDisplay: resolved.targetDisplay,
    handle: resolved.handle,
    type: 'keys',
    text: keys.join(' ')
  })

  if (ctx.json) {
    console.log(JSON.stringify({ accepted: true, keys }))
  }
}

export const bridgeNameHandler: CommandHandler = async (ctx) => {
  const target = getOptionalStringFlag(ctx.flags, 'target') || ctx.rawArgs?.[0]
  const label = getOptionalStringFlag(ctx.flags, 'name') || ctx.rawArgs?.[1]
  if (!label) {
    throw new RuntimeClientError('invalid_argument', 'New label/name is required.')
  }
  const { handle } = await resolveTargetAndHandle(target, ctx)

  const result = await ctx.client.call<{ rename: RuntimeTerminalRename }>('terminal.rename', {
    terminal: handle,
    title: label
  })

  if (ctx.json) {
    console.log(JSON.stringify(result.result.rename))
  } else {
    console.log(`Renamed terminal ${handle} to "${label}".`)
  }
}

export const bridgeDoctorHandler: CommandHandler = async (ctx) => {
  const worktree = await getBrowserWorktreeSelector(ctx.flags, ctx.cwd, ctx.client)
  const sender = await resolveSenderIdentity(ctx.client, worktree)
  const listResult = await ctx.client.call<RuntimeTerminalListResult>(
    'terminal.list',
    worktree ? { worktree } : undefined
  )

  const report = {
    connected: true,
    sender,
    worktree: worktree ?? 'none',
    terminalCount: listResult.result.terminals.length,
    terminals: listResult.result.terminals.map((t) => ({
      target: t.target,
      handle: t.handle,
      label: t.label || t.title
    }))
  }

  if (ctx.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log('Orca Terminal Bridge Doctor')
    console.log('---------------------------')
    console.log(`Sender Target:  ${sender.from}`)
    console.log(`Sender Handle:  ${sender.handle}`)
    console.log(`Worktree:       ${sender.worktreeLabel}`)
    console.log(`Total Panes:    ${report.terminalCount}`)
    console.log('Available Panes:')
    for (const t of report.terminals) {
      console.log(
        `  ${(t.target || '-').padEnd(6)} ${t.handle.padEnd(20)} ${t.label || '(untitled)'}`
      )
    }
    console.log('Status: OK')
  }
}

export const bridgeTraceHandler: CommandHandler = async (ctx) => {
  const target = getOptionalStringFlag(ctx.flags, 'target') || ctx.rawArgs?.[0]
  const text = getOptionalStringFlag(ctx.flags, 'text') ?? ctx.rawArgs?.slice(1).join(' ') ?? ''
  const customFrom = getOptionalStringFlag(ctx.flags, 'from')
  const typeFlag = getOptionalStringFlag(ctx.flags, 'type')
  const { targetDisplay, worktree } = await resolveTargetAndHandle(target, ctx)

  const sender = customFrom
    ? { from: customFrom, handle: 'custom', worktreeLabel: 'custom' }
    : await resolveSenderIdentity(ctx.client, worktree)

  const validTypes = ['send', 'message', 'type', 'keys'] as const
  const traceType = (validTypes as readonly string[]).includes(typeFlag ?? '')
    ? (typeFlag as 'send' | 'message' | 'type' | 'keys')
    : 'send'

  const fromIndex = parseTerminalIndex(sender.from)
  const toIndex = parseTerminalIndex(targetDisplay)

  const res = await ctx.client.call<{ ok: boolean; id: string }>('terminal.a2aLink', {
    from: sender.from,
    to: targetDisplay,
    fromIndex,
    toIndex,
    type: traceType,
    text: text || undefined,
    timestamp: Date.now()
  })

  if (ctx.json) {
    console.log(
      JSON.stringify({
        ok: true,
        id: res.result?.id,
        from: sender.from,
        to: targetDisplay,
        text: text || undefined
      })
    )
  } else {
    console.log(`Trace emitted: ${sender.from} -> ${targetDisplay}${text ? ` (${text})` : ''}`)
  }
}

export const BRIDGE_HANDLERS: Record<string, CommandHandler> = {
  'bridge list': bridgeListHandler,
  'bridge id': bridgeIdHandler,
  'bridge resolve': bridgeResolveHandler,
  'bridge read': bridgeReadHandler,
  'bridge type': bridgeTypeHandler,
  'bridge send': bridgeSendHandler,
  'bridge message': bridgeMessageHandler,
  'bridge msg': bridgeMessageHandler,
  'bridge keys': bridgeKeysHandler,
  'bridge name': bridgeNameHandler,
  'bridge trace': bridgeTraceHandler,
  'bridge doctor': bridgeDoctorHandler
}
