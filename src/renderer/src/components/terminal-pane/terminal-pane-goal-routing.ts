import { useAppStore } from '@/store'

export type TerminalPaneGoalRequest = {
  tabId: string
  leafId: string
  goal: string | null
}

type TerminalPaneGoalHandler = (request: TerminalPaneGoalRequest) => boolean

const handlersByTabId = new Map<string, TerminalPaneGoalHandler>()
const pendingGoalsByTabId = new Map<string, Map<string, string | null>>()

function writeGoalIntoStoredLayout(request: TerminalPaneGoalRequest): void {
  const state = useAppStore.getState()
  const layout = state.terminalLayoutsByTabId[request.tabId]
  if (!layout) {
    return
  }
  const titlesByLeafId = { ...layout.titlesByLeafId }
  if (request.goal) {
    titlesByLeafId[request.leafId] = request.goal
  } else {
    delete titlesByLeafId[request.leafId]
  }
  state.setTabLayout(request.tabId, { ...layout, titlesByLeafId })
}

function rememberPendingGoal(request: TerminalPaneGoalRequest): void {
  const pending = pendingGoalsByTabId.get(request.tabId) ?? new Map<string, string | null>()
  pending.set(request.leafId, request.goal)
  pendingGoalsByTabId.set(request.tabId, pending)
}

export function routeTerminalPaneGoal(request: TerminalPaneGoalRequest): void {
  const handler = handlersByTabId.get(request.tabId)
  if (handler?.(request)) {
    return
  }
  rememberPendingGoal(request)
  writeGoalIntoStoredLayout(request)
}

export function registerTerminalPaneGoalHandler(
  tabId: string,
  handler: TerminalPaneGoalHandler
): () => void {
  handlersByTabId.set(tabId, handler)
  const pending = pendingGoalsByTabId.get(tabId)
  if (pending) {
    for (const [leafId, goal] of pending) {
      if (handler({ tabId, leafId, goal })) {
        pending.delete(leafId)
      }
    }
    if (pending.size === 0) {
      pendingGoalsByTabId.delete(tabId)
    }
  }
  return () => {
    if (handlersByTabId.get(tabId) === handler) {
      handlersByTabId.delete(tabId)
    }
  }
}

export function resetTerminalPaneGoalRoutingForTests(): void {
  handlersByTabId.clear()
  pendingGoalsByTabId.clear()
}
