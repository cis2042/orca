import { app } from 'electron'
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Checks if the current process is running as Orcagent.
 */
export function isOrcagentProcess(): boolean {
  const execPath = process.execPath || ''
  return (
    execPath.includes('Orcagent') ||
    process.env.ORCA_PRODUCT_NAME === 'Orcagent' ||
    app.getName().toLowerCase() === 'orcagent'
  )
}

/**
 * Ensures Orcagent inherits all user profiles, accounts, and workspace settings
 * from the existing Orca installation without modifying or overwriting Orca.
 */
export function seedOrcagentUserDataIfMissing(userDataPath: string): void {
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

/**
 * Configures Orcagent's dedicated userData directory so it does not collide
 * with a concurrently running Orca instance, while sharing all settings.
 */
export function configureOrcagentUserData(): boolean {
  if (!isOrcagentProcess()) {
    return false
  }
  const appData = app.getPath('appData')
  const orcagentUserData = join(appData, 'orcagent')
  app.setPath('userData', orcagentUserData)
  app.setName('Orcagent')
  seedOrcagentUserDataIfMissing(orcagentUserData)
  return true
}
