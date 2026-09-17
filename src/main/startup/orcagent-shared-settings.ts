import { app } from 'electron'
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
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

export const ORCA_BRIDGE_SKILL_CONTENT = `---
name: orca-bridge
description: >-
  Cross-terminal control and multi-agent communication in Orca and Orcagent. Use this skill whenever
  the user or an agent mentions terminal numbers like #1, #2, @1, @2, inter-terminal communication,
  commanding other terminals, reading other terminal outputs, or cross-terminal collaboration in Orca or Orcagent.
metadata:
  { "openclaw": { "emoji": "🌉", "os": ["darwin", "linux", "win32"] } }
---

# Orca Terminal Bridge

Cross-terminal control, messaging, and multi-agent coordination in Orca and Orcagent.

## Addressing Convention

- **Terminal Tab Badge (#1, #2, #3...)**: Each terminal in the active workspace has an assigned index displayed on its tab bar.
- **Target Addressing (@1, @2, @3... or @<title>)**: Use @<index> or @<label> to reference a specific terminal.

## Resolve the CLI for this session

Choose the executable once and reuse it for every later command:
- If \`ORCA_CLI_COMMAND\` is set, use its value.
- In a dev checkout whose session exposes \`ORCA_DEV_REPO_ROOT\`, use \`orca-dev\`.
- On Linux outside an Orca-managed terminal, use \`orca-ide\`. Never run bare \`orca\` there (it resolves to GNOME screen reader).
- On macOS, use \`/Applications/Orcagent.app/Contents/Resources/bin/orca\` or \`orca\`.
- Otherwise, use \`orca\`.

Below, \`ORCA\` represents the resolved executable.

## Command Reference

| Action | Command | Description |
|---|---|---|
| **List Terminals** | \`ORCA bridge list\` | View all active terminals in the workspace with targets (@1, @2), indexes, status, titles, and handles. |
| **Inspect Target** | \`ORCA bridge id\` | Print the current terminal's own @target ID. |
| **Read Output** | \`ORCA bridge read @2 50\` | Read the last N lines (default 50) of output from @2 and arms the read guard. |
| **Send Command** | \`ORCA bridge send @2 "npm test"\` | Type a command into @2 and press Enter to execute. |
| **Type Text** | \`ORCA bridge type @2 "git status"\` | Type text into @2 without pressing Enter. |
| **Send Message** | \`ORCA bridge message @2 "Build finished"\` | Send a formatted message with sender header to @2. |
| **Send Keys** | \`ORCA bridge keys @2 Enter\` | Send special keys (Enter, Escape, C-c) to @2. |
| **Rename / Label** | \`ORCA bridge name @2 "worker"\` | Assign a custom label to @2 so it can also be addressed as @worker. |

## Read Guard Pattern (Safety Floor)

To prevent race conditions between concurrent agents or interrupting active commands:
1. Always \`ORCA bridge read <target>\` to inspect current terminal state before typing.
2. If \`ORCA bridge send\` or \`type\` is called before reading, it is rejected by default to avoid corrupting active input (bypass with \`--no-read-guard\` or \`--force\` only when intentional).
3. After sending a long-running command, read back with \`ORCA bridge read <target>\` to verify the output.
`

export const ORCA_BRIDGE_INSTRUCTIONS = `## Orcagent Terminal Bridge & @target Addressing

- Terminals in this Orcagent workspace are numbered \`#1\`, \`#2\`, \`#3\`... shown on tab badges.
- When the user or an instruction refers to \`@1\`, \`@2\`, \`@<name>\`, it addresses that specific terminal.
- Use \`orca bridge list\` to see all active terminals and their \`@targets\`.
- Use \`orca bridge read @<target> 50\` to inspect output.
- Use \`orca bridge send @<target> "<command>"\` to execute commands in the target terminal.
- Use \`orca bridge message @<target> "<text>"\` to communicate with another agent in that terminal.
`

/**
 * Ensures that all AI agents started by Orcagent immediately have access to the
 * orca-bridge skill and @target instructions in their runtime environment.
 *
 * Preserves existing customized skills in user directories (~/.agents, ~/.codex, ~/.claude)
 * and only updates the managed codex-runtime-home copy unconditionally.
 *
 * @param userDataPath The resolved userData path for Orcagent.
 */
export function ensureOrcagentTerminalBridgeSkill(userDataPath: string): void {
  try {
    // 1. Managed runtime home: always maintain the official bridge skill
    const managedSkillDir = join(
      userDataPath,
      'codex-runtime-home',
      'home',
      'skills',
      'orca-bridge'
    )
    mkdirSync(managedSkillDir, { recursive: true })
    writeFileSync(join(managedSkillDir, 'SKILL.md'), ORCA_BRIDGE_SKILL_CONTENT, 'utf8')

    // 2. User directories: only seed if the skill does not already exist, preserving user modifications
    const home = homedir()
    if (home) {
      const userSkillDirs = [
        join(home, '.agents', 'skills', 'orca-bridge'),
        join(home, '.codex', 'skills', 'orca-bridge'),
        join(home, '.claude', 'skills', 'orca-bridge')
      ]

      for (const targetDir of userSkillDirs) {
        try {
          const skillFile = join(targetDir, 'SKILL.md')
          if (!existsSync(skillFile)) {
            mkdirSync(targetDir, { recursive: true })
            writeFileSync(skillFile, ORCA_BRIDGE_SKILL_CONTENT, 'utf8')
          }
        } catch {
          // Skip unwriteable system paths
        }
      }
    }

    // 3. Managed AGENTS.md: append instructions if not present
    const managedAgentsMd = join(userDataPath, 'codex-runtime-home', 'home', 'AGENTS.md')
    if (existsSync(managedAgentsMd)) {
      try {
        const content = readFileSync(managedAgentsMd, 'utf8')
        if (!content.includes('Orcagent Terminal Bridge')) {
          const appended = `${content.trimEnd()}\n\n${ORCA_BRIDGE_INSTRUCTIONS}\n`
          writeFileSync(managedAgentsMd, appended, 'utf8')
        }
      } catch {
        // Non-fatal
      }
    }
  } catch (err) {
    console.warn('[orcagent] Failed to ensure terminal bridge skill:', err)
  }
}

/**
 * Configures Orcagent's dedicated userData directory so it does not collide
 * with a concurrently running Orca instance, while sharing all settings.
 *
 * @returns True if the process was configured as Orcagent; false otherwise.
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
  ensureOrcagentTerminalBridgeSkill(orcagentUserData)
  return true
}
