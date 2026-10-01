import type { CommandSpec } from '../args'
import { GLOBAL_FLAGS } from '../args'

export const TERMINAL_GOAL_COMMAND_SPEC: CommandSpec = {
  path: ['terminal', 'goal'],
  summary: "Set the overall goal of the current work as this terminal pane's title",
  usage: 'orca terminal goal <goal> [--terminal <handle>] [--clear] [--json]',
  allowedFlags: [...GLOBAL_FLAGS, 'terminal', 'text', 'clear'],
  positionalArgs: ['text'],
  notes: [
    'Run it inside an Orca terminal at the start of every task; it labels the calling pane, not the tab name.',
    'Keep the goal short (up to 120 characters). Pass --clear when the work is done.'
  ],
  examples: ['orca terminal goal "修好 LINE 任務完成通知"', 'orca terminal goal --clear']
}
