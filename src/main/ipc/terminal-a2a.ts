import { BrowserWindow, ipcMain } from 'electron'
import type { A2ALinkEvent } from '../../shared/terminal-a2a-link'

export const TERMINAL_A2A_LINK_CHANNEL = 'terminal:a2a-link'

export function broadcastA2ALink(
  event: A2ALinkEvent,
  options?: { getWindows?: () => BrowserWindow[] }
): void {
  const windows = options?.getWindows ? options.getWindows() : BrowserWindow.getAllWindows()
  for (const window of windows) {
    if (!window.isDestroyed()) {
      window.webContents.send(TERMINAL_A2A_LINK_CHANNEL, event)
    }
  }
}

export function registerTerminalA2AHandlers(options?: {
  ipc?: typeof ipcMain
  getWindows?: () => BrowserWindow[]
}): void {
  const ipc = options?.ipc ?? (typeof ipcMain !== 'undefined' && ipcMain && typeof ipcMain.handle === 'function' ? ipcMain : null)
  if (!ipc) {
    return
  }
  ipc.handle(TERMINAL_A2A_LINK_CHANNEL, (_event, event: A2ALinkEvent) => {
    broadcastA2ALink(event, options)
    return { ok: true }
  })
}
