import type { A2ALinkEvent } from '../../../../shared/terminal-a2a-link'
import { resolveShuGeneralBanner } from './shu-general-motifs'

export const COMMAND_LINK_DURATION_MS = 9000

const COMMAND_ROLE_MARKERS = ['將軍', '将军', '徐庶', '軍師', '军师', '參軍', '参军']

export type TabTitleLookup = (worktreeId: string, tabId: string) => (string | null | undefined)[]

export function isCommandRoleTitle(title: string | null | undefined): boolean {
  if (!title) {
    return false
  }
  return (
    COMMAND_ROLE_MARKERS.some((marker) => title.includes(marker)) ||
    resolveShuGeneralBanner({ sourceTitle: title }) !== null
  )
}

export function collectLinkEndpointTitles(
  link: A2ALinkEvent,
  lookupTabTitles: TabTitleLookup
): (string | null | undefined)[] {
  const anchorTitles = [link.fromAnchor, link.toAnchor].flatMap((anchor) =>
    anchor ? [anchor.title, ...lookupTabTitles(anchor.worktreeId, anchor.tabId)] : []
  )
  return [link.fromLabel, link.toLabel, ...anchorTitles]
}

export function isCommandLink(link: A2ALinkEvent, lookupTabTitles: TabTitleLookup): boolean {
  if (collectLinkEndpointTitles(link, lookupTabTitles).some(isCommandRoleTitle)) {
    return true
  }
  return Boolean(link.text && resolveShuGeneralBanner({ text: link.text }))
}
