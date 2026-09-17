import { app } from 'electron'
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Ensures Orcagent inherits all user profiles, accounts, and workspace settings
 * from the existing Orca installation without modifying or overwriting Orca.
 */
export function seedOrcagentUserDataIfMissing(userDataPath: string): void {
  const isOrcagent =
    app.getName().toLowerCase() === 'orcagent' ||
    process.env.ORCA_PRODUCT_NAME === 'Orcagent' ||
    userDataPath.toLowerCase().includes('orcagent')

  if (!isOrcagent) {
    return
  }

  const appData = app.getPath('appData')
  const orcaDir = join(appData, 'orca')
  if (!existsSync(orcaDir)) {
    return
  }

  const marker = join(userDataPath, '.seeded-from-orca')
  if (existsSync(marker)) {
    return
  }

  try {
    mkdirSync(userDataPath, { recursive: true })
    const itemsToCopy = [
      'orca-profile-index.json',
      'profiles',
      'codex-pane-accounts.json',
      'codex-runtime-home',
      'agent-hooks',
      'http1-compatibility.json',
      'macos-press-and-hold-default.json',
      'orca-e2ee-keypair.json'
    ]

    for (const item of itemsToCopy) {
      const src = join(orcaDir, item)
      const dst = join(userDataPath, item)
      if (existsSync(src) && !existsSync(dst)) {
        cpSync(src, dst, { recursive: true, errorOnExist: false })
      }
    }
    writeFileSync(marker, Date.now().toString(), 'utf8')
  } catch (err) {
    console.warn('[orcagent] Failed to seed user settings from Orca:', err)
  }
}
